import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { validateSession } from '@/lib/auth';
import { User } from '@/types/database';

export async function PUT(request: NextRequest) {
  try {
    const session = await validateSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.id;
    const body = await request.json();

    const updateData: Partial<User> = {};

    const textFields = ['username', 'full_name', 'headline', 'bio', 'location', 'industry', 'linkedin_url', 'website_url', 'date_of_birth'] as const;
    textFields.forEach(field => {
      if (field in body) {
        updateData[field] = body[field] ?? undefined;
      }
    });

    if ('profile_image_key' in body) {
      updateData.profile_image_key = body.profile_image_key ?? null;
    }
    if ('banner_image_key' in body) {
      updateData.banner_image_key = body.banner_image_key ?? null;
    }

    updateData.updated_at = new Date().toISOString();

    const supabase = createClient();
    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user profile:', error);
      return NextResponse.json({ success: false, error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json({ success: true, user: data });
  } catch (error) {
    console.error('Unexpected error in profile update:', error);
    return NextResponse.json({ success: false, error: 'An unexpected error occurred' }, { status: 500 });
  }
} 