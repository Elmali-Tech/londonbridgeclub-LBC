import { parseMoneyValue, parsePercentValue } from "@/lib/commission";
import type { LbcEndpoint, LbcListResponse, LbcProject } from "@/lib/lbc-api";
import { callLbcEndpoint, getLbcRows } from "@/lib/lbc-api";
import type { KpiDashboardOpportunityRow } from "@/lib/kpi-dashboard";

type MoneyLike = {
  amount?: number | string | null;
  currency?: string | null;
};

type LbcKpiRowsResult = {
  rows: KpiDashboardOpportunityRow[];
  errors: string[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const clean = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : "";

const firstText = (
  record: Record<string, unknown>,
  keys: string[],
  fallback = "",
) => {
  for (const key of keys) {
    const value = clean(record[key]);
    if (value) return value;
  }

  return fallback;
};

const firstDate = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = clean(record[key]);
    if (value && !Number.isNaN(Date.parse(value))) return value;
  }

  return null;
};

const normalizeCurrency = (value?: string | null) => {
  const normalized = value?.trim().toUpperCase();
  if (normalized === "TL") return "TRY";
  return normalized || "TRY";
};

const extractMoney = (
  value: unknown,
  fallbackCurrency = "TRY",
): { amount: number | null; currency: string } => {
  if (isRecord(value) && "amount" in value) {
    const money = value as MoneyLike;
    return {
      amount: parseMoneyValue(money.amount),
      currency: normalizeCurrency(money.currency || fallbackCurrency),
    };
  }

  return {
    amount: parseMoneyValue(value),
    currency: normalizeCurrency(fallbackCurrency),
  };
};

const stableNumericId = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return 1_500_000_000 + (hash % 400_000_000);
};

const normalizeProjectStatus = (status?: string | null) => {
  const normalized = (status || "").toLocaleLowerCase("tr-TR");
  if (
    normalized.includes("won") ||
    normalized.includes("kazan") ||
    normalized.includes("closed won")
  ) {
    return "Won";
  }
  if (
    normalized.includes("lost") ||
    normalized.includes("kaybed") ||
    normalized.includes("cancel") ||
    normalized.includes("iptal")
  ) {
    return "Lost";
  }

  return "Active";
};

const normalizeProjectStage = (
  rawStage: string,
  rawStatus?: string | null,
) => {
  const status = normalizeProjectStatus(rawStatus);
  if (status === "Won" || status === "Lost") return status;

  const normalized = rawStage.toLocaleLowerCase("tr-TR");
  if (normalized.includes("negotiation") || normalized.includes("müzakere")) {
    return "Negotiation";
  }
  if (normalized.includes("proposal") || normalized.includes("teklif")) {
    return "Proposal";
  }
  if (
    normalized.includes("qualified") ||
    normalized.includes("opportunity") ||
    normalized.includes("fırsat")
  ) {
    return "Qualified";
  }

  return "Lead";
};

export function mapLbcProjectToKpiRow(project: LbcProject): KpiDashboardOpportunityRow {
  const raw = project as unknown as Record<string, unknown>;
  const revenue = extractMoney(
    project.revenue ?? raw.deal_value ?? raw.estimated_deal_value,
    clean(raw.currency) || "TRY",
  );
  const commission = extractMoney(
    project.commission_amount ?? project.lbc_revenue ?? raw.lbc_commission_amount,
    revenue.currency,
  );
  const projectId = clean(project.id) || clean(project.project_no) || clean(project.name);
  const title = project.name || project.project_no || "LBC Project";
  const companyName = firstText(
    raw,
    ["company_name", "business_name", "client_name", "customer_company_name"],
    project.project_no || "London Bridge Club",
  );
  const customerName = firstText(
    raw,
    ["customer_name", "member_name", "client_name", "representative_name"],
    companyName,
  );
  const sector = project.sector || firstText(raw, ["sector", "industry"], "Unspecified");
  const rawStage = firstText(raw, ["stage", "deal_stage"], project.status || "");
  const rawStatus = project.status || firstText(raw, ["status"], "");
  const partnerName = firstText(raw, ["partner_name", "business_partner_name"], "");

  return {
    id: stableNumericId(projectId || title),
    record_type: firstText(raw, ["record_type", "type"], "project"),
    customer_name: customerName,
    company_name: companyName,
    opportunity_title: title,
    opportunity_description: firstText(raw, ["description", "about"], ""),
    estimated_deal_value: revenue.amount,
    currency_code: revenue.currency,
    referral_source: firstText(raw, ["referrer_name", "referral_source", "member_name"], ""),
    commission_rate_percent:
      parsePercentValue(project.commission_rate ?? raw.commission_rate_percent) ?? null,
    lbc_commission_amount: commission.amount,
    deal_stage: normalizeProjectStage(rawStage, rawStatus),
    responsible_person: firstText(raw, ["lead_manager", "owner_name", "responsible_person"], "LBC API"),
    expected_closing_date: firstDate(raw, [
      "expected_closing_date",
      "target_close_date",
      "closing_date",
      "end_date",
    ]),
    status: normalizeProjectStatus(rawStatus),
    created_at: project.created_at || project.start_date || null,
    updated_at: clean(raw.updated_at) || null,
    customer: {
      name: customerName,
      company_name: companyName,
      reference_person: firstText(raw, ["referrer_name", "referral_source", "member_name"], ""),
    },
    business_partner: partnerName
      ? {
          id: null,
          name: partnerName,
          commission_rate_percent:
            parsePercentValue(project.commission_rate ?? raw.commission_rate_percent) ?? null,
        }
      : null,
    created_by_user: {
      full_name: firstText(raw, ["owner_name", "lead_manager", "responsible_person"], "LBC API"),
      email: null,
      industry: sector,
      lbc_sector: sector,
    },
  };
}

export async function getLbcKpiOpportunityRows(): Promise<LbcKpiRowsResult> {
  const errors: string[] = [];
  const projectsResult = await callLbcEndpoint<LbcListResponse<LbcProject>>(
    "/projects" as LbcEndpoint,
  );

  if (!projectsResult.success) {
    errors.push(projectsResult.error || projectsResult.statusText || "/projects failed");
  }

  return {
    rows: projectsResult.success
      ? getLbcRows<LbcProject>(projectsResult.data).map(mapLbcProjectToKpiRow)
      : [],
    errors,
  };
}
