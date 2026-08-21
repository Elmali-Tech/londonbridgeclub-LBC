import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { deleteFileFromS3 } from '@/lib/s3UploadUtils';
import {
  deleteFileFromSupabaseStorage,
  uploadFileToSupabaseStorage,
  type StorageFileType,
} from '@/lib/storageUploadUtils';

const validFileTypes: StorageFileType[] = [
  'PROFILE_IMAGE',
  'BANNER_IMAGE',
  'POST_MEDIA',
  'PARTNERS_LOGOS',
  'BENEFITS_IMAGES',
  'PROPOSAL_DOCUMENTS',
];

const canAttemptLegacyS3Delete = () =>
  Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);

export async function handleStorageUploadPost(request: NextRequest) {
  try {
    const session = await validateSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    const fileType = formData.get('fileType') as StorageFileType | null;
    if (!fileType || !validFileTypes.includes(fileType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type' },
        { status: 400 }
      );
    }

    const uploadResult = await uploadFileToSupabaseStorage(
      file,
      session.id.toString(),
      fileType
    );

    if (!uploadResult.success) {
      return NextResponse.json(
        { success: false, error: uploadResult.error || 'Failed to upload file' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      key: uploadResult.key,
      publicUrl: uploadResult.publicUrl,
    });
  } catch (error) {
    console.error('Unexpected error in storage upload:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function handleStorageUploadDelete(request: NextRequest) {
  try {
    const session = await validateSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', session.id)
      .single();

    if (userError || !user?.is_admin) {
      return NextResponse.json({ success: false, error: 'Admin yetkisi gerekiyor' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json(
        { success: false, error: 'Key is required' },
        { status: 400 }
      );
    }

    const deletedFromStorage = await deleteFileFromSupabaseStorage(key);
    const deletedFromLegacyS3 = canAttemptLegacyS3Delete()
      ? await deleteFileFromS3(key)
      : false;

    if (!deletedFromStorage && !deletedFromLegacyS3) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete file' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
      deletedFromStorage,
      deletedFromLegacyS3,
    });
  } catch (error) {
    console.error('Unexpected error in storage delete:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
