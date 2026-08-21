import { NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import {
  buildKpiDashboardData,
  type KpiDashboardFilters,
} from "@/lib/kpi-dashboard";
import { getLbcKpiOpportunityRows } from "@/lib/lbc-kpi-adapter";
import type { User } from "@/types/database";

export const dynamic = "force-dynamic";

const canReadAdminKpi = (user: User | null) =>
  Boolean(
    user &&
      (user.is_admin ||
        user.role === "admin" ||
        user.role === "opportunity_manager" ||
        user.role === "sales_member" ||
        user.role === "viewer"),
  );

const canViewAllKpiRows = (user: User | null) =>
  Boolean(
    user &&
      (user.is_admin ||
        user.role === "admin" ||
        user.role === "opportunity_manager"),
  );

const getQueryParam = (params: URLSearchParams, key: string) => {
  const value = params.get(key)?.trim();
  return value || null;
};

const getFilters = (
  params: URLSearchParams,
  session: User,
  canViewAll: boolean,
): KpiDashboardFilters => {
  const requestedScope = getQueryParam(params, "scope");
  return {
    from: getQueryParam(params, "from"),
    to: getQueryParam(params, "to"),
    userId: canViewAll ? getQueryParam(params, "userId") : String(session.id),
    leadManager: getQueryParam(params, "leadManager"),
    member: getQueryParam(params, "member"),
    sector: getQueryParam(params, "sector"),
    company: getQueryParam(params, "company"),
    stage: getQueryParam(params, "stage"),
    status: getQueryParam(params, "status"),
    partnerId: getQueryParam(params, "partnerId"),
    scope: requestedScope === "mine" ? "mine" : "all",
  };
};

export async function GET(request: Request) {
  try {
    const session = await validateSession(request);
    if (!session || !canReadAdminKpi(session)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const canViewAll = canViewAllKpiRows(session);
    const filters = getFilters(
      new URL(request.url).searchParams,
      session,
      canViewAll,
    );
    const lbcResult = await getLbcKpiOpportunityRows();
    if (lbcResult.errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "LBC KPI data is unavailable",
          code: "LBC_PROJECTS_UNAVAILABLE",
          details: lbcResult.errors,
        },
        { status: 502 },
      );
    }

    const dashboard = buildKpiDashboardData({
      rows: lbcResult.rows,
      visibleRows: canViewAll ? lbcResult.rows : [],
      users: [],
      filters,
      source: "lbc-api",
      dataSource: "lbc",
    });
    dashboard.meta.caveats.push(
      "User/referrer/partner filters require canonical IDs in the LBC /projects response.",
    );

    return NextResponse.json(dashboard);
  } catch (error) {
    console.error("Admin KPI dashboard error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load KPI dashboard" },
      { status: 500 },
    );
  }
}
