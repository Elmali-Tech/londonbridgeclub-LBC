import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Check if token exists and is valid
    const { data, error } = await supabase
      .from('register_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Geçersiz token' },
        { status: 404 }
      );
    }

    if (data.used) {
      return NextResponse.json(
        { error: 'Bu token zaten kullanılmış' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        valid: true, 
        email: data.email 
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error in POST /api/register/verify-token:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

