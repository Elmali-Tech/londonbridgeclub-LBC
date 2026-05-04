// S3 Upload Utilities
// This file contains the utility functions for uploading files to AWS S3

import { 
  PutObjectCommand, 
  DeleteObjectCommand,
  GetObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { s3Client, bucketName, S3Folders, FileSizeLimits, AllowedFileTypes } from './awsConfig';

// File validation interface
interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

// Validate file before upload
export const validateFile = (
  file: File, 
  type: 'PROFILE_IMAGE' | 'BANNER_IMAGE' | 'POST_MEDIA' | 'PARTNERS_LOGOS'
): FileValidationResult => {
  // Check file type
  if (!AllowedFileTypes[type].includes(file.type)) {
    return {
      isValid: false,
      error: `Unsupported file type. Allowed types: ${AllowedFileTypes[type].join(', ')}`,
    };
  }

  // Check file size
  if (file.size > FileSizeLimits[type]) {
    const limitInMB = FileSizeLimits[type] / (1024 * 1024);
    return {
      isValid: false,
      error: `File too large. Maximum file size: ${limitInMB}MB`,
    };
  }

  return { isValid: true };
};

// Generate S3 key for file
export const generateS3Key = (
  folder: string,
  userId: string,
  fileName: string
): string => {
  const fileExtension = fileName.split('.').pop() || '';
  const uniqueId = uuidv4();
  return `${folder}/${userId}/${uniqueId}.${fileExtension}`;
};

// Upload file to S3
export const uploadFileToS3 = async (
  file: File,
  userId: string,
  fileType: 'PROFILE_IMAGE' | 'BANNER_IMAGE' | 'POST_MEDIA' | 'PARTNERS_LOGOS'
): Promise<{ success: boolean; key?: string; error?: string }> => {
  try {
    // Validate file
    const validation = validateFile(file, fileType);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    // Determine folder based on file type
    let folder = '';
    switch (fileType) {
      case 'PROFILE_IMAGE':
        folder = S3Folders.PROFILE_IMAGES;
        break;
      case 'BANNER_IMAGE':
        folder = S3Folders.BANNER_IMAGES;
        break;
      case 'POST_MEDIA':
        folder = S3Folders.POST_MEDIA;
        break;
      case 'PARTNERS_LOGOS':
        folder = S3Folders.PARTNERS_LOGOS;
        break;
    }

    // Generate S3 key
    const key = generateS3Key(folder, userId, file.name);

    // Convert file to buffer
    const fileArrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(fileArrayBuffer);

    // Create put object command
    const putCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: fileBuffer,
      ContentType: file.type,
    });

    // Upload file to S3
    await s3Client.send(putCommand);

    return { success: true, key };
  } catch (error) {
    console.error('Error uploading file to S3:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred during upload'
    };
  }
};

// Delete file from S3
export const deleteFileFromS3 = async (key: string): Promise<boolean> => {
  try {
    if (!key) return true; // Nothing to delete

    const deleteCommand = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    await s3Client.send(deleteCommand);
    return true;
  } catch (error) {
    console.error('Error deleting file from S3:', error);
    return false;
  }
};

// Generate a signed URL for temporary access to a private file (useful for secure access)
export const getSignedFileUrl = async (key: string, expiresIn = 3600): Promise<string> => {
  try {
    if (!key) return '';

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    return await getSignedUrl(s3Client, command, { expiresIn });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return '';
  }
}; 