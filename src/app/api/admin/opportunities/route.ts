import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateSession } from '@/lib/auth';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

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
  created_at: string;
}

const s3Client = new S3Client({
  region: process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
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
    const { data: opportunities, error } = await supabase
      .from('opportunities')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to fetch opportunities' }, { status: 500 });
    }
    return NextResponse.json({ success: true, opportunities: opportunities as Opportunity[] });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await validateSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const title = formData.get('title') as string;
    const company = formData.get('company') as string;
    const service_detail = formData.get('service_detail') as string;
    const category = formData.get('category') as string;
    const estimated_budget = formData.get('estimated_budget') as string;
    const description = formData.get('description') as string;
    const imageFile = formData.get('image') as File | null;

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
      const uploadParams = {
        Bucket: process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || 'londonbridgeprojt',
        Key: fileName,
        Body: Buffer.from(await imageFile.arrayBuffer()),
        ContentType: imageFile.type,
      };
      await s3Client.send(new PutObjectCommand(uploadParams));
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
          created_at: new Date().toISOString(),
        },
      ])
      .select();
    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to create opportunity' }, { status: 500 });
    }
    return NextResponse.json({ success: true, opportunity: data[0] });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
} 