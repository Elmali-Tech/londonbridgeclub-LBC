import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/permissions';
import { createClient } from '@/lib/supabase';

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  const supabase = createClient();
  const { data, error } = await supabase
    .from('doc_articles')
    .select('id, title, slug, category, sort_order, is_published, created_at, updated_at')
    .order('category', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, articles: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  const body = await request.json();
  const { title, content, category, sort_order, is_published } = body;

  if (!title?.trim()) {
    return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
  }

  const supabase = createClient();

  // Generate unique slug
  const baseSlug = slugify(title);
  let slug = baseSlug;
  let attempt = 1;
  while (true) {
    const { data: existing } = await supabase
      .from('doc_articles')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    if (!existing) break;
    slug = `${baseSlug}-${++attempt}`;
  }

  const { data, error } = await supabase
    .from('doc_articles')
    .insert({
      title: title.trim(),
      slug,
      content: content ?? '',
      category: category?.trim() || 'General',
      sort_order: sort_order ?? 0,
      is_published: is_published ?? true,
      created_by: auth.user?.id ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, article: data }, { status: 201 });
}
