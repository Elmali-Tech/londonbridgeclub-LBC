import { getMoneyValueInGBP, getOpportunityValueInGBP } from "@/lib/currency";

export type KpiDashboardStatus = "Active" | "Won" | "Lost";

export type KpiDashboardStage =
  | "Lead"
  | "Qualified"
  | "Proposal"
  | "Negotiation"
  | "Won"
  | "Lost";

export type KpiDashboardFilters = {
  from?: string | null;
  to?: string | null;
  userId?: string | null;
  leadManager?: string | null;
  member?: string | null;
  sector?: string | null;
  company?: string | null;
  stage?: string | null;
  status?: string | null;
  partnerId?: string | null;
  scope?: "all" | "mine" | null;
};

export type KpiDashboardOpportunityRow = {
  id: number;
  record_type?: string | null;
  customer_id?: number | null;
  partner_id?: number | null;
  customer_name?: string | null;
  company_name?: string | null;
  contact_person?: string | null;
  opportunity_title?: string | null;
  opportunity_description?: string | null;
  estimated_deal_size?: string | null;
  estimated_deal_value?: number | string | null;
  deal_valuation_period?: string | null;
  currency_code?: string | null;
  referral_source?: string | null;
  commission_rate?: string | null;
  commission_rate_percent?: number | string | null;
  lbc_commission?: string | null;
  lbc_commission_amount?: number | string | null;
  deal_stage?: string | null;
  responsible_person?: string | null;
  expected_closing_date?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  created_by?: number | null;
  customer?: {
    id?: number | null;
    name?: string | null;
    company_name?: string | null;
    contact_person?: string | null;
    reference_person?: string | null;
  } | null;
  business_partner?: {
    id?: number | null;
    name?: string | null;
    commission_rate_percent?: number | string | null;
  } | null;
  created_by_user?: {
    full_name?: string | null;
    email?: string | null;
    industry?: string | null;
    lbc_sector?: string | null;
  } | null;
};

export type KpiDashboardUserOption = {
  id: number;
  name: string;
  email?: string | null;
};

export type KpiLeaderboardRow = {
  name: string;
  count: number;
  activeCount: number;
  wonCount: number;
  valueGBP: number;
  wonValueGBP: number;
  commissionGBP: number;
  expectedCommissionGBP: number;
};

export type KpiStageMetric = {
  stage: KpiDashboardStage;
  probability: number;
  count: number;
  activeCount: number;
  valueGBP: number;
  expectedValueGBP: number;
  commissionGBP: number;
  expectedCommissionGBP: number;
};

export type KpiStatusMetric = {
  status: KpiDashboardStatus;
  count: number;
  valueGBP: number;
  commissionGBP: number;
};

export type KpiClosingForecastBucket = {
  key:
    | "overdue"
    | "this_month"
    | "this_quarter"
    | "this_year"
    | "later"
    | "unscheduled";
  label: string;
  count: number;
  valueGBP: number;
  expectedValueGBP: number;
  commissionGBP: number;
  expectedCommissionGBP: number;
  upsideCommissionGBP: number;
};

export type KpiOpportunityDetail = {
  id: number;
  title: string;
  customerName: string;
  companyName: string;
  recordType: string;
  status: KpiDashboardStatus;
  stage: KpiDashboardStage;
  probability: number;
  valueGBP: number;
  commissionGBP: number;
  expectedValueGBP: number;
  expectedCommissionGBP: number;
  currencyCode: string;
  leadManager: string;
  memberName: string;
  sector: string;
  partnerName: string;
  expectedClosingDate?: string | null;
  createdAt?: string | null;
  isClosingRisk: boolean;
};

