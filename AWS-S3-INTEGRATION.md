# AWS S3 Integration for Profile Images

This document outlines how AWS S3 is integrated into the London Bridge application for handling profile and banner images.

## Implementation Overview

We've implemented the following components:

1. **AWS S3 Configuration**
   - `src/lib/awsConfig.ts` - Configuration for AWS S3 client with environment variables
   - Bucket name, folder structure, and file size limits defined
   - Utility function for generating public URLs for S3 objects

2. **File Upload Utilities**
   - `src/lib/s3UploadUtils.ts` - Utility functions for file validation, upload, and deletion
   - Handles file validation (type, size)
   - Generates unique S3 keys for uploaded files
   - Provides functions for deleting files and generating signed URLs

3. **API Endpoints**
   - `/api/upload/s3` - Handles file uploads to S3
   - `/api/profile/update` - Updates user profile with S3 image keys

4. **UI Components**
   - `ImageUpload.tsx` - Reusable component for image uploads
   - Supports both profile and banner image uploads
   - Provides visual feedback during upload process
   - Displays uploaded images

5. **Profile Page Integration**
   - Updated profile page to use the image upload component
   - Added handlers for profile and banner image uploads
   - Enhanced UI to display uploaded images

## AWS Setup Requirements

Follow the instructions in `AWS-SETUP.md` to properly configure your AWS environment, which includes:

1. Creating an IAM user with appropriate permissions
2. Configuring an S3 bucket with the correct policies
3. Setting up CORS for the bucket
4. Adding required environment variables to your project

## Environment Variables

Add these variables to your `.env.local` file:

```
NEXT_PUBLIC_AWS_REGION=eu-west-1
NEXT_PUBLIC_AWS_ACCESS_KEY_ID=your_aws_access_key
NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY=your_aws_secret_key
NEXT_PUBLIC_AWS_S3_BUCKET_NAME=londonbridgeprojt
```

## Database Updates

We've updated the database schema to include fields for storing S3 keys:

- `profile_image_key` - Stores the S3 key for the user's profile image
- `banner_image_key` - Stores the S3 key for the user's banner image

These keys are used to generate public URLs for the uploaded images.

## Security Considerations

- Files are validated on both client and server side
- Unique file names are generated to prevent overwrites
- Public read access is granted only to files in the bucket
- Write access is restricted to authenticated users 