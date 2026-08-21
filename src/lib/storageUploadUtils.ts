import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import { AllowedFileTypes, FileSizeLimits, S3Folders, s3Client, bucketName } from "./awsConfig";
import { getAssetPublicUrl } from "./storage";

export type StorageFileType =
  | "PROFILE_IMAGE"
  | "BANNER_IMAGE"
  | "POST_MEDIA"
  | "PARTNERS_LOGOS"
  | "BENEFITS_IMAGES";

const folderByFileType: Record<StorageFileType, string> = {
  PROFILE_IMAGE: S3Folders.PROFILE_IMAGES,
  BANNER_IMAGE: S3Folders.BANNER_IMAGES,
  POST_MEDIA: S3Folders.POST_MEDIA,
  PARTNERS_LOGOS: S3Folders.PARTNERS_LOGOS,
  BENEFITS_IMAGES: "benefits",
};

export const validateStorageFile = (file: File, type: StorageFileType) => {
  if (!AllowedFileTypes[type].includes(file.type)) {
    return {
      isValid: false,
      error: `Unsupported file type. Allowed types: ${AllowedFileTypes[type].join(", ")}`,
    };
  }
  if (file.size > FileSizeLimits[type]) {
    return {
      isValid: false,
      error: `File too large. Maximum file size: ${FileSizeLimits[type] / 1024 / 1024}MB`,
    };
  }
  return { isValid: true };
};

export const generateStorageKey = (
  folder: string,
  userId: string,
  fileName: string,
) => `${folder}/${userId}/${uuidv4()}.${fileName.split(".").pop() || "bin"}`;

export const uploadBufferToAssetStorage = async (
  key: string,
  body: Buffer,
  contentType?: string,
): Promise<{ success: boolean; key?: string; publicUrl?: string; error?: string }> => {
  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    return { success: true, key, publicUrl: getAssetPublicUrl(key) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Asset upload failed",
    };
  }
};

export const uploadFileToAssetStorage = async (
  file: File,
  userId: string,
  fileType: StorageFileType,
) => {
  const validation = validateStorageFile(file, fileType);
  if (!validation.isValid) return { success: false, error: validation.error };
  const key = generateStorageKey(folderByFileType[fileType], userId, file.name);
  return uploadBufferToAssetStorage(
    key,
    Buffer.from(await file.arrayBuffer()),
    file.type,
  );
};

export const deleteFileFromAssetStorage = async (key: string) => {
  if (!key) return true;
  try {
    await s3Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }));
    return true;
  } catch {
    return false;
  }
};
