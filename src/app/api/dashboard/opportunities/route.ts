import { NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import { callLbcEndpoint, getLbcRows, type LbcListResponse, type LbcProject } from "@/lib/lbc-api";
import { formatCurrencyAmount, parseMoneyValue } from "@/lib/commission";

export const dynamic = "force-dynamic";

type DashboardOpportunity = {
  id: number | string;
  title: string;
  company: string;
  service_detail: string;
  category: string;
  estimated_budget: string;
  description: string | null;
  image_key: string | null;
  is_active: boolean;
  customer_opportunity_id?: number | null;
  created_at: string;
  source: "lbc-api";
  can_record_interest: boolean;
  lbc_project_id?: string;
  lbc_project_no?: string | null;
  lbc_status?: string | null;
};

type MoneyLike = {
  amount?: number | string | null;
  currency?: string | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isMoneyLike = (value: unknown): value is MoneyLike =>
  isRecord(value) && "amount" in value;

const normalizeCurrency = (value?: string | null) => {
  const normalized = value?.trim().toUpperCase();
  if (normalized === "TL") return "TRY";
  return normalized || "TRY";
};

const formatLbcMoney = (value: unknown, fallbackCurrency = "TRY") => {
  if (isMoneyLike(value)) {
    const amount = parseMoneyValue(value.amount);
    if (amount === null) return "TBA";
    return formatCurrencyAmount(amount, normalizeCurrency(value.currency || fallbackCurrency));
  }

  const amount = parseMoneyValue(value);
  if (amount === null) return "TBA";
  return formatCurrencyAmount(amount, normalizeCurrency(fallbackCurrency));
};

const isActiveLbcProject = (status?: string | null) => {
  const normalized = (status || "").toLocaleLowerCase("tr-TR");
  return !normalized.includes("kaybedildi");
};

function mapLbcProject(project: LbcProject): DashboardOpportunity {
  const title = project.name || project.project_no || "LBC Project";
  const category = project.category || project.sector || "Project";
  const status = project.status || "Pipeline";
  const budget = formatLbcMoney(project.revenue, "TRY");
  const commission = formatLbcMoney(project.commission_amount, "TRY");
  const details = [
    project.project_no ? `Project No: ${project.project_no}` : null,
    `Status: ${status}`,
    project.sector ? `Sector: ${project.sector}` : null,
    project.period ? `Period: ${project.period}` : null,
    commission !== "TBA" ? `LBC Commission: ${commission}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    id: project.id,
    title,
    company: project.project_no || "London Bridge Club",
    service_detail: status,
    category,
    estimated_budget: budget,
    description: details || null,
    image_key: null,
    is_active: isActiveLbcProject(project.status),
    customer_opportunity_id: null,
    created_at: project.created_at || project.start_date || new Date().toISOString(),
    source: "lbc-api",
    can_record_interest: false,
    lbc_project_id: project.id,
    lbc_project_no: project.project_no || null,
    lbc_status: project.status || null,
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const projectsResult = await callLbcEndpoint<LbcListResponse<LbcProject>>(
      "/projects",
    );
    const lbcOpportunities = projectsResult.success
      ? getLbcRows<LbcProject>(projectsResult.data).map(mapLbcProject)
      : [];

    if (!projectsResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: projectsResult.error || "LBC projects endpoint failed",
          code: projectsResult.bodyError?.code || "LBC_PROJECTS_UNAVAILABLE",
        },
        { status: projectsResult.status >= 400 ? projectsResult.status : 502 },
      );
    }
    const lbcMatch = id
      ? lbcOpportunities.find((opportunity) => opportunity.id === id)
      : null;

    if (id && lbcMatch) {
      return NextResponse.json({
        success: true,
        opportunity: lbcMatch,
        dataSources: {
          primary: "lbc-api",
          lbc: { endpoint: "/projects", count: lbcOpportunities.length },
        },
      });
    }

    if (!id && lbcOpportunities.length > 0) {
      return NextResponse.json({
        success: true,
        opportunities: lbcOpportunities,
        dataSources: {
          primary: "lbc-api",
          lbc: { endpoint: "/projects", count: lbcOpportunities.length },
        },
      });
    }

    if (id) {
      return NextResponse.json(
        { success: false, error: "Opportunity not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      opportunities: lbcOpportunities,
      dataSources: {
        primary: "lbc-api",
        lbc: {
          endpoint: "/projects",
          count: lbcOpportunities.length,
        },
      },
    });
  } catch (error) {
    console.error("Dashboard opportunities error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load opportunities" },
      { status: 500 },
    );
  }
}
