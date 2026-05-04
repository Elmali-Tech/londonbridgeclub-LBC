import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
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

// POST API for creating a new post
export async function POST(request: NextRequest) {
  try {
    // Validate the session
    const session = await validateSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user ID from the session
    const userId = session.id.toString();

    // Parse FormData
    const formData = await request.formData();
    const content = formData.get('content') as string;
    const visibility = (formData.get('visibility') as string) || 'public';
    
    // Get uploaded files
    const uploadedFiles: File[] = [];
    const mediaKeys: string[] = [];
    
    // Extract all media files from FormData
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('media_') && value instanceof File) {
        uploadedFiles.push(value);
      }
    }

    // Validate request body
    if (!content && uploadedFiles.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Post içeriği veya medya ekleyin' },
        { status: 400 }
      );
    }

    if (visibility && !['public', 'connections', 'private'].includes(visibility)) {
      return NextResponse.json(
        { success: false, error: 'Geçersiz görünürlük değeri' },
        { status: 400 }
      );
    }

    // Upload files to S3 if any
    if (uploadedFiles.length > 0) {
      for (const file of uploadedFiles) {
        try {
          // Generate unique filename
          const timestamp = Date.now();
          const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const s3Key = `posts/${userId}/${timestamp}_${sanitizedFileName}`;
          
          // Convert file to buffer
          const buffer = Buffer.from(await file.arrayBuffer());
          
          // Upload to S3
          const uploadCommand = new PutObjectCommand({
            Bucket: process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || 'londonbridgeprojt',
            Key: s3Key,
            Body: buffer,
            ContentType: file.type,
          });
          
          await s3Client.send(uploadCommand);
          mediaKeys.push(s3Key);
        } catch (uploadError) {
          console.error('Error uploading file to S3:', uploadError);
          return NextResponse.json(
            { success: false, error: 'Dosya yükleme başarısız oldu' },
            { status: 500 }
          );
        }
      }
    }

    // Create Supabase client
    const supabase = createClient();

    // Insert post into posts table
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        user_id: userId,
        content: content || '',
        visibility
      })
      .select('id')
      .single();

    if (postError) {
      console.error('Error creating post:', postError);
      return NextResponse.json(
        { success: false, error: 'Post oluşturulurken bir hata meydana geldi' },
        { status: 500 }
      );
    }

    // If there are media files, insert them into post_media table
    if (mediaKeys.length > 0) {
      const mediaEntries = mediaKeys.map((key: string, index: number) => {
        const file = uploadedFiles[index];
        
        // Determine media type based on the file type
        let mediaType = 'image';
        if (file.type.startsWith('video/')) {
          mediaType = 'video';
        } else if (file.type.includes('pdf') || file.type.includes('document')) {
          mediaType = 'document';
        }

        return {
          post_id: post.id,
          media_type: mediaType,
          s3_bucket_name: process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || 'londonbridgeprojt',
          s3_key: key,
          media_original_name: file.name,
          media_size: file.size,
          media_content_type: file.type,
        };
      });

      const { error: mediaError } = await supabase
        .from('post_media')
        .insert(mediaEntries);

      if (mediaError) {
        console.error('Error inserting media:', mediaError);
        // Even if media insertion fails, the post has been created
        // We could potentially delete the post here, but we'll return a partial success
        return NextResponse.json(
          { 
            success: true, 
            warning: 'Post oluşturuldu fakat medya yüklemesi başarısız oldu',
            postId: post.id 
          }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Post başarıyla oluşturuldu',
      postId: post.id
    });
    
  } catch (error) {
    console.error('Unexpected error in post creation:', error);
    return NextResponse.json(
      { success: false, error: 'Beklenmeyen bir hata oluştu' },
      { status: 500 }
    );
  }
} 