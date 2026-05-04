import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { validateSession } from '@/lib/auth';
import { User } from '@/types/database';

export async function PUT(request: NextRequest) {
  try {
    // Validate the session
    const session = await validateSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user ID from the session
    const userId = session.id;

    // Parse the request body
    const formData = await request.formData();
    
    // Extract profile data
    const updateData: Partial<User> = {};
    
    // Basic text fields
    const textFields = ['username', 'full_name', 'headline', 'bio', 'location', 'industry', 'linkedin_url', 'website_url'] as const;
    textFields.forEach(field => {
      const value = formData.get(field);
      if (value !== null && value !== undefined && typeof value === 'string') {
        updateData[field] = value;
      }
    });

    // Update profile_image_key and banner_image_key if provided
    const profile_image_key = formData.get('profile_image_key');
    if (profile_image_key && typeof profile_image_key === 'string') {
      updateData.profile_image_key = profile_image_key;
    }

    const banner_image_key = formData.get('banner_image_key');
    if (banner_image_key && typeof banner_image_key === 'string') {
      updateData.banner_image_key = banner_image_key;
    }

    // Add updated_at timestamp
    updateData.updated_at = new Date().toISOString();

    // Update the user in the database
    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select();

    if (error) {
      console.error('Error updating user profile:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: data[0]
    });
  } catch (error) {
    console.error('Unexpected error in profile update:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 