export type KpiDashboardData = {
  success: true;
  summary: {
    totalRecords: number;
    activeCount: number;
    wonCount: number;
    lostCount: number;
    totalPipelineValueGBP: number;
    activePipelineValueGBP: number;
    wonValueGBP: number;
    lostValueGBP: number;
    maximumRevenueGBP: number;
    expectedRevenueGBP: number;
    totalCommissionGBP: number;
    expectedCommissionGBP: number;
    averageDealSizeGBP: number;
    conversionRate: number;
    closingRiskCount: number;
  };
  pipeline: KpiStageMetric[];
  statusDistribution: KpiStatusMetric[];
  closingForecast: {
    horizons: KpiClosingForecastBucket[];
    datedActiveCount: number;
    unscheduledActiveCount: number;
  };
  topMembers: KpiLeaderboardRow[];
  topSectors: KpiLeaderboardRow[];
  topLeadManagers: KpiLeaderboardRow[];
  topCompanies: KpiLeaderboardRow[];
  topPartners: KpiLeaderboardRow[];
  opportunities: KpiOpportunityDetail[];
  filterOptions: {
    users: KpiDashboardUserOption[];
    leadManagers: string[];
    members: string[];
    sectors: string[];
    companies: string[];
    partners: Array<{ id: number; name: string }>;
    stages: KpiDashboardStage[];
    statuses: KpiDashboardStatus[];
  };
  meta: {
    source: "lbc-api";
    dataSource?: "lbc";
    generatedAt: string;
    rowCount: number;
    visibleRowCount: number;
    caveats: string[];
    shadow?: {
      source: "lbc-api";
      rowCount: number;
      visibleRowCount: number;
      errors: string[];
      summary: {
        totalRecords: number;
        activeCount: number;
        wonCount: number;
        lostCount: number;
        activePipelineValueGBP: number;
        wonValueGBP: number;
        expectedRevenueGBP: number;
        totalCommissionGBP: number;
        expectedCommissionGBP: number;
      };
      differences: Array<{
        metric: string;
        primary: number;
        shadow: number;
        delta: number;
        deltaPercent: number | null;
      }>;
    };
  };
};

const STAGE_ORDER: KpiDashboardStage[] = [
  "Lead",
  "Qualified",
  "Proposal",
  "Negotiation",
  "Won",
  "Lost",
];

const STATUSES: KpiDashboardStatus[] = ["Active", "Won", "Lost"];

export const KPI_STAGE_PROBABILITIES: Record<KpiDashboardStage, number> = {
  Lead: 0.1,
  Qualified: 0.3,
  Proposal: 0.6,
  Negotiation: 0.8,
  Won: 1,
  Lost: 0,
};

const clean = (value?: string | null) => value?.trim() || "";

const normalizeFilterValue = (value?: string | null) =>
  clean(value).toLocaleLowerCase("tr-TR");

const roundMoney = (value: number) => Math.round(value * 100) / 100;

export function normalizeKpiStatus(value?: string | null): KpiDashboardStatus {
  if (value === "Won") return "Won";
  if (value === "Lost") return "Lost";
  return "Active";
}

export function normalizeKpiStage(
  stage?: string | null,
  status?: string | null,
): KpiDashboardStage {
  const normalizedStatus = normalizeKpiStatus(status);
  if (normalizedStatus === "Won" || normalizedStatus === "Lost") {
    return normalizedStatus;
  }

  if (stage === "Negotiation") return "Negotiation";
  if (stage === "Proposal") return "Proposal";
  if (stage === "Qualified" || stage === "Opportunity") return "Qualified";
  return "Lead";
}

export function getKpiProbability(
  stage?: string | null,
  status?: string | null,
) {
  return KPI_STAGE_PROBABILITIES[normalizeKpiStage(stage, status)];
}

