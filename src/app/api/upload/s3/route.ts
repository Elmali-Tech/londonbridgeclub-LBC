import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import { uploadFileToS3, deleteFileFromS3 } from '@/lib/s3UploadUtils';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // Validate the session
    const session = await validateSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user ID from the session
    const userId = session.id.toString();

    // Parse the request body
    const formData = await request.formData();
    
    // Get the file from the form data
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Get the file type from the form data
    const fileType = formData.get('fileType') as string | null;
    if (!fileType || !['PROFILE_IMAGE', 'BANNER_IMAGE', 'POST_MEDIA', 'PARTNERS_LOGOS'].includes(fileType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type' },
        { status: 400 }
      );
    }

    // Upload the file to S3
    const uploadResult = await uploadFileToS3(
      file,
      userId,
      fileType as 'PROFILE_IMAGE' | 'BANNER_IMAGE' | 'POST_MEDIA' | 'PARTNERS_LOGOS'
    );

    if (!uploadResult.success) {
      return NextResponse.json(
        { success: false, error: uploadResult.error || 'Failed to upload file' },
        { status: 500 }
      );
    }

    // Return the S3 key
    return NextResponse.json({
      success: true,
      key: uploadResult.key
    });
  } catch (error) {
    console.error('Unexpected error in S3 upload:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Validate the session
    const session = await validateSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Kullanıcı admin mi kontrol et
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', session.id)
      .single();

    if (userError || !users || !users.is_admin) {
      return NextResponse.json({ success: false, error: 'Admin yetkisi gerekiyor' }, { status: 403 });
    }

    // URL'den dosya anahtarını al
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json(
        { success: false, error: 'Key is required' },
        { status: 400 }
      );
    }

    // Dosyayı S3'ten sil
    const success = await deleteFileFromS3(key);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete file' },
        { status: 500 }
      );
    }

    // Başarılı sonucu döndür
    return NextResponse.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Unexpected error in S3 delete:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 