import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';

// POST endpoint to create a new connection (follow a user)
export async function POST(request: NextRequest) {
  try {
    // Validate the session
    const session = await validateSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { followingId } = await request.json();
    
    if (!followingId) {
      return NextResponse.json(
        { success: false, error: 'Following ID is required' },
        { status: 400 }
      );
    }

    // Prevent users from following themselves
    if (String(session.id) === String(followingId)) {
      return NextResponse.json(
        { success: false, error: 'Cannot follow yourself' },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = createClient();

    // Check if connection already exists
    const { data: existingConnection } = await supabase
      .from('connections')
      .select('*')
      .eq('follower_id', session.id)
      .eq('following_id', followingId)
      .single();

    if (existingConnection) {
      return NextResponse.json(
        { success: false, error: 'Already following this user' },
        { status: 400 }
      );
    }

    // Create new connection
    const { data, error } = await supabase
      .from('connections')
      .insert([
        { 
          follower_id: session.id, 
          following_id: followingId,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      console.error('Error creating connection:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to follow user' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully followed user',
      connection: data[0]
    });
  } catch (error) {
    console.error('Unexpected error in connection creation:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to remove a connection (unfollow a user)
export async function DELETE(request: NextRequest) {
  try {
    // Validate the session
    const session = await validateSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get the following ID from the URL
    const { searchParams } = new URL(request.url);
    const followingId = searchParams.get('followingId');
    
    if (!followingId) {
      return NextResponse.json(
        { success: false, error: 'Following ID is required' },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = createClient();

    // Delete the connection
    const { error } = await supabase
      .from('connections')
      .delete()
      .eq('follower_id', session.id)
      .eq('following_id', followingId);

    if (error) {
      console.error('Error deleting connection:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to unfollow user' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully unfollowed user'
    });
  } catch (error) {
    console.error('Unexpected error in connection deletion:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 