export function buildKpiDashboardData(input: {
  rows: KpiDashboardOpportunityRow[];
  visibleRows?: KpiDashboardOpportunityRow[];
  users?: KpiDashboardUserOption[];
  filters?: KpiDashboardFilters;
  generatedAt?: string;
  source?: "lbc-api";
  dataSource?: "lbc";
}): KpiDashboardData {
  const visibleRows = input.visibleRows || input.rows;
  const filterOptions = buildFilterOptions(visibleRows, input.users || []);
  const filteredRows = applyKpiFilters(visibleRows, input.filters || {});
  const enriched = filteredRows.map(enrichOpportunity);

  const activeRows = enriched.filter((row) => row.status === "Active");
  const wonRows = enriched.filter((row) => row.status === "Won");
  const lostRows = enriched.filter((row) => row.status === "Lost");
  const totalPipelineValueGBP = sum(enriched, "valueGBP");
  const activePipelineValueGBP = sum(activeRows, "valueGBP");
  const wonValueGBP = sum(wonRows, "valueGBP");
  const lostValueGBP = sum(lostRows, "valueGBP");
  const expectedRevenueGBP = sum(enriched, "expectedValueGBP");
  const totalCommissionGBP = sum(enriched, "commissionGBP");
  const expectedCommissionGBP = sum(enriched, "expectedCommissionGBP");
  const closedCount = wonRows.length + lostRows.length;

  return {
    success: true,
    summary: {
      totalRecords: enriched.length,
      activeCount: activeRows.length,
      wonCount: wonRows.length,
      lostCount: lostRows.length,
      totalPipelineValueGBP: roundMoney(totalPipelineValueGBP),
      activePipelineValueGBP: roundMoney(activePipelineValueGBP),
      wonValueGBP: roundMoney(wonValueGBP),
      lostValueGBP: roundMoney(lostValueGBP),
      maximumRevenueGBP: roundMoney(activePipelineValueGBP),
      expectedRevenueGBP: roundMoney(expectedRevenueGBP),
      totalCommissionGBP: roundMoney(totalCommissionGBP),
      expectedCommissionGBP: roundMoney(expectedCommissionGBP),
      averageDealSizeGBP:
        enriched.length > 0
          ? roundMoney(totalPipelineValueGBP / enriched.length)
          : 0,
      conversionRate:
        closedCount > 0 ? roundMoney((wonRows.length / closedCount) * 100) : 0,
      closingRiskCount: enriched.filter((row) => row.isClosingRisk).length,
    },
    pipeline: STAGE_ORDER.map((stage) => buildStageMetric(enriched, stage)),
    statusDistribution: STATUSES.map((status) =>
      buildStatusMetric(enriched, status),
    ),
    closingForecast: buildClosingForecast(activeRows),
    topMembers: buildLeaderboard(enriched, (row) => row.memberName).slice(0, 10),
    topSectors: buildLeaderboard(enriched, (row) => row.sector).slice(0, 10),
    topLeadManagers: buildLeaderboard(enriched, (row) => row.leadManager).slice(
      0,
      10,
    ),
    topCompanies: buildLeaderboard(enriched, (row) => row.companyName).slice(
      0,
      10,
    ),
    topPartners: buildLeaderboard(enriched, (row) => row.partnerName).slice(
      0,
      10,
    ),
    opportunities: enriched
      .sort(
        (a, b) =>
          b.expectedCommissionGBP - a.expectedCommissionGBP ||
          b.valueGBP - a.valueGBP,
      )
      .slice(0, 100),
    filterOptions,
    meta: {
      source: "lbc-api",
      dataSource: input.dataSource,
      generatedAt: input.generatedAt || new Date().toISOString(),
      rowCount: enriched.length,
      visibleRowCount: visibleRows.length,
      caveats: [
        "Sector is derived from the opportunity creator's LBC sector or industry when no CRM sector field exists.",
        "Revenue values are pipeline estimates; collected revenue is not reconciled here.",
        "Closing forecast horizons are cumulative: this month is included in this quarter and this year.",
      ],
    },
  };
}

