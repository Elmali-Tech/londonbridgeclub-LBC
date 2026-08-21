import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/permissions';
import { v4 as uuidv4 } from 'uuid';
import { AllowedFileTypes } from '@/lib/awsConfig';
import { uploadBufferToSupabaseStorage } from '@/lib/storageUploadUtils';

// GET - List all benefits
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    const { data: benefits, error } = await supabase
      .from('benefits')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching benefits:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch benefits' }, { status: 500 });
    }

    return NextResponse.json({ success: true, benefits });
  } catch (error) {
    console.error('GET /api/admin/benefits error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new benefit
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    const formData = await request.formData();
    
    // Extract benefit data
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    const partner_name = formData.get('partner_name') as string || null;
    const partner_website = formData.get('partner_website') as string || null;
    const discount_percentage = formData.get('discount_percentage') ? parseInt(formData.get('discount_percentage') as string) : null;
    const discount_code = formData.get('discount_code') as string || null;
    const valid_until = formData.get('valid_until') as string || null;
    const terms_conditions = formData.get('terms_conditions') as string || null;
    const is_active = formData.get('is_active') === 'true';
    const premium = formData.get('premium') === 'true';

    // Handle image upload
    let imageKey = null;
    const imageFile = formData.get('image') as File;
    
    if (imageFile && imageFile.size > 0) {
      // Validate file type
      if (!AllowedFileTypes.BENEFITS_IMAGES.includes(imageFile.type)) {
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid file type. Only JPEG, PNG, WebP and SVG images are allowed.' 
        }, { status: 400 });
      }

      // Generate unique filename
      const fileExtension = imageFile.name.split('.').pop();
      const fileName = `benefits/${uuidv4()}.${fileExtension}`;
      imageKey = fileName;

      const uploadResult = await uploadBufferToSupabaseStorage(
        fileName,
        Buffer.from(await imageFile.arrayBuffer()),
        imageFile.type
      );

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Supabase Storage upload failed');
      }
    }

    // Insert benefit into database
    const { data: benefit, error } = await supabase
      .from('benefits')
      .insert({
        title,
        description,
        category,
        partner_name,
        partner_website,
        discount_percentage,
        discount_code,
        valid_until,
        terms_conditions,
        is_active,
        premium,
        image_key: imageKey,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating benefit:', error);
      return NextResponse.json({ success: false, error: 'Failed to create benefit' }, { status: 500 });
    }

    return NextResponse.json({ success: true, benefit });
  } catch (error) {
    console.error('POST /api/admin/benefits error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
} 
