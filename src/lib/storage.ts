export const DEFAULT_STORAGE_BUCKET = 'lbc-assets';

const publicStorageBucketName = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET;

export const storageBucketName =
  publicStorageBucketName ||
  process.env.SUPABASE_STORAGE_BUCKET ||
  DEFAULT_STORAGE_BUCKET;

const normalizeAssetKey = (key: string) => key.trim().replace(/^\/+/, '');

const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value);

export const getLegacyS3PublicUrl = (
  key: string,
  bucket = process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || 'londonbridgeproject'
): string => {
  if (!key) return '';
  if (isAbsoluteUrl(key)) return key;

  const s3BaseUrl = process.env.NEXT_PUBLIC_AWS_S3_URL;
  if (s3BaseUrl) {
    return `${s3BaseUrl.replace(/\/$/, '')}/${normalizeAssetKey(key)}`;
  }

  const region = process.env.NEXT_PUBLIC_AWS_REGION || 'eu-north-1';
  return `https://${bucket}.s3.${region}.amazonaws.com/${normalizeAssetKey(key)}`;
};

export const getSupabaseStoragePublicUrl = (
  key: string,
  bucket = storageBucketName
): string => {
  if (!key) return '';
  if (isAbsoluteUrl(key)) return key;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return getLegacyS3PublicUrl(key);
  }

  const baseUrl = supabaseUrl.replace(/\/$/, '');
  return `${baseUrl}/storage/v1/object/public/${bucket}/${encodeURI(normalizeAssetKey(key))}`;
};

export const getAssetPublicUrl = (
  key: string,
  bucket = publicStorageBucketName
): string => {
  if (!key) return '';
  if (isAbsoluteUrl(key)) return key;

  if (!bucket) {
    return getLegacyS3PublicUrl(key);
  }

  return getSupabaseStoragePublicUrl(key, bucket);
};

export const getAssetUrlPair = (
  key: string,
  legacyBucket?: string
): { primary: string; fallback: string } => ({
  primary: getAssetPublicUrl(key),
  fallback: getLegacyS3PublicUrl(key, legacyBucket),
});
