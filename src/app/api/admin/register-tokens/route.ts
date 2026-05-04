import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { validateToken } from '@/lib/auth';
import { sendInvitationEmail } from '@/lib/nodemailer';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const sessionToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authUser = await validateToken(sessionToken);

    if (!authUser || (!authUser.is_admin && authUser.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { email, token: registerToken } = body;

    if (!email || !registerToken) {
      return NextResponse.json(
        { error: 'Email and token are required' },
        { status: 400 }
      );
    }

    // Check if email already has a token
    const { data: existingToken } = await supabase
      .from('register_tokens')
      .select('*')
      .eq('email', email)
      .eq('used', false)
      .single();

    if (existingToken) {
      return NextResponse.json(
        { error: 'Bu email için zaten aktif bir token var' },
        { status: 400 }
      );
    }

    // Get user id for created_by
    const { data: adminUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', authUser.id)
      .single();

    // Create token
    const { data, error } = await supabase
      .from('register_tokens')
      .insert([
        {
          token: registerToken,
          email,
          used: false,
          created_by: adminUser?.id || null,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating token:', error);
      return NextResponse.json(
        { error: error.message || 'Token oluşturulurken hata oluştu' },
        { status: 500 }
      );
    }

    // Davet maili gönder
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://londonbridge.club';
      const invitationLink = `${baseUrl}/register?token=${registerToken}`;
      await sendInvitationEmail(email, invitationLink);
    } catch (mailError) {
      console.error('Invitation email error:', mailError);
    }

    return NextResponse.json({ token: data }, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/admin/register-tokens:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authUser = await validateToken(token);

    if (!authUser || (!authUser.is_admin && authUser.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('register_tokens')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tokens:', error);
      return NextResponse.json(
        { error: error.message || 'Token\'lar yüklenirken hata oluştu' },
        { status: 500 }
      );
    }

    return NextResponse.json({ tokens: data }, { status: 200 });
  } catch (error: any) {
    console.error('Error in GET /api/admin/register-tokens:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

