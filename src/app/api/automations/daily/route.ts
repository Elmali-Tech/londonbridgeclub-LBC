import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { sendDailyDigestEmail } from '@/lib/nodemailer';
import {
  getMeetingsTomorrow,
  getOverdueReminders,
  getOverdueTasks,
  getRemindersDueToday,
  getTasksDueToday,
} from '@/lib/automations';

const CRM_ROLES = ['admin', 'opportunity_manager', 'sales_member'];

function requireCronSecret(request: NextRequest): NextResponse | null {
  const auth = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

// POST - Send each CRM-role user a digest of their overdue/due-today tasks and reminders,
// plus a heads-up on any meeting they created that's tomorrow. Triggered by an external
// scheduler (not a logged-in user), so it's gated by CRON_SECRET instead of a session.
export async function POST(request: NextRequest) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  try {
    const [overdueTasks, tasksDueToday, overdueReminders, remindersDueToday, meetingsTomorrow] = await Promise.all([
      getOverdueTasks(),
      getTasksDueToday(),
      getOverdueReminders(),
      getRemindersDueToday(),
      getMeetingsTomorrow(),
    ]);

    const supabase = createClient();
    const { data: users } = await supabase.from('users').select('id, email, full_name').in('role', CRM_ROLES);

    let sent = 0;
    let skipped = 0;

    for (const user of users || []) {
      if (!user.email) continue;

      const items = {
        overdueTasks: overdueTasks.filter((t) => t.assigned_to === user.id),
        tasksDueToday: tasksDueToday.filter((t) => t.assigned_to === user.id),
        overdueReminders: overdueReminders.filter((r) => r.assigned_to === user.id),
        remindersDueToday: remindersDueToday.filter((r) => r.assigned_to === user.id),
        meetingsTomorrow: meetingsTomorrow.filter((m) => m.created_by === user.id),
      };

      const hasContent = Object.values(items).some((list) => list.length > 0);
      if (!hasContent) {
        skipped++;
        continue;
      }

      await sendDailyDigestEmail(user.email, user.full_name, items);
      sent++;
    }

    return NextResponse.json({ success: true, sent, skipped });
  } catch (error) {
    console.error('POST /api/automations/daily error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
