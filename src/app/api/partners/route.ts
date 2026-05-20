import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAssetPublicUrl, getLegacyS3PublicUrl } from '@/lib/storage';

export const dynamic = 'force-dynamic';

type PartnerRow = {
  id: number;
  name: string;
  website_url: string | null;
  logo_key: string;
  created_at: string;
};

const LOGO_CHECK_TIMEOUT_MS = 2500;

async function isReachableAsset(url: string): Promise<boolean> {
  if (!url) return false;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LOGO_CHECK_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-store',
    });

    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function resolvePublicLogoUrl(logoKey: string) {
  const candidates = Array.from(
    new Set([getAssetPublicUrl(logoKey), getLegacyS3PublicUrl(logoKey)].filter(Boolean))
  );

  for (const candidate of candidates) {
    if (await isReachableAsset(candidate)) {
      return candidate;
    }
  }

  return '';
}

export async function GET() {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('partners')
      .select('id, name, website_url, logo_key, created_at')
      .not('logo_key', 'is', null)
      .neq('logo_key', '')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching public partners:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch partners' },
        { status: 500 }
      );
    }

    const partners = await Promise.all(
      ((data || []) as PartnerRow[]).map(async (partner) => ({
        id: partner.id,
        name: partner.name,
        websiteUrl: partner.website_url,
        logoKey: partner.logo_key,
        logoUrl: await resolvePublicLogoUrl(partner.logo_key),
        createdAt: partner.created_at,
      }))
    );

    return NextResponse.json({ success: true, partners });
  } catch (error) {
    console.error('Unexpected error fetching public partners:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
