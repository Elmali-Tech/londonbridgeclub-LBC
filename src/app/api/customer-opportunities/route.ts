import { NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import { callLbcEndpoint } from "@/lib/lbc-api";
import { getLbcKpiOpportunityRows } from "@/lib/lbc-kpi-adapter";
import { resolveCommissionFields } from "@/lib/commission";
import type { DealValuationPeriod, User } from "@/types/database";

type RequestBody = Record<string, unknown>;

const DEAL_VALUATION_PERIODS: DealValuationPeriod[] = [
  "one_time",
  "monthly",
  "quarterly",
  "six_months",
  "annual",
];

const canManage = (user: User | null) =>
  Boolean(
    user?.is_admin ||
      user?.role === "admin" ||
      user?.role === "opportunity_manager",
  );

const canSubmit = (user: User | null) =>
  Boolean(user && (canManage(user) || user.is_approved));

const getString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const getNullableString = (value: unknown) => getString(value) || null;

const normalizeRecordType = (value: unknown) =>
  value === "opportunity" ? "opportunity" : "lead";

const normalizeDealStage = (value: unknown, recordType: string) => {
  const stage = getString(value);
  if (!stage || stage === "Prospect") {
    return recordType === "opportunity" ? "Qualified" : "Lead";
  }
  return stage === "Opportunity" ? "Qualified" : stage;
};

const normalizeDealValuationPeriod = (value: unknown): DealValuationPeriod =>
  DEAL_VALUATION_PERIODS.includes(value as DealValuationPeriod)
    ? (value as DealValuationPeriod)
    : "one_time";

function buildProjectPayload(body: RequestBody, session: User) {
  const recordType = normalizeRecordType(body.record_type);
  const customerName = getString(body.customer_name);
  const companyName = getString(body.company_name) || customerName;
  const name = getString(body.opportunity_title);

  if (!customerName || !companyName || !name) {
    throw new Error("MISSING_REQUIRED_FIELDS");
  }

  const financials = resolveCommissionFields({
    estimatedDealSize: body.estimated_deal_size,
    estimatedDealValue: body.estimated_deal_value,
    commissionRate: body.commission_rate,
    commissionRatePercent: body.commission_rate_percent,
    lbcCommission: body.lbc_commission,
    lbcCommissionAmount: body.lbc_commission_amount,
    currencyCode: getString(body.currency_code) || undefined,
  });
  const status = canManage(session) ? getString(body.status) || "Active" : "Active";

  return {
    name,
    project_no: getNullableString(body.project_no),
    type: recordType,
    category: recordType,
    status,
    stage: normalizeDealStage(body.deal_stage, recordType),
    description: getNullableString(body.opportunity_description),
    customer_name: customerName,
    company_name: companyName,
    contact_person: getNullableString(body.contact_person),
    referrer_name:
      getNullableString(body.referral_source) ||
      getNullableString(body.reference_person),
    partner_id: getNullableString(body.partner_id),
    partner_name: getNullableString(body.partner_name),
    revenue: {
      amount: financials.estimatedDealValue,
      currency: financials.currencyCode,
      label: getNullableString(body.estimated_deal_size),
      period: normalizeDealValuationPeriod(body.deal_valuation_period),
    },
    commission_rate: financials.commissionRatePercent,
    commission_amount: {
      amount: financials.lbcCommissionAmount,
      currency: financials.currencyCode,
    },
    expected_closing_date: getNullableString(body.expected_closing_date),
    lead_manager: getNullableString(body.responsible_person) || session.full_name,
    owner_member_id: session.lbc_record_id || session.lbc_member_id || null,
    source: "lbc-web",
  };
}

export async function GET(request: Request) {
  try {
    const session = await validateSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const result = await getLbcKpiOpportunityRows();
    if (result.errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch LBC projects",
          code: "LBC_PROJECTS_UNAVAILABLE",
          details: result.errors,
        },
        { status: 502 },
      );
    }

    const opportunities = canManage(session)
      ? result.rows
      : result.rows.filter(
          (row) =>
            row.responsible_person === session.full_name ||
            row.created_by_user?.email === session.email,
        );

    return NextResponse.json({
      success: true,
      opportunities,
      dataSource: { primary: "lbc-api", endpoint: "/projects" },
    });
  } catch (error) {
    console.error("LBC projects API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await validateSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
    if (!canSubmit(session)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const body = (await request.json()) as RequestBody;
    const payload = buildProjectPayload(body, session);
    const result = await callLbcEndpoint("/projects", {
      logicalMethod: "POST",
      payload,
      idempotencyKey:
        request.headers.get("idempotency-key") ||
        `project:${session.lbc_record_id || session.id}:${payload.name}`,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "LBC project creation failed",
          code: result.bodyError?.code || "LBC_PROJECT_CREATE_FAILED",
          details: result.bodyError?.details,
        },
        { status: result.status >= 400 ? result.status : 502 },
      );
    }

    return NextResponse.json({ success: true, opportunity: result.data });
  } catch (error) {
    if (error instanceof Error && error.message === "MISSING_REQUIRED_FIELDS") {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }
    console.error("LBC project creation error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
