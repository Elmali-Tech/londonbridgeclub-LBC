export const DEFAULT_STORAGE_BUCKET = "londonbridgeproject";

const normalizeAssetKey = (key: string) => key.trim().replace(/^\/+/, "");
const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value);

export const storageBucketName =
  process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || DEFAULT_STORAGE_BUCKET;

export const getLegacyS3PublicUrl = (
  key: string,
  bucket = storageBucketName,
): string => {
  if (!key) return "";
  if (isAbsoluteUrl(key)) return key;
  const baseUrl = process.env.NEXT_PUBLIC_AWS_S3_URL;
  if (baseUrl) {
    return `${baseUrl.replace(/\/$/, "")}/${normalizeAssetKey(key)}`;
  }
  const region = process.env.NEXT_PUBLIC_AWS_REGION || "eu-north-1";
  return `https://${bucket}.s3.${region}.amazonaws.com/${normalizeAssetKey(key)}`;
};

export const getAssetPublicUrl = (key: string, bucket = storageBucketName) =>
  getLegacyS3PublicUrl(key, bucket);

export const getAssetUrlPair = (key: string, legacyBucket?: string) => {
  const url = getLegacyS3PublicUrl(key, legacyBucket);
  return { primary: url, fallback: url };
};
