import { NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import { getMoneyValueInGBP } from "@/lib/currency";
import {
  getLbcDashboardSnapshot,
  type LbcMember,
  type LbcProject,
} from "@/lib/lbc-api";

export const dynamic = "force-dynamic";

type StageKey =
  | "Lead"
  | "Qualified"
  | "Proposal"
  | "Negotiation"
  | "Won"
  | "Lost";

type MoneyLike = {
  amount?: number | string | null;
  currency?: string | null;
};

const STAGES: Array<{ key: StageKey; label: string }> = [
  { key: "Lead", label: "Open Leads" },
  { key: "Qualified", label: "In Discussion" },
  { key: "Proposal", label: "Proposal Sent" },
  { key: "Negotiation", label: "Negotiation" },
  { key: "Won", label: "Won Deals" },
  { key: "Lost", label: "Lost Deals" },
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const clean = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : "";

const firstText = (value: unknown, keys: string[]) => {
  if (!isRecord(value)) return "";
  for (const key of keys) {
    const text = clean(value[key]);
    if (text) return text;
  }
  return "";
};

const toFiniteNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
};

const getMoneyValue = (value: unknown, fallbackCurrency = "TRY") => {
  if (isRecord(value) && "amount" in value) {
    const money = value as MoneyLike;
    return getMoneyValueInGBP(
      money.amount,
      money.currency || fallbackCurrency,
    );
  }
  return getMoneyValueInGBP(value, fallbackCurrency);
};

const getProjectValue = (project: LbcProject) =>
  getMoneyValue(project.revenue, "TRY");

const getProjectCommission = (project: LbcProject) =>
  getMoneyValue(project.commission_amount, "TRY") ||
  getMoneyValue(project.lbc_revenue, "TRY");

const getCreatedAt = (item: { created_at?: string | null }) =>
  item.created_at ? new Date(item.created_at) : null;

const isAfter = (date: Date | null, boundary: Date) =>
  Boolean(date && !Number.isNaN(date.getTime()) && date >= boundary);

const normalizeStage = (project: LbcProject): StageKey => {
  const raw = project as unknown as Record<string, unknown>;
  const normalized = `${project.status || ""} ${firstText(raw, ["stage", "deal_stage"])}`
    .trim()
    .toLocaleLowerCase("tr-TR");
  if (normalized.includes("kazan") || normalized.includes("won")) return "Won";
  if (normalized.includes("kaybed") || normalized.includes("lost")) return "Lost";
  if (normalized.includes("sözleşme") || normalized.includes("negotiation")) {
    return "Negotiation";
  }
  if (normalized.includes("teklif") || normalized.includes("proposal")) {
    return "Proposal";
  }
  if (normalized.includes("görüşme") || normalized.includes("qualified")) {
    return "Qualified";
  }
  return "Lead";
};

const countCorporateMembers = (members: LbcMember[]) =>
  members.filter((member) =>
    (member.type || "").toLocaleLowerCase("tr-TR").includes("kurumsal"),
  ).length;

export async function GET(request: Request) {
  try {
    const session = await validateSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const snapshot = await getLbcDashboardSnapshot();
    if (snapshot.errors.length > 0 ||
        (snapshot.members.length === 0 && snapshot.projects.length === 0)) {
      return NextResponse.json(
        {
          success: false,
          error: "LBC dashboard data is unavailable",
          code: "LBC_DASHBOARD_UNAVAILABLE",
          details: snapshot.errors,
        },
        { status: 502 },
      );
    }

    const { members, projects, kpi } = snapshot;
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const referralProjects = projects.filter((project) =>
      Boolean(
        firstText(project, [
          "referrer_name",
          "referral_source",
          "member_name",
        ]),
      ),
    );
    const topReferrers = Object.entries(
      referralProjects.reduce<Record<string, { count: number; volume: number }>>(
        (acc, project) => {
          const name = firstText(project, [
            "referrer_name",
            "referral_source",
            "member_name",
          ]);
          acc[name] ||= { count: 0, volume: 0 };
          acc[name].count += 1;
          acc[name].volume += getProjectValue(project);
          return acc;
        },
        {},
      ),
    )
      .map(([name, value]) => ({ name, ...value }))
      .sort((a, b) => b.volume - a.volume || b.count - a.count)
      .slice(0, 5);

    const companyNames = new Set(
      projects
        .flatMap((project) => [
          firstText(project, [
            "company_name",
            "business_name",
            "client_name",
            "customer_company_name",
          ]),
          firstText(project, ["partner_name", "business_partner_name"]),
        ])
        .map((name) => name.toLocaleLowerCase("tr-TR"))
        .filter(Boolean),
    );
    const partnerNames = new Set(
      projects
        .map((project) =>
          firstText(project, ["partner_name", "business_partner_name"]),
        )
        .map((name) => name.toLocaleLowerCase("tr-TR"))
        .filter(Boolean),
    );

    const projectVolume = projects.reduce(
      (total, project) => total + getProjectValue(project),
      0,
    );
    const monthlyProjects = projects.filter((project) =>
      isAfter(getCreatedAt(project), monthStart),
    );
    const commissionForecast = projects.reduce(
      (total, project) => total + getProjectCommission(project),
      0,
    );
    const kpiPotentialRevenue = getMoneyValue(
      kpi?.revenue?.potential_tl,
      kpi?.revenue?.currency || "TRY",
    );
    const kpiCommission = getMoneyValue(
      kpi?.commission?.pending_tl,
      kpi?.commission?.currency || "TRY",
    );
    const kpiActive = toFiniteNumber(kpi?.opportunities?.active);
    const kpiTotalMembers = toFiniteNumber(kpi?.members?.total);

    const dealFlow = STAGES.map((stage) => {
      const stageProjects = projects.filter(
        (project) => normalizeStage(project) === stage.key,
      );
      return {
        key: stage.key,
        label: stage.label,
        count: stageProjects.length,
        volume: stageProjects.reduce(
          (total, project) => total + getProjectValue(project),
          0,
        ),
      };
    });

    return NextResponse.json({
      success: true,
      metrics: {
        totalMembers: kpiTotalMembers || members.length,
        totalCompanies: countCorporateMembers(members) + companyNames.size,
        totalPartners: partnerNames.size,
        activeOpportunities: kpiActive ?? projects.length,
        opportunityVolume: projectVolume || kpiPotentialRevenue,
        monthlyOpportunityVolume: monthlyProjects.reduce(
          (total, project) => total + getProjectValue(project),
          0,
        ),
        commissionForecast: commissionForecast || kpiCommission,
        referralsCount: referralProjects.length,
        monthlyMembers: members.filter((member) =>
          isAfter(getCreatedAt(member), monthStart),
        ).length,
        monthlyPartners: 0,
        monthlyOpportunities: monthlyProjects.length,
        commissionPartners: partnerNames.size,
      },
      dealFlow,
      topReferrers,
      dataSources: {
        primary: "lbc-api",
        endpoints: ["/members", "/projects", "/kpi/dashboard"],
        members: members.length,
        projects: projects.length,
      },
    });
  } catch (error) {
    console.error("Dashboard metrics error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load dashboard metrics" },
      { status: 500 },
    );
  }
}
