import { uploadBufferToAssetStorage } from '@/lib/storageUploadUtils';

export interface EventRecord {
  id: number;
  title: string;
  description: string | null;
  location: string | null;
  event_date: string;
  event_time: string | null;
  category: string | null;
  image_key: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string | null;
}

export interface EventFormPayload {
  title: string;
  description: string | null;
  location: string | null;
  event_date: string;
  event_time: string | null;
  category: string | null;
  is_active: boolean;
}

type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; status: number };

const EVENT_IMAGE_MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_EVENT_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const getText = (formData: FormData, key: string): string => {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
};

const getNullableText = (formData: FormData, key: string): string | null => {
  const value = getText(formData, key);
  return value || null;
};

const getActiveValue = (formData: FormData): boolean => {
  const value = formData.get('is_active');
  if (value === null) return true;
  if (typeof value !== 'string') return true;
  return ['true', '1', 'on', 'yes'].includes(value.toLowerCase());
};

export const parseEventFormData = (formData: FormData): Result<EventFormPayload> => {
  const payload: EventFormPayload = {
    title: getText(formData, 'title'),
    description: getNullableText(formData, 'description'),
    location: getNullableText(formData, 'location'),
    event_date: getText(formData, 'event_date'),
    event_time: getNullableText(formData, 'event_time'),
    category: getNullableText(formData, 'category'),
    is_active: getActiveValue(formData),
  };

  if (!payload.title) {
    return { ok: false, error: 'Event title is required', status: 400 };
  }

  if (!payload.event_date || !/^\d{4}-\d{2}-\d{2}$/.test(payload.event_date)) {
    return { ok: false, error: 'Valid event date is required', status: 400 };
  }

  if (payload.event_time && !/^\d{2}:\d{2}(:\d{2})?$/.test(payload.event_time)) {
    return { ok: false, error: 'Valid event time is required', status: 400 };
  }

  return { ok: true, value: payload };
};

export const uploadEventImage = async (
  formData: FormData
): Promise<Result<{ imageKey: string | null }>> => {
  const imageValue = formData.get('image');

  if (!imageValue || typeof imageValue === 'string') {
    return { ok: true, value: { imageKey: null } };
  }

  const imageFile = imageValue as File;
  if (imageFile.size === 0) {
    return { ok: true, value: { imageKey: null } };
  }

  if (!ALLOWED_EVENT_IMAGE_TYPES.has(imageFile.type)) {
    return {
      ok: false,
      error: 'Invalid image type. Please upload a JPG, PNG or WEBP image.',
      status: 400,
    };
  }

  if (imageFile.size > EVENT_IMAGE_MAX_SIZE) {
    return {
      ok: false,
      error: 'Image is too large. Maximum file size is 5MB.',
      status: 400,
    };
  }

  const fallbackExtension = EXTENSION_BY_MIME_TYPE[imageFile.type] || 'bin';
  const extension = imageFile.name.split('.').pop()?.toLowerCase() || fallbackExtension;
  const fileName = `events/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${extension}`;

  const uploadResult = await uploadBufferToAssetStorage(
    fileName,
    Buffer.from(await imageFile.arrayBuffer()),
    imageFile.type
  );

  if (!uploadResult.success) {
    return {
      ok: false,
      error: uploadResult.error || 'Event image upload failed',
      status: 500,
    };
  }

  return { ok: true, value: { imageKey: fileName } };
};

export const eventNotificationDetails = (event: Pick<EventRecord, 'title' | 'event_date' | 'event_time' | 'location' | 'category'>) => `
  - Title: ${event.title}
  - Date: ${event.event_date}
  - Time: ${event.event_time || 'N/A'}
  - Location: ${event.location || 'TBA'}
  - Category: ${event.category || 'General'}
`;