function buildFilterOptions(
  rows: KpiDashboardOpportunityRow[],
  users: KpiDashboardUserOption[],
) {
  return {
    users,
    leadManagers: uniqueSorted(
      rows
        .map((row) => getLeadManager(row))
        .filter((name) => name !== "Unassigned"),
    ),
    members: uniqueSorted(
      rows.map((row) => getMemberName(row)).filter((name) => name !== "Unknown"),
    ),
    sectors: uniqueSorted(
      rows.map((row) => getSector(row)).filter((sector) => sector !== "Unspecified"),
    ),
    companies: uniqueSorted(
      rows
        .map((row) => clean(row.company_name || row.customer?.company_name))
        .filter(Boolean),
    ),
    partners: Array.from(
      rows.reduce<Map<number, string>>((acc, row) => {
        const id = row.business_partner?.id || row.partner_id;
        const name = clean(row.business_partner?.name);
        if (id && name) acc.set(Number(id), name);
        return acc;
      }, new Map()),
    )
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "tr")),
    stages: STAGE_ORDER,
    statuses: STATUSES,
  };
}

function applyKpiFilters(
  rows: KpiDashboardOpportunityRow[],
  filters: KpiDashboardFilters,
) {
  const fromTime = filters.from ? Date.parse(filters.from) : null;
  const toTime = filters.to ? endOfDayTime(filters.to) : null;
  const statusFilter = normalizeFilterValue(filters.status);
  const stageFilter = normalizeFilterValue(filters.stage);
  const userFilter = normalizeFilterValue(filters.userId);
  const leadManagerFilter = normalizeFilterValue(filters.leadManager);
  const memberFilter = normalizeFilterValue(filters.member);
  const sectorFilter = normalizeFilterValue(filters.sector);
  const companyFilter = normalizeFilterValue(filters.company);
  const partnerFilter = normalizeFilterValue(filters.partnerId);

  return rows.filter((row) => {
    const createdTime = row.created_at ? Date.parse(row.created_at) : null;
    if (fromTime && (!createdTime || createdTime < fromTime)) return false;
    if (toTime && (!createdTime || createdTime > toTime)) return false;
    if (
      statusFilter &&
      normalizeFilterValue(normalizeKpiStatus(row.status)) !== statusFilter
    ) {
      return false;
    }
    if (
      stageFilter &&
      normalizeFilterValue(normalizeKpiStage(row.deal_stage, row.status)) !==
        stageFilter
    ) {
      return false;
    }
    if (userFilter && String(row.created_by || "") !== userFilter) return false;
    if (
      leadManagerFilter &&
      normalizeFilterValue(getLeadManager(row)) !== leadManagerFilter
    ) {
      return false;
    }
    if (memberFilter && normalizeFilterValue(getMemberName(row)) !== memberFilter) {
      return false;
    }
    if (sectorFilter && normalizeFilterValue(getSector(row)) !== sectorFilter) {
      return false;
    }
    if (
      companyFilter &&
      normalizeFilterValue(clean(row.company_name || row.customer?.company_name)) !==
        companyFilter
    ) {
      return false;
    }
    if (partnerFilter && String(row.partner_id || row.business_partner?.id || "") !== partnerFilter) {
      return false;
    }

    return true;
  });
}

function enrichOpportunity(row: KpiDashboardOpportunityRow): KpiOpportunityDetail {
  const status = normalizeKpiStatus(row.status);
  const stage = normalizeKpiStage(row.deal_stage, row.status);
  const probability = KPI_STAGE_PROBABILITIES[stage];
  const valueGBP = getOpportunityValueInGBP(row);
  const commissionGBP = getMoneyValueInGBP(
    row.lbc_commission_amount ?? row.lbc_commission,
    row.currency_code,
    row.lbc_commission || undefined,
  );

  return {
    id: row.id,
    title: clean(row.opportunity_title) || "Untitled opportunity",
    customerName: clean(row.customer_name || row.customer?.name) || "Unknown",
    companyName:
      clean(row.company_name || row.customer?.company_name) || "Unknown",
    recordType: clean(row.record_type) || "lead",
    status,
    stage,
    probability,
    valueGBP: roundMoney(valueGBP),
    commissionGBP: roundMoney(commissionGBP),
    expectedValueGBP: roundMoney(valueGBP * probability),
    expectedCommissionGBP: roundMoney(commissionGBP * probability),
    currencyCode: clean(row.currency_code) || "GBP",
    leadManager: getLeadManager(row),
    memberName: getMemberName(row),
    sector: getSector(row),
    partnerName: clean(row.business_partner?.name) || "No partner",
    expectedClosingDate: row.expected_closing_date || null,
    createdAt: row.created_at || null,
    isClosingRisk: isClosingRisk(row),
  };
}

