import { NextRequest, NextResponse } from 'next/server';
import { LbcMember } from '@/lib/lbc-api';
import { getLbcMembers } from '@/lib/lbc-auth';
import { mapLbcMemberToDashboardMember } from '@/lib/lbc-members';

type LbcMemberWithBirthday = LbcMember & {
  date_of_birth?: string | null;
  birth_date?: string | null;
  birthday?: string | null;
};

function getLbcBirthday(member: LbcMemberWithBirthday) {
  return member.date_of_birth || member.birth_date || member.birthday || null;
}

export async function GET(req: NextRequest) {
  try {
    // Get today's month and day
    const today = new Date();
    const month = today.getMonth() + 1; // JavaScript months are 0-indexed
    const day = today.getDate();

    const users = (await getLbcMembers())
        .filter((member) => {
          const birthday = getLbcBirthday(member as LbcMemberWithBirthday);
          if (!birthday) return false;

          const birthDate = new Date(birthday);
          return birthDate.getMonth() + 1 === month && birthDate.getDate() === day;
        })
        .map((member) => ({
          ...mapLbcMemberToDashboardMember(member),
          date_of_birth: getLbcBirthday(member as LbcMemberWithBirthday),
        }));

    return NextResponse.json({
      users,
      count: users.length,
      dataSource: { primary: 'lbc-api', endpoint: '/members' },
    });

  } catch (error) {
    console.error('Error in birthdays API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
