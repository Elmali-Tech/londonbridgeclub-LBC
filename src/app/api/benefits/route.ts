import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateSession } from '@/lib/auth';

interface Benefit {
  id: number;
  title: string;
  description: string;
  category: string;
  partner_name: string | null;
  partner_website: string | null;
  discount_percentage: number | null;
  discount_code: string | null;
  valid_until: string | null;
  terms_conditions: string | null;
  is_active: boolean;
  image_key: string | null;
  created_at: string;
}

// GET - List active benefits for users
export async function GET(request: Request) {
  try {
    // Validate session (any authenticated user)
    const session = await validateSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Create Supabase client
    const supabase = createClient();

    // Fetch active benefits
    const { data: benefits, error } = await supabase
      .from('benefits')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching benefits:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch benefits' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, benefits: benefits as Benefit[] });
  } catch (error) {
    console.error('Error in benefits API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 