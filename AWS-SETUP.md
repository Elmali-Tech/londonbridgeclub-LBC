# AWS S3 Setup for London Bridge Project

Follow these steps to set up AWS S3 for image storage in the London Bridge project.

## 1. Create an IAM User

1. Go to AWS IAM Console: https://console.aws.amazon.com/iam/
2. Click on "Users" and then "Add user"
3. Username: `londonbridge-app-user`
4. Select "Programmatic access" for Access type
5. Click "Next: Permissions"
6. Click "Attach existing policies directly"
7. Create a new policy by clicking "Create policy":
   - Use the JSON editor and paste the content from `aws-iam-user-policy.json`
   - Name it: `LondonBridgeS3Access`
8. Attach this policy to the user
9. Click through to create the user
10. **Important**: Save the Access Key ID and Secret Access Key securely

## 2. Configure S3 Bucket

1. Go to AWS S3 Console: https://s3.console.aws.amazon.com/s3/
2. Click "Create bucket"
3. Bucket name: `londonbridgeprojt`
4. Select the region closest to your users (e.g., `eu-west-1`)
5. Uncheck "Block all public access" (since we need public read access)
6. Enable versioning (recommended)
7. Click "Create bucket"

## 3. Set Up Bucket Policy

1. Once the bucket is created, go to the bucket
2. Click on "Permissions" tab
3. Scroll down to "Bucket policy" and click "Edit"
4. Paste the content from `aws-s3-policy.json` 
5. Replace `<YOUR-AWS-ACCOUNT-ID>` with your actual AWS account ID
6. Click "Save changes"

## 4. Set Up CORS Configuration

1. Still in the bucket "Permissions" tab
2. Scroll down to "Cross-origin resource sharing (CORS)"
3. Click "Edit" and add the following configuration:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"]
  }
]
```

4. Click "Save changes"

## 5. Create Folder Structure

For better organization, create the following folders in the bucket:

1. `profile-images/`
2. `banner-images/`
3. `post-media/`

## 6. Update Environment Variables

Add these environment variables to your `.env.local` file:

```
NEXT_PUBLIC_AWS_REGION=eu-west-1
NEXT_PUBLIC_AWS_ACCESS_KEY_ID=<your access key>
NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY=<your secret key>
NEXT_PUBLIC_AWS_S3_BUCKET_NAME=londonbridgeprojt
```

## 7. Security Best Practices

- Consider setting up CloudFront distribution for global content delivery
- Implement server-side validation of file types and sizes
- Regularly rotate IAM credentials
- Monitor S3 access logs
- Consider using presigned URLs for more security control

## 8. Ongoing Maintenance

- Set up lifecycle rules to expire older objects if needed
- Monitor bucket size and usage costs
- Consider enabling S3 Analytics to optimize storage class usage 