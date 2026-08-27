import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/permissions';
import { createClient } from '@/lib/supabase';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  const { id } = await params;
  const articleId = parseInt(id);
  if (isNaN(articleId)) return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });

  const supabase = createClient();
  const { data, error } = await supabase
    .from('doc_articles')
    .select('*')
    .eq('id', articleId)
    .single();

  if (error || !data) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true, article: data });
}

export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  const { id } = await params;
  const articleId = parseInt(id);
  if (isNaN(articleId)) return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });

  const body = await request.json();
  const { title, content, category, sort_order, is_published } = body;

  if (!title?.trim()) return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });

  const supabase = createClient();
  const { data, error } = await supabase
    .from('doc_articles')
    .update({
      title: title.trim(),
      content: content ?? '',
      category: category?.trim() || 'General',
      sort_order: sort_order ?? 0,
      is_published: is_published ?? true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', articleId)
    .select()
    .single();

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, article: data });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  const { id } = await params;
  const articleId = parseInt(id);
  if (isNaN(articleId)) return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });

  const supabase = createClient();
  const { error } = await supabase.from('doc_articles').delete().eq('id', articleId);

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
