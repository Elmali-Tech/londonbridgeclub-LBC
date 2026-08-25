import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { AllowedFileTypes, FileSizeLimits, S3Folders } from './awsConfig';
import { getSupabaseStoragePublicUrl, storageBucketName } from './storage';

export type StorageFileType =
  | 'PROFILE_IMAGE'
  | 'BANNER_IMAGE'
  | 'POST_MEDIA'
  | 'PARTNERS_LOGOS'
  | 'BENEFITS_IMAGES'
  | 'PROPOSAL_DOCUMENTS';

interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

const folderByFileType: Record<StorageFileType, string> = {
  PROFILE_IMAGE: S3Folders.PROFILE_IMAGES,
  BANNER_IMAGE: S3Folders.BANNER_IMAGES,
  POST_MEDIA: S3Folders.POST_MEDIA,
  PARTNERS_LOGOS: S3Folders.PARTNERS_LOGOS,
  BENEFITS_IMAGES: 'benefits',
  PROPOSAL_DOCUMENTS: 'proposal-documents',
};

const getStorageClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase storage environment variables');
  }

  return createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

export const validateStorageFile = (
  file: File,
  type: StorageFileType
): FileValidationResult => {
  if (!AllowedFileTypes[type].includes(file.type)) {
    return {
      isValid: false,
      error: `Unsupported file type. Allowed types: ${AllowedFileTypes[type].join(', ')}`,
    };
  }

  if (file.size > FileSizeLimits[type]) {
    const limitInMB = FileSizeLimits[type] / (1024 * 1024);
    return {
      isValid: false,
      error: `File too large. Maximum file size: ${limitInMB}MB`,
    };
  }

  return { isValid: true };
};

export const generateStorageKey = (
  folder: string,
  userId: string,
  fileName: string
): string => {
  const fileExtension = fileName.split('.').pop() || 'bin';
  return `${folder}/${userId}/${uuidv4()}.${fileExtension}`;
};

export const uploadBufferToSupabaseStorage = async (
  key: string,
  body: Buffer,
  contentType?: string
): Promise<{ success: boolean; key?: string; publicUrl?: string; error?: string }> => {
  try {
    if (!key) {
      return { success: false, error: 'Storage key is required' };
    }

    const supabase = getStorageClient();
    const { error } = await supabase.storage
      .from(storageBucketName)
      .upload(key, body, {
        contentType,
        upsert: true,
      });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      key,
      publicUrl: getSupabaseStoragePublicUrl(key),
    };
  } catch (error) {
    console.error('Error uploading file to Supabase Storage:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred during upload',
    };
  }
};

export const uploadFileToSupabaseStorage = async (
  file: File,
  userId: string,
  fileType: StorageFileType
): Promise<{ success: boolean; key?: string; publicUrl?: string; error?: string }> => {
  const validation = validateStorageFile(file, fileType);
  if (!validation.isValid) {
    return { success: false, error: validation.error };
  }

  const key = generateStorageKey(folderByFileType[fileType], userId, file.name);
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  return uploadBufferToSupabaseStorage(key, fileBuffer, file.type);
};

export const deleteFileFromSupabaseStorage = async (
  key: string
): Promise<boolean> => {
  try {
    if (!key) return true;

    const supabase = getStorageClient();
    const { error } = await supabase.storage
      .from(storageBucketName)
      .remove([key]);

    if (error) {
      console.error('Error deleting file from Supabase Storage:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Unexpected error deleting from Supabase Storage:', error);
    return false;
  }
};
