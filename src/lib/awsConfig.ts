// AWS S3 configuration
// This file contains the configuration and utility functions for AWS S3 storage

import { S3Client } from '@aws-sdk/client-s3';

// AWS S3 client configuration
export const s3Client = new S3Client({
  region: process.env.NEXT_PUBLIC_AWS_REGION || 'eu-north-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

// S3 bucket name
export const bucketName = process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || 'londonbridgeproject';

// Folder structure within the bucket
export const S3Folders = {
  PROFILE_IMAGES: 'profile-images',
  BANNER_IMAGES: 'banner-images',
  POST_MEDIA: 'post-media',
  PARTNERS_LOGOS: 'partners-logos',
};

// File size limits (in bytes)
export const FileSizeLimits = {
  PROFILE_IMAGE: 5 * 1024 * 1024, // 5MB
  BANNER_IMAGE: 10 * 1024 * 1024, // 10MB
  POST_MEDIA: 50 * 1024 * 1024, // 50MB
  PARTNERS_LOGOS: 5 * 1024 * 1024, // 5MB
};

// Allowed file types
export const AllowedFileTypes = {
  PROFILE_IMAGE: ['image/jpeg', 'image/png', 'image/webp'],
  BANNER_IMAGE: ['image/jpeg', 'image/png', 'image/webp'],
  POST_MEDIA: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'video/mp4'],
  PARTNERS_LOGOS: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
  BENEFITS_IMAGES: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
};

// Get S3 public URL for an object
export const getS3PublicUrl = (key: string): string => {
  if (!key) return '';
  return `https://${bucketName}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'eu-north-1'}.amazonaws.com/${key}`;
}; 