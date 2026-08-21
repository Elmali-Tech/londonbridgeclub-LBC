import { NextResponse } from 'next/server';
import { createClient } from '@/lib/lbc-data';

// Public endpoint — no auth required (used by membership page)
export async function GET() {
  const lbcData = createClient();
  const { data, error } = await lbcData
    .from('entry_fee_settings')
    .select('*')
    .eq('id', 1)
    .single();

  if (error) return NextResponse.json({ is_active: false, threshold: 50, active_member_count: 0 });

  // Aktif üye sayısını çek (entry fee hesabı için gerekli)
  let activeMemberCount = 0;
  if (data.is_active) {
    const { count } = await lbcData
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active');
    activeMemberCount = count ?? 0;
  }

  return NextResponse.json({ ...data, active_member_count: activeMemberCount });
}
