import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function GET() {
  try {
    // Create Supabase client
    const supabase = createClient();

    // Create connections table if it doesn't exist
    const { error } = await supabase.rpc('create_connections_table');

    if (error) {
      console.error('Error creating connections table:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create connections table' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Connections table created or already exists'
    });
  } catch (error) {
    console.error('Unexpected error creating connections table:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 