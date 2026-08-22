// Generic Draft -> Pending Review -> Approved/Revision Requested -> Published -> Archived
// workflow, extracted from the Benefits/Partners routes so a third module (Proposals) can
// reuse it instead of copy-pasting the submit/approve/request-revision/archive handlers again.
// Any table using this must have: `review_status`, `submitted_by`, `submitted_at`,
// `reviewed_by`, `reviewed_at`, `revision_notes` columns matching the `WorkflowStatus` values.

import { createClient } from './supabase';
import { sendReviewDecisionEmail, sendSystemNotification } from './nodemailer';

export interface WorkflowConfig {
  /** Table name, e.g. "proposals". */
  table: string;
  /** Singular, lowercase entity name used in error/notification copy, e.g. "proposal". */
  entityLabel: string;
  /** Column used as the record's display name in notifications, e.g. "title". */
  labelField: string;
}

export interface WorkflowResult<T = Record<string, unknown>> {
  data?: T;
  error?: string;
  status: number;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

async function notifySubmitter(
  supabase: ReturnType<typeof createClient>,
  submittedBy: number | null | undefined,
  decision: 'approved' | 'revision_requested',
  entityLabel: string,
  notes?: string
) {
  if (!submittedBy) return;
  try {
    const { data: submitter } = await supabase.from('users').select('email, full_name').eq('id', submittedBy).single();
    if (submitter?.email) {
      await sendReviewDecisionEmail(submitter.email, submitter.full_name, decision, notes, entityLabel);
    }
  } catch (notifyError) {
    console.error('Notification error:', notifyError);
  }
}

export async function submitForReview(config: WorkflowConfig, id: string, actorId: number, actorName: string): Promise<WorkflowResult> {
  const supabase = createClient();
  const { data: existing, error: fetchError } = await supabase
    .from(config.table)
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !existing) {
    return { error: `${capitalize(config.entityLabel)} not found`, status: 404 };
  }
  if (existing.review_status !== 'draft' && existing.review_status !== 'revision_requested') {
    return { error: `Cannot submit a ${config.entityLabel} with status "${existing.review_status}" for review`, status: 400 };
  }

  const { data, error } = await supabase
    .from(config.table)
    .update({ review_status: 'pending_review', submitted_by: actorId, submitted_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error(`Error submitting ${config.entityLabel} for review:`, error);
    return { error: 'Failed to submit for review', status: 500 };
  }

  try {
    await sendSystemNotification(
      `${capitalize(config.entityLabel)} Submitted for Review`,
      `"${existing[config.labelField]}" was submitted for review by ${actorName}.`
    );
  } catch (notifyError) {
    console.error('Notification error:', notifyError);
  }

  return { data, status: 200 };
}

export async function approveRecord(config: WorkflowConfig, id: string, actorId: number, actorName: string): Promise<WorkflowResult> {
  const supabase = createClient();
  const { data: existing, error: fetchError } = await supabase
    .from(config.table)
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !existing) {
    return { error: `${capitalize(config.entityLabel)} not found`, status: 404 };
  }
  if (existing.review_status !== 'pending_review') {
    return { error: `Cannot approve a ${config.entityLabel} with status "${existing.review_status}"`, status: 400 };
  }

  const { data, error } = await supabase
    .from(config.table)
    .update({ review_status: 'published', reviewed_by: actorId, reviewed_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error(`Error approving ${config.entityLabel}:`, error);
    return { error: `Failed to approve ${config.entityLabel}`, status: 500 };
  }

  await notifySubmitter(supabase, existing.submitted_by, 'approved', config.entityLabel);
  try {
    await sendSystemNotification(
      `${capitalize(config.entityLabel)} Approved`,
      `"${existing[config.labelField]}" was approved by ${actorName}.`
    );
  } catch (notifyError) {
    console.error('Notification error:', notifyError);
  }

  return { data, status: 200 };
}

export async function requestRevision(config: WorkflowConfig, id: string, actorId: number, actorName: string, notes: string): Promise<WorkflowResult> {
  if (!notes || !notes.trim()) {
    return { error: 'Revision notes are required', status: 400 };
  }

  const supabase = createClient();
  const { data: existing, error: fetchError } = await supabase
    .from(config.table)
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !existing) {
    return { error: `${capitalize(config.entityLabel)} not found`, status: 404 };
  }
  if (existing.review_status !== 'pending_review') {
    return { error: `Cannot request revision on a ${config.entityLabel} with status "${existing.review_status}"`, status: 400 };
  }

  const { data, error } = await supabase
    .from(config.table)
    .update({ review_status: 'revision_requested', revision_notes: notes, reviewed_by: actorId, reviewed_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error(`Error requesting revision on ${config.entityLabel}:`, error);
    return { error: 'Failed to request revision', status: 500 };
  }

  await notifySubmitter(supabase, existing.submitted_by, 'revision_requested', config.entityLabel, notes);
  try {
    await sendSystemNotification(
      `${capitalize(config.entityLabel)} Revision Requested`,
      `"${existing[config.labelField]}" was sent back for revision by ${actorName}: ${notes}`
    );
  } catch (notifyError) {
    console.error('Notification error:', notifyError);
  }

  return { data, status: 200 };
}

export async function archiveRecord(config: WorkflowConfig, id: string): Promise<WorkflowResult> {
  const supabase = createClient();
  const { data: existing, error: fetchError } = await supabase
    .from(config.table)
    .select('id, review_status')
    .eq('id', id)
    .single();

  if (fetchError || !existing) {
    return { error: `${capitalize(config.entityLabel)} not found`, status: 404 };
  }
  if (existing.review_status !== 'published') {
    return { error: `Cannot archive a ${config.entityLabel} with status "${existing.review_status}"`, status: 400 };
  }

  const { data, error } = await supabase.from(config.table).update({ review_status: 'archived' }).eq('id', id).select().single();

  if (error) {
    console.error(`Error archiving ${config.entityLabel}:`, error);
    return { error: `Failed to archive ${config.entityLabel}`, status: 500 };
  }

  return { data, status: 200 };
}
