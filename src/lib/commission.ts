import type { SupabaseClient } from '@supabase/supabase-js';

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
