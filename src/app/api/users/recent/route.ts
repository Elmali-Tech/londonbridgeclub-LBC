import { NextRequest, NextResponse } from 'next/server';
import { getLbcMembers } from '@/lib/lbc-auth';
import { mapLbcMemberToDashboardMember } from '@/lib/lbc-members';

export async function GET(req: NextRequest) {
  try {
    const users = (await getLbcMembers())
        .sort((a, b) => {
          const bDate = new Date(b.membership_start || b.created_at || 0).getTime();
          const aDate = new Date(a.membership_start || a.created_at || 0).getTime();
          return bDate - aDate;
        })
        .slice(0, 4)
        .map(mapLbcMemberToDashboardMember);

    return NextResponse.json({
      users,
      count: users.length,
      dataSource: { primary: 'lbc-api', endpoint: '/members' },
    });

  } catch (error) {
    console.error('Error in recent users API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