function buildStageMetric(
  rows: KpiOpportunityDetail[],
  stage: KpiDashboardStage,
): KpiStageMetric {
  const stageRows = rows.filter((row) => row.stage === stage);

  return {
    stage,
    probability: KPI_STAGE_PROBABILITIES[stage],
    count: stageRows.length,
    activeCount: stageRows.filter((row) => row.status === "Active").length,
    valueGBP: roundMoney(sum(stageRows, "valueGBP")),
    expectedValueGBP: roundMoney(sum(stageRows, "expectedValueGBP")),
    commissionGBP: roundMoney(sum(stageRows, "commissionGBP")),
    expectedCommissionGBP: roundMoney(sum(stageRows, "expectedCommissionGBP")),
  };
}

function buildStatusMetric(
  rows: KpiOpportunityDetail[],
  status: KpiDashboardStatus,
): KpiStatusMetric {
  const statusRows = rows.filter((row) => row.status === status);

  return {
    status,
    count: statusRows.length,
    valueGBP: roundMoney(sum(statusRows, "valueGBP")),
    commissionGBP: roundMoney(sum(statusRows, "commissionGBP")),
  };
}

function buildClosingForecast(rows: KpiOpportunityDetail[]) {
  const boundaries = getForecastBoundaries();
  const datedRows = rows.filter((row) => parseDate(row.expectedClosingDate));
  const unscheduledRows = rows.filter((row) => !parseDate(row.expectedClosingDate));
  const isBetweenTodayAnd = (row: KpiOpportunityDetail, end: Date) => {
    const closingDate = parseDate(row.expectedClosingDate);
    return Boolean(
      closingDate &&
        closingDate >= boundaries.today &&
        closingDate <= end,
    );
  };

  const horizons: KpiClosingForecastBucket[] = [
    buildClosingBucket(
      "overdue",
      "Overdue",
      rows.filter((row) => {
        const closingDate = parseDate(row.expectedClosingDate);
        return Boolean(closingDate && closingDate < boundaries.today);
      }),
    ),
    buildClosingBucket(
      "this_month",
      "This Month",
      rows.filter((row) => isBetweenTodayAnd(row, boundaries.endOfMonth)),
    ),
    buildClosingBucket(
      "this_quarter",
      "This Quarter",
      rows.filter((row) => isBetweenTodayAnd(row, boundaries.endOfQuarter)),
    ),
    buildClosingBucket(
      "this_year",
      "This Year",
      rows.filter((row) => isBetweenTodayAnd(row, boundaries.endOfYear)),
    ),
    buildClosingBucket(
      "later",
      "Later",
      rows.filter((row) => {
        const closingDate = parseDate(row.expectedClosingDate);
        return Boolean(closingDate && closingDate > boundaries.endOfYear);
      }),
    ),
    buildClosingBucket("unscheduled", "Unscheduled", unscheduledRows),
  ];

  return {
    horizons,
    datedActiveCount: datedRows.length,
    unscheduledActiveCount: unscheduledRows.length,
  };
}

