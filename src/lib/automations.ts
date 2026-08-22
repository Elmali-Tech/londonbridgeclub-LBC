// Shared "what needs attention" queries, reused by both the automation email routes
// (src/app/api/automations/*) and the admin dashboard summary (used for overdue tasks and
// pending approvals), so the definition of "overdue" / "pending" is consistent everywhere.

import { createClient } from './supabase';
import type { Meeting, Proposal, Reminder, Task } from '@/types/database';

const todayStr = () => new Date().toISOString().slice(0, 10);

const addDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export async function getOverdueTasks(): Promise<Task[]> {
  const supabase = createClient();
  const { data } = await supabase.from('tasks').select('*').neq('status', 'Done').lt('due_date', todayStr());
  return data || [];
}

export async function getTasksDueToday(): Promise<Task[]> {
  const supabase = createClient();
  const { data } = await supabase.from('tasks').select('*').neq('status', 'Done').eq('due_date', todayStr());
  return data || [];
}

export async function getOverdueReminders(): Promise<Reminder[]> {
  const supabase = createClient();
  const { data } = await supabase.from('reminders').select('*').eq('is_completed', false).lt('due_date', todayStr());
  return data || [];
}

export async function getRemindersDueToday(): Promise<Reminder[]> {
  const supabase = createClient();
  const { data } = await supabase.from('reminders').select('*').eq('is_completed', false).eq('due_date', todayStr());
  return data || [];
}

export async function getMeetingsTomorrow(): Promise<Meeting[]> {
  const supabase = createClient();
  const { data } = await supabase.from('meetings').select('*').eq('meeting_date', addDays(1));
  return data || [];
}

export async function getPendingApprovalsCount(): Promise<number> {
  const supabase = createClient();
  const [benefits, partners, proposals] = await Promise.all([
    supabase.from('benefits').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
    supabase.from('partners').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
    supabase.from('proposals').select('id', { count: 'exact', head: true }).eq('review_status', 'pending_review'),
  ]);
  return (benefits.count || 0) + (partners.count || 0) + (proposals.count || 0);
}

export async function getStaleDraftProposals(days = 3): Promise<Proposal[]> {
  const supabase = createClient();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const { data } = await supabase
    .from('proposals')
    .select('*')
    .eq('review_status', 'draft')
    .lt('created_at', cutoff.toISOString());
  return data || [];
}

export async function getOpportunitiesMissingData() {
  const supabase = createClient();
  const { data } = await supabase
    .from('customer_opportunities')
    .select('id, company_name, opportunity_title, estimated_deal_size, expected_closing_date')
    .eq('status', 'Active')
    .or('estimated_deal_size.is.null,expected_closing_date.is.null');
  return data || [];
}
