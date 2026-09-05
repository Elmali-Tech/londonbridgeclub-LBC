import type { SupabaseClient } from '@supabase/supabase-js';
import type { User } from '@/types/database';
import { isAdmin } from '@/lib/permissions';

/**
 * What slice of the commission data a user is allowed to see (§7 Permissions):
 *  - admin              → everything.
 *  - opportunity_manager → only projects they own or created (their authorized scope).
 *  - sales_member        → only commission shares assigned to them.
 *  - viewer / everyone else is rejected before this is ever computed.
 */
export type CommissionScope =
  | { kind: 'all' }
  | { kind: 'projects'; projectIds: number[] }
  | { kind: 'self'; userId: number };

/** Resolve the caller's commission read scope. Requires a DB round-trip for managers. */
export async function getCommissionScope(
  supabase: SupabaseClient,
  user: Pick<User, 'id' | 'role' | 'is_admin'>,
): Promise<CommissionScope> {
  if (isAdmin(user)) return { kind: 'all' };

  if (user.role === 'opportunity_manager') {
    const { data } = await supabase
      .from('projects')
      .select('id')
      .or(`owner_id.eq.${user.id},created_by.eq.${user.id}`);
    return { kind: 'projects', projectIds: (data ?? []).map((p) => Number(p.id)) };
  }

  // sales_member (and any other CRM role) sees only their own shares.
  return { kind: 'self', userId: Number(user.id) };
}

/**
 * Can this user create/approve/pay/edit/delete commission data on `projectId`?
 * Sales members are read-only; opportunity managers may only manage projects
 * within their scope; admins may manage anything. Returns false on any doubt.
 */
export async function canManageProjectCommission(
  supabase: SupabaseClient,
  user: Pick<User, 'id' | 'role' | 'is_admin'>,
  projectId: number | string,
): Promise<boolean> {
  if (isAdmin(user)) return true;
  if (user.role !== 'opportunity_manager') return false;

  const { data: project } = await supabase
    .from('projects')
    .select('owner_id, created_by')
    .eq('id', projectId)
    .single();
  if (!project) return false;
  return Number(project.owner_id) === Number(user.id) || Number(project.created_by) === Number(user.id);
}

export type CommissionInput = {
  revenue?: unknown;
  commission_rate_id?: unknown;
  custom_commission_rate?: unknown;
};

export type CommissionFields = {
  revenue: number | null;
  commission_rate_id: number | null;
  custom_commission_rate: number | null;
  effective_rate: number | null;
  commission_amount: number | null;
};

function toNumberOrNull(value: unknown): number | null {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Resolve the commission fields for a project from raw form input.
 *
 * - A custom rate (when provided) wins and clears the standard rate reference.
 * - Otherwise the chosen standard rate's percentage is looked up from the
 *   commission_rates table.
 * - `effective_rate` is a snapshot of the percentage actually used, so later
 *   edits to a library rate never rewrite an existing project's commission.
 * - `commission_amount` is computed as revenue * effective_rate / 100, rounded
 *   to 2 decimal places. It is authoritative here and never trusted from the client.
 */
export async function resolveCommissionFields(
  supabase: SupabaseClient,
  input: CommissionInput,
): Promise<CommissionFields> {
  const revenue = toNumberOrNull(input.revenue);
  const customRate = toNumberOrNull(input.custom_commission_rate);
  const rateId = toNumberOrNull(input.commission_rate_id);

  let commission_rate_id: number | null = null;
  let custom_commission_rate: number | null = null;
  let effective_rate: number | null = null;

  if (customRate !== null && customRate >= 0 && customRate <= 100) {
    // Custom per-project override.
    custom_commission_rate = customRate;
    effective_rate = customRate;
  } else if (rateId !== null) {
    // Standard rate from the library — snapshot its percentage.
    const { data: rate } = await supabase
      .from('commission_rates')
      .select('percentage')
      .eq('id', rateId)
      .single();
    if (rate) {
      commission_rate_id = rateId;
      effective_rate = Number(rate.percentage);
    }
  }

  const commission_amount =
    revenue !== null && effective_rate !== null
      ? Math.round(revenue * effective_rate) / 100 // revenue * (rate/100), rounded to 2dp
      : null;

  return { revenue, commission_rate_id, custom_commission_rate, effective_rate, commission_amount };
}
