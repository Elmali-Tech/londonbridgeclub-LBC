import { NextRequest, NextResponse } from 'next/server';
import { validateToken } from '@/lib/auth';
import { createClient } from '@/lib/lbc-data';
import { uploadBufferToAssetStorage } from '@/lib/storageUploadUtils';

// GET - Sohbetteki mesajları getir
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateToken(token);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const chatId = resolvedParams.id;
    const lbcData = createClient();

    // Kullanıcının bu sohbete katılıp katılmadığını kontrol et
    const { data: participant, error: participantError } = await lbcData
      .from('chat_participants')
      .select('*')
      .eq('chat_id', chatId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (participantError || !participant) {
      return NextResponse.json(
        { success: false, error: 'Access denied to this chat' },
        { status: 403 }
      );
    }

    // URL parametrelerini al
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Simplified query without complex foreign key references
    const { data: messages, error: messagesError } = await lbcData
      .from('messages')
      .select(`
        *,
        sender:users(id, full_name, profile_image_key)
      `)
      .eq('chat_id', chatId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (messagesError) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch messages', details: messagesError },
        { status: 500 }
      );
    }

    // Handle reply messages separately if needed
    const messagesWithReplies = await Promise.all(
      (messages || []).map(async (message) => {
        let replyTo = null;
        if (message.reply_to_id) {
          const { data: replyMessage } = await lbcData
            .from('messages')
            .select(`
              id,
              content,
              message_type,
              sender:users(full_name)
            `)
            .eq('id', message.reply_to_id)
            .single();
          replyTo = replyMessage;
        }

        return {
          ...message,
          reply_to: replyTo
        };
      })
    );

    // Kullanıcının okuduğu mesajları getir
    const { data: readMessages } = await lbcData
      .from('message_reads')
      .select('message_id')
      .eq('user_id', user.id)
      .in('message_id', (messagesWithReplies || []).map(m => m.id));

    const readMessageIds = new Set(readMessages?.map(r => r.message_id) || []);

    // Mesajlara okunma durumunu ekle
    const messagesWithReadStatus = messagesWithReplies.map(message => ({
      ...message,
      is_read: readMessageIds.has(message.id) || message.sender_id === user.id
    }));

    return NextResponse.json({
      success: true,
      messages: messagesWithReadStatus
    });

  } catch (error) { 
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST - Yeni mesaj gönder
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateToken(token);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const chatId = parseInt(resolvedParams.id);
    const lbcData = createClient();

    // Kullanıcının bu sohbete katılıp katılmadığını kontrol et
    const { data: participant, error: participantError } = await lbcData
      .from('chat_participants')
      .select('*')
      .eq('chat_id', chatId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (participantError || !participant) { 
      return NextResponse.json(
        { success: false, error: 'Access denied to this chat' },
        { status: 403 }
      );
    }

    // FormData veya JSON olarak gelen veriyi parse et
    const contentType = request.headers.get('content-type');
    let content: string;
    let messageType: 'text' | 'image' | 'file' = 'text';
    let replyToId: number | undefined;
    let fileKey: string | undefined;
    let fileName: string | undefined;
    let fileSize: number | undefined;
    let fileType: string | undefined;

    if (contentType?.includes('multipart/form-data')) {
      // Dosya yükleme ile mesaj
      const formData = await request.formData();
      content = formData.get('content') as string;
      replyToId = formData.get('reply_to_id') ? parseInt(formData.get('reply_to_id') as string) : undefined;
      
      const file = formData.get('file') as File | null;
      if (file) {
        try {
          // Dosyayı yapılandırılmış varlık deposuna yükle.
          const timestamp = Date.now();
          const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const s3Key = `chat-files/${chatId}/${user.id}/${timestamp}_${sanitizedFileName}`;
          
          const buffer = Buffer.from(await file.arrayBuffer());

          const uploadResult = await uploadBufferToAssetStorage(
            s3Key,
            buffer,
            file.type
          );

          if (!uploadResult.success) {
            throw new Error(uploadResult.error || 'Asset storage upload failed');
          }
          
          fileKey = s3Key;
          fileName = file.name;
          fileSize = file.size;
          fileType = file.type;
          messageType = file.type.startsWith('image/') ? 'image' : 'file';
        } catch (uploadError) {
          return NextResponse.json(
            { success: false, error: 'Failed to upload file' },
            { status: 500 }
          );
        }
      }
    } else {
      // JSON mesaj
      const body = await request.json();
      content = body.content;
      replyToId = body.reply_to_id;
    }

    if (!content && !fileKey) {
      return NextResponse.json(
        { success: false, error: 'Message content or file is required' },
        { status: 400 }
      );
    }

    // Mesajı kaydet
    const { data: message, error: messageError } = await lbcData
      .from('messages')
      .insert({
        chat_id: chatId,
        sender_id: user.id,
        content: content || '',
        message_type: messageType,
        file_key: fileKey,
        file_name: fileName,
        file_size: fileSize,
        file_type: fileType,
        reply_to_id: replyToId
      })
      .select(`
        *,
        sender:users(id, full_name, profile_image_key)
      `)
      .single();

    if (messageError) {
      return NextResponse.json(
        { success: false, error: 'Failed to send message', details: messageError },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 
