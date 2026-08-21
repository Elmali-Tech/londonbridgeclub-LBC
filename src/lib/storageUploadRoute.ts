import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import {
  deleteFileFromAssetStorage,
  uploadFileToAssetStorage,
  type StorageFileType,
} from '@/lib/storageUploadUtils';

const validFileTypes: StorageFileType[] = [
  'PROFILE_IMAGE',
  'BANNER_IMAGE',
  'POST_MEDIA',
  'PARTNERS_LOGOS',
  'BENEFITS_IMAGES',
];

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

    const uploadResult = await uploadFileToAssetStorage(
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

    if (!session.is_admin && session.role !== 'admin') {
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

    const deletedFromStorage = await deleteFileFromAssetStorage(key);

    if (!deletedFromStorage) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete file' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
      deletedFromStorage,
    });
  } catch (error) {
    console.error('Unexpected error in storage delete:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
