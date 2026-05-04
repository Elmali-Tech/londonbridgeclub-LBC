import { NextRequest, NextResponse } from 'next/server';
import { validateToken } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// GET - Konuşmadaki mesajları getir
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
    const conversationId = resolvedParams.id;
    const supabase = createClient();

    // Kullanıcının bu konuşmaya katılıp katılmadığını kontrol et
    const { data: participant, error: participantError } = await supabase
      .from('conversation_participants')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (participantError || !participant) {
      return NextResponse.json(
        { success: false, error: 'Access denied to this conversation' },
        { status: 403 }
      );
    }

    // URL parametrelerini al
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Mesajları getir
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey(id, full_name, profile_image_key),
        reply_to:messages!messages_reply_to_id_fkey(
          id,
          content,
          message_type,
          sender:users!messages_sender_id_fkey(full_name)
        )
      `)
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (messagesError) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    // Kullanıcının okuduğu mesajları getir
    const { data: readMessages } = await supabase
      .from('message_reads')
      .select('message_id')
      .eq('user_id', user.id)
      .in('message_id', messages.map(m => m.id));

    const readMessageIds = new Set(readMessages?.map(r => r.message_id) || []);

    // Mesajlara okunma durumunu ekle
    const messagesWithReadStatus = messages.map(message => ({
      ...message,
      is_read: readMessageIds.has(message.id) || message.sender_id === user.id
    }));

    return NextResponse.json({
      success: true,
      messages: messagesWithReadStatus
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
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
    const conversationId = parseInt(resolvedParams.id);
    const supabase = createClient();

    // Kullanıcının bu konuşmaya katılıp katılmadığını kontrol et
    const { data: participant, error: participantError } = await supabase
      .from('conversation_participants')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (participantError || !participant) {
      return NextResponse.json(
        { success: false, error: 'Access denied to this conversation' },
        { status: 403 }
      );
    }

    // FormData veya JSON olarak gelen veriyi parse et
    const contentType = request.headers.get('content-type');
    let content: string;
    let messageType: 'text' | 'image' | 'file' = 'text';
    let replyToId: number | undefined;
    let attachmentKey: string | undefined;
    let attachmentName: string | undefined;
    let attachmentSize: number | undefined;
    let attachmentType: string | undefined;

    if (contentType?.includes('multipart/form-data')) {
      // Dosya yükleme ile mesaj
      const formData = await request.formData();
      content = formData.get('content') as string;
      replyToId = formData.get('reply_to_id') ? parseInt(formData.get('reply_to_id') as string) : undefined;
      
      const file = formData.get('attachment') as File | null;
      if (file) {
        try {
          // Dosyayı S3'e yükle
          const timestamp = Date.now();
          const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const s3Key = `messages/${conversationId}/${user.id}/${timestamp}_${sanitizedFileName}`;
          
          const buffer = Buffer.from(await file.arrayBuffer());
          
          const uploadCommand = new PutObjectCommand({
            Bucket: process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || 'londonbridgeproject',
            Key: s3Key,
            Body: buffer,
            ContentType: file.type,
          });
          
          await s3Client.send(uploadCommand);
          
          attachmentKey = s3Key;
          attachmentName = file.name;
          attachmentSize = file.size;
          attachmentType = file.type;
          messageType = file.type.startsWith('image/') ? 'image' : 'file';
        } catch (uploadError) {
          return NextResponse.json(
            { success: false, error: 'Failed to upload attachment' },
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

    if (!content && !attachmentKey) {
      return NextResponse.json(
        { success: false, error: 'Message content or attachment is required' },
        { status: 400 }
      );
    }

    // Mesajı kaydet
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content || '',
        message_type: messageType,
        attachment_key: attachmentKey,
        attachment_name: attachmentName,
        attachment_size: attachmentSize,
        attachment_type: attachmentType,
        reply_to_id: replyToId
      })
      .select(`
        *,
        sender:users!messages_sender_id_fkey(id, full_name, profile_image_key)
      `)
      .single();

    if (messageError) {
      return NextResponse.json(
        { success: false, error: 'Failed to send message' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 