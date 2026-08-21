import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/permissions';
import { uploadBufferToSupabaseStorage } from '@/lib/storageUploadUtils';

interface Opportunity {
  id: number;
  title: string;
  company: string;
  service_detail: string;
  category: string;
  estimated_budget: string;
  description: string;
  image_key: string | null;
  is_active: boolean;
  customer_opportunity_id: number | null;
  created_at: string;
}

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const includeInactive = url.searchParams.get('includeInactive') === '1';
    if (id) {
      const { data, error } = await supabase
        .from('opportunities')
        .select('*')
        .eq('id', id)
        .single();
      if (error || !data) {
        return NextResponse.json({ success: false, error: 'Opportunity not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, opportunity: data });
    }
    if (includeInactive) {
      const auth = await requireRole(request, ['admin', 'opportunity_manager']);
      if (auth.response) return auth.response;
    }

    let query = supabase
      .from('opportunities')
      .select('*')
      .order('created_at', { ascending: false });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data: opportunities, error } = await query;
    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to fetch opportunities' }, { status: 500 });
    }
    return NextResponse.json({ success: true, opportunities: opportunities as Opportunity[] });
  } catch {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireRole(request, ['admin', 'opportunity_manager']);
    if (auth.response) return auth.response;

    // Parse form data
    const formData = await request.formData();
    const title = formData.get('title') as string;
    const company = formData.get('company') as string;
    const service_detail = formData.get('service_detail') as string;
    const category = formData.get('category') as string;
    const estimated_budget = formData.get('estimated_budget') as string;
    const description = formData.get('description') as string;
    const imageFile = formData.get('image') as File | null;
    const customerOpportunityIdRaw = formData.get('customer_opportunity_id') as string | null;
    const customer_opportunity_id = customerOpportunityIdRaw
      ? Number(customerOpportunityIdRaw)
      : null;

    if (!title || !company || !service_detail || !category || !estimated_budget) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    let image_key: string | null = null;
    if (imageFile && imageFile.size > 0) {
      // Only allow image types
      if (!imageFile.type.startsWith('image/')) {
        return NextResponse.json({ success: false, error: 'Invalid image type' }, { status: 400 });
      }
      // Generate unique file name
      const ext = imageFile.name.split('.').pop();
      const fileName = `opportunities/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const uploadResult = await uploadBufferToSupabaseStorage(
        fileName,
        Buffer.from(await imageFile.arrayBuffer()),
        imageFile.type
      );
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Supabase Storage upload failed');
      }
      image_key = fileName;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('opportunities')
      .insert([
        {
          title,
          company,
          service_detail,
          category,
          estimated_budget,
          description,
          image_key,
          is_active: true,
          customer_opportunity_id: Number.isInteger(customer_opportunity_id)
            ? customer_opportunity_id
            : null,
          created_at: new Date().toISOString(),
        },
      ])
      .select();
    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to create opportunity' }, { status: 500 });
    }
    return NextResponse.json({ success: true, opportunity: data[0] });
  } catch {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
