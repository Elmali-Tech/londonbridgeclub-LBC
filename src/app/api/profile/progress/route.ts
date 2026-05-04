import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { validateToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await validateToken(token);
    if (!currentUser) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    const userId = currentUser.id;

    const supabase = createClient();
    
    // Get user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error fetching user:', userError);
      return NextResponse.json({ success: false, error: 'Error fetching user data' }, { status: 500 });
    }

    // Get user tags
    const { data: tags, error: tagsError } = await supabase
      .from('user_tags')
      .select('tag_type')
      .eq('user_id', userId);

    if (tagsError) {
      console.error('Error fetching user tags:', tagsError);
      return NextResponse.json({ success: false, error: 'Error fetching tags' }, { status: 500 });
    }

    // Calculate profile completion - all profile fields
    const profileFields = {
      full_name: !!user.full_name,
      headline: !!user.headline,
      bio: !!user.bio,
      location: !!user.location,
      industry: !!user.industry,
      profile_image: !!user.profile_image_key,
      banner_image: !!user.banner_image_key,
      linkedin_url: !!user.linkedin_url,
      website_url: !!user.website_url,
      username: !!user.username,
      date_of_birth: !!user.date_of_birth
    };

    // Check if user has tags for each type
    const tagTypes = ['job_title', 'goals', 'interests'];
    const hasTags = {
      job_title: tags?.some(tag => tag.tag_type === 'job_title') || false,
      goals: tags?.some(tag => tag.tag_type === 'goals') || false,
      interests: tags?.some(tag => tag.tag_type === 'interests') || false
    };

    // Calculate progress - include all fields
    const totalFields = Object.keys(profileFields).length + tagTypes.length;
    const completedFields = Object.values(profileFields).filter(Boolean).length + 
                           Object.values(hasTags).filter(Boolean).length;
    
    const progressPercentage = Math.round((completedFields / totalFields) * 100);

    // Determine if profile is complete
    const isComplete = progressPercentage === 100;

    // Get missing fields for suggestions
    const missingFields: string[] = [];
    
    Object.entries(profileFields).forEach(([field, completed]) => {
      if (!completed) {
        const fieldNames: Record<string, string> = {
          full_name: 'Full Name',
          headline: 'Headline',
          bio: 'Bio',
          location: 'Location',
          industry: 'Industry',
          profile_image: 'Profile Image',
          banner_image: 'Banner Image',
          linkedin_url: 'LinkedIn URL',
          website_url: 'Website URL',
          username: 'Username',
          date_of_birth: 'Date of Birth'
        };
        missingFields.push(fieldNames[field]);
      }
    });

    Object.entries(hasTags).forEach(([tagType, hasTag]) => {
      if (!hasTag) {
        const tagNames: Record<string, string> = {
          job_title: 'Job Title',
          goals: 'Goals',
          interests: 'Interests'
        };
        missingFields.push(tagNames[tagType]);
      }
    });

    return NextResponse.json({ 
      success: true, 
      progress: {
        percentage: progressPercentage,
        completed: completedFields,
        total: totalFields,
        isComplete,
        missingFields,
        profileFields,
        hasTags
      }
    });

  } catch (error) {
    console.error('Error in GET /api/profile/progress:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
