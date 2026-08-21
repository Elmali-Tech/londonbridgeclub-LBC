import { NextResponse } from "next/server";
import { GBP_RATE_DATE, getMoneyValueInGBP } from "@/lib/currency";
import { getLbcDashboardSnapshot, type LbcProject } from "@/lib/lbc-api";

export const dynamic = "force-dynamic";

type MoneyLike = {
  amount?: number | string | null;
  currency?: string | null;
};

const isMoneyLike = (value: unknown): value is MoneyLike =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  "amount" in value;

const projectValueInGBP = (project: LbcProject) => {
  if (isMoneyLike(project.revenue)) {
    return getMoneyValueInGBP(
      project.revenue.amount,
      project.revenue.currency || "TRY",
    );
  }
  return getMoneyValueInGBP(project.revenue, "TRY");
};

const isWon = (status?: string | null) => {
  const normalized = (status || "").toLocaleLowerCase("tr-TR");
  return normalized.includes("won") || normalized.includes("kazan");
};

const isActive = (status?: string | null) => {
  const normalized = (status || "").toLocaleLowerCase("tr-TR");
  return !normalized.includes("lost") && !normalized.includes("kaybed");
};

export async function GET() {
  try {
    const snapshot = await getLbcDashboardSnapshot();
    if (snapshot.errors.length > 0 ||
        (snapshot.members.length === 0 && snapshot.projects.length === 0)) {
      return NextResponse.json(
        {
          success: false,
          error: "LBC landing metrics are unavailable",
          code: "LBC_DASHBOARD_UNAVAILABLE",
          details: snapshot.errors,
        },
        { status: 502 },
      );
    }

    const currentYear = new Date().getUTCFullYear();
    const yearStart = new Date(Date.UTC(currentYear, 0, 1));
    const yearlyProjects = snapshot.projects.filter((project) => {
      const createdAt = project.created_at || project.start_date;
      return createdAt ? new Date(createdAt) >= yearStart : false;
    });
    const yearlyOpportunityVolume = yearlyProjects.reduce(
      (total, project) => total + projectValueInGBP(project),
      0,
    );
    const yearlyWonVolume = yearlyProjects
      .filter((project) => isWon(project.status))
      .reduce((total, project) => total + projectValueInGBP(project), 0);
    const businessNames = new Set(
      snapshot.projects
        .flatMap((project) => {
          const raw = project as unknown as Record<string, unknown>;
          return [raw.partner_name, raw.business_name, raw.company_name];
        })
        .filter((value): value is string =>
          typeof value === "string" && Boolean(value.trim()),
        )
        .map((value) => value.trim().toLocaleLowerCase("tr-TR")),
    );

    return NextResponse.json({
      success: true,
      metrics: {
        members: snapshot.members.length,
        activeMembers: snapshot.members.length,
        partnerCompanies: businessNames.size,
        customers: businessNames.size,
        partners: businessNames.size,
        activeOpportunities: snapshot.projects.filter((project) =>
          isActive(project.status),
        ).length,
        opportunityVolume: yearlyOpportunityVolume,
        yearlyOpportunityVolume,
        yearlyWonVolume,
        currency: "GBP",
        fxRateDate: GBP_RATE_DATE,
        commissionPartners: businessNames.size,
        year: currentYear,
      },
      dataSource: {
        primary: "lbc-api",
        endpoints: ["/members", "/projects", "/kpi/dashboard"],
      },
    });
  } catch (error) {
    console.error("Landing metrics error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load landing metrics" },
      { status: 500 },
    );
  }
}
