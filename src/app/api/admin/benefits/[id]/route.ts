import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { validateSession } from '@/lib/auth';
import { S3Client, DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { AllowedFileTypes } from '@/lib/awsConfig';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

// GET - Get specific benefit
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await validateSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', session.id)
      .single();

    if (userError || !userData?.is_admin) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const resolvedParams = await params;
    const { data: benefit, error } = await supabase
      .from('benefits')
      .select('*')
      .eq('id', resolvedParams.id)
      .single();

    if (error) {
      console.error('Error fetching benefit:', error);
      return NextResponse.json({ success: false, error: 'Benefit not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, benefit });
  } catch (error) {
    console.error('GET /api/admin/benefits/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update benefit
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await validateSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', session.id)
      .single();

    if (userError || !userData?.is_admin) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const resolvedParams = await params;
    // Get existing benefit data
    const { data: existingBenefit, error: fetchError } = await supabase
      .from('benefits')
      .select('*')
      .eq('id', resolvedParams.id)
      .single();

    if (fetchError || !existingBenefit) {
      return NextResponse.json({ success: false, error: 'Benefit not found' }, { status: 404 });
    }

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

    // Handle image upload
    let imageKey = existingBenefit.image_key;
    const imageFile = formData.get('image') as File;
    
    if (imageFile && imageFile.size > 0) {
      // Validate file type
      if (!AllowedFileTypes.BENEFITS_IMAGES.includes(imageFile.type)) {
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid file type. Only JPEG, PNG, WebP and SVG images are allowed.' 
        }, { status: 400 });
      }

      // Delete old image if exists
      if (existingBenefit.image_key) {
        try {
          await s3Client.send(new DeleteObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: existingBenefit.image_key,
          }));
        } catch (deleteError) {
          console.error('Error deleting old image:', deleteError);
        }
      }

      // Generate unique filename
      const fileExtension = imageFile.name.split('.').pop();
      const fileName = `benefits/${uuidv4()}.${fileExtension}`;
      imageKey = fileName;

      // Upload to S3
      const uploadParams = {
        Bucket: process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || 'londonbridgeprojt',
        Key: fileName,
        Body: Buffer.from(await imageFile.arrayBuffer()),
        ContentType: imageFile.type
      };

      await s3Client.send(new PutObjectCommand(uploadParams));
    }

    // Update benefit in database
    const { data: benefit, error } = await supabase
      .from('benefits')
      .update({
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
        image_key: imageKey,
      })
      .eq('id', resolvedParams.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating benefit:', error);
      return NextResponse.json({ success: false, error: 'Failed to update benefit' }, { status: 500 });
    }

    return NextResponse.json({ success: true, benefit });
  } catch (error) {
    console.error('PUT /api/admin/benefits/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete benefit
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await validateSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', session.id)
      .single();

    if (userError || !userData?.is_admin) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const resolvedParams = await params;
    // Get benefit data to delete associated image
    const { data: benefit, error: fetchError } = await supabase
      .from('benefits')
      .select('image_key')
      .eq('id', resolvedParams.id)
      .single();

    if (fetchError) {
      return NextResponse.json({ success: false, error: 'Benefit not found' }, { status: 404 });
    }

    // Delete image from S3 if exists
    if (benefit.image_key) {
      try {
        await s3Client.send(new DeleteObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: benefit.image_key,
        }));
      } catch (deleteError) {
        console.error('Error deleting image from S3:', deleteError);
      }
    }

    // Delete benefit from database
    const { error } = await supabase
      .from('benefits')
      .delete()
      .eq('id', resolvedParams.id);

    if (error) {
      console.error('Error deleting benefit:', error);
      return NextResponse.json({ success: false, error: 'Failed to delete benefit' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Benefit deleted successfully' });
  } catch (error) {
    console.error('DELETE /api/admin/benefits/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
} 