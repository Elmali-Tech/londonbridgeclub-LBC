import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { validateToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateToken(token);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    // Get user_id from query params, default to current user
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('user_id');
    const userId = targetUserId ? parseInt(targetUserId) : user.id;

    const supabase = createClient();
    
    // Get user tags
    const { data: tags, error } = await supabase
      .from('user_tags')
      .select('*')
      .eq('user_id', userId)
      .order('tag_type', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching user tags:', error);
      return NextResponse.json({ success: false, error: 'Error fetching tags' }, { status: 500 });
    }

    // Group tags by type
    const groupedTags = {
      job_title: tags?.filter(tag => tag.tag_type === 'job_title').map(tag => tag.tag_value) || [],
      goals: tags?.filter(tag => tag.tag_type === 'goals').map(tag => tag.tag_value) || [],
      interests: tags?.filter(tag => tag.tag_type === 'interests').map(tag => tag.tag_value) || []
    };

    return NextResponse.json({ 
      success: true, 
      tags: groupedTags 
    });

  } catch (error) {
    console.error('Error in GET /api/user-tags:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateToken(token);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    const userId = user.id;

    const body = await request.json();
    const { tag_type, tag_value } = body;

    // Validate input
    if (!tag_type || !tag_value) {
      return NextResponse.json({ success: false, error: 'Tag type and value required' }, { status: 400 });
    }

    if (!['job_title', 'goals', 'interests'].includes(tag_type)) {
      return NextResponse.json({ success: false, error: 'Invalid tag type' }, { status: 400 });
    }

    if (tag_value.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Tag value cannot be empty' }, { status: 400 });
    }

    const supabase = createClient();
    
    // Check if tag already exists
    const { data: existingTag } = await supabase
      .from('user_tags')
      .select('id')
      .eq('user_id', userId)
      .eq('tag_type', tag_type)
      .eq('tag_value', tag_value.trim())
      .single();

    if (existingTag) {
      return NextResponse.json({ success: false, error: 'This tag already exists' }, { status: 400 });
    }

    // Insert new tag
    const { data: newTag, error } = await supabase
      .from('user_tags')
      .insert({
        user_id: userId,
        tag_type,
        tag_value: tag_value.trim()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user tag:', error);
      return NextResponse.json({ success: false, error: 'Error creating tag' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      tag: newTag 
    });

  } catch (error) {
    console.error('Error in POST /api/user-tags:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateToken(token);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    const userId = user.id;

    const { searchParams } = new URL(request.url);
    const tagId = searchParams.get('tag_id');
    const tagType = searchParams.get('tag_type');
    const tagValue = searchParams.get('tag_value');

    const supabase = createClient();
    
    // Delete tag by ID or by type+value
    if (tagId) {
      // Delete by ID
      const { error } = await supabase
        .from('user_tags')
        .delete()
        .eq('id', tagId)
        .eq('user_id', userId); // Ensure user can only delete their own tags

      if (error) {
        console.error('Error deleting user tag by ID:', error);
        return NextResponse.json({ success: false, error: 'Error deleting tag' }, { status: 500 });
      }
    } else if (tagType && tagValue) {
      // Delete by type and value
      const { error } = await supabase
        .from('user_tags')
        .delete()
        .eq('user_id', userId)
        .eq('tag_type', tagType)
        .eq('tag_value', tagValue);

      if (error) {
        console.error('Error deleting user tag by type+value:', error);
        return NextResponse.json({ success: false, error: 'Error deleting tag' }, { status: 500 });
      }
    } else {
      return NextResponse.json({ success: false, error: 'Tag ID or tag type+value required' }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Tag deleted successfully' 
    });

  } catch (error) {
    console.error('Error in DELETE /api/user-tags:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