function buildClosingBucket(
  key: KpiClosingForecastBucket["key"],
  label: string,
  rows: KpiOpportunityDetail[],
): KpiClosingForecastBucket {
  const commissionGBP = sum(rows, "commissionGBP");
  const expectedCommissionGBP = sum(rows, "expectedCommissionGBP");

  return {
    key,
    label,
    count: rows.length,
    valueGBP: roundMoney(sum(rows, "valueGBP")),
    expectedValueGBP: roundMoney(sum(rows, "expectedValueGBP")),
    commissionGBP: roundMoney(commissionGBP),
    expectedCommissionGBP: roundMoney(expectedCommissionGBP),
    upsideCommissionGBP: roundMoney(commissionGBP - expectedCommissionGBP),
  };
}

function getForecastBoundaries(reference = new Date()) {
  const today = new Date(reference);
  today.setHours(0, 0, 0, 0);

  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  endOfMonth.setHours(23, 59, 59, 999);

  const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3;
  const endOfQuarter = new Date(today.getFullYear(), quarterStartMonth + 3, 0);
  endOfQuarter.setHours(23, 59, 59, 999);

  const endOfYear = new Date(today.getFullYear(), 11, 31);
  endOfYear.setHours(23, 59, 59, 999);

  return { today, endOfMonth, endOfQuarter, endOfYear };
}

function buildLeaderboard(
  rows: KpiOpportunityDetail[],
  getKey: (row: KpiOpportunityDetail) => string,
) {
  return Array.from(
    rows
      .reduce<Map<string, KpiLeaderboardRow>>((acc, row) => {
      const name = getKey(row) || "Unknown";
      const current =
        acc.get(name) ||
        ({
          name,
          count: 0,
          activeCount: 0,
          wonCount: 0,
          valueGBP: 0,
          wonValueGBP: 0,
          commissionGBP: 0,
          expectedCommissionGBP: 0,
        } satisfies KpiLeaderboardRow);

      current.count += 1;
      current.activeCount += row.status === "Active" ? 1 : 0;
      current.wonCount += row.status === "Won" ? 1 : 0;
      current.valueGBP += row.valueGBP;
      current.wonValueGBP += row.status === "Won" ? row.valueGBP : 0;
      current.commissionGBP += row.commissionGBP;
      current.expectedCommissionGBP += row.expectedCommissionGBP;
      acc.set(name, current);
      return acc;
      }, new Map())
      .values(),
  )
    .map((row) => ({
      ...row,
      valueGBP: roundMoney(row.valueGBP),
      wonValueGBP: roundMoney(row.wonValueGBP),
      commissionGBP: roundMoney(row.commissionGBP),
      expectedCommissionGBP: roundMoney(row.expectedCommissionGBP),
    }))
    .sort(
      (a, b) =>
        b.expectedCommissionGBP - a.expectedCommissionGBP ||
        b.valueGBP - a.valueGBP ||
        b.count - a.count,
    );
}

function getLeadManager(row: KpiDashboardOpportunityRow) {
  return (
    clean(row.responsible_person) ||
    clean(row.created_by_user?.full_name) ||
    clean(row.created_by_user?.email) ||
    "Unassigned"
  );
}

function getMemberName(row: KpiDashboardOpportunityRow) {
  return (
    clean(row.referral_source) ||
    clean(row.customer?.reference_person) ||
    clean(row.created_by_user?.full_name) ||
    "Unknown"
  );
}

function getSector(row: KpiDashboardOpportunityRow) {
  return (
    clean(row.created_by_user?.lbc_sector) ||
    clean(row.created_by_user?.industry) ||
    "Unspecified"
  );
}

function isClosingRisk(row: KpiDashboardOpportunityRow) {
  if (normalizeKpiStatus(row.status) !== "Active") return false;
  if (!row.expected_closing_date) return false;

  const closingDate = parseDate(row.expected_closing_date);
  if (!closingDate) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return closingDate < today;
}

function endOfDayTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(23, 59, 59, 999);
  return date.getTime();
}

function sum<T>(rows: T[], key: keyof T) {
  return rows.reduce((total, row) => {
    const value = row[key];
    return total + (typeof value === "number" && Number.isFinite(value) ? value : 0);
  }, 0);
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, "tr"));
}
