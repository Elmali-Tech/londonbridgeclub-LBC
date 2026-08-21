"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { formatGBPAmount } from "@/lib/currency";
import type {
  KpiDashboardData,
  KpiLeaderboardRow,
  KpiOpportunityDetail,
} from "@/lib/kpi-dashboard";
import { motion } from "framer-motion";
import AdminContainer from "@/app/components/admin/AdminContainer";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { IconType } from "react-icons";
import {
  FiActivity,
  FiAlertTriangle,
  FiBriefcase,
  FiCalendar,
  FiCheckCircle,
  FiDollarSign,
  FiFilter,
  FiLayers,
  FiPackage,
  FiPieChart,
  FiRefreshCw,
  FiTarget,
  FiTrendingUp,
  FiUser,
  FiZap,
} from "react-icons/fi";

const COLORS = [
  "#F59E0B",
  "#10B981",
  "#EF4444",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
];

type CustomStatCardProps = {
  title: string;
  value: string | number;
  icon: IconType;
  colorClass: string;
  subValue?: string;
  trend?: string;
};

type DatePreset = "all" | "month" | "quarter" | "year" | "custom";
type LeaderboardMetric =
  | "expectedCommissionGBP"
  | "commissionGBP"
  | "valueGBP"
  | "wonValueGBP"
  | "count";

type DashboardFilters = {
  preset: DatePreset;
  from: string;
  to: string;
  userId: string;
  leadManager: string;
  member: string;
  sector: string;
  company: string;
  stage: string;
  status: string;
  partnerId: string;
  scope: "all" | "mine";
};

type KpiDashboardResponse =
  | KpiDashboardData
  | { success: false; error?: string };

const DEFAULT_FILTERS: DashboardFilters = {
  preset: "all",
  from: "",
  to: "",
  userId: "",
  leadManager: "",
  member: "",
  sector: "",
  company: "",
  stage: "",
  status: "",
  partnerId: "",
  scope: "all",
};

const LEADERBOARD_METRIC_OPTIONS: Array<{
  value: LeaderboardMetric;
  label: string;
}> = [
  { value: "expectedCommissionGBP", label: "Expected commission" },
  { value: "commissionGBP", label: "Max commission" },
  { value: "valueGBP", label: "Deal value" },
  { value: "wonValueGBP", label: "Won value" },
  { value: "count", label: "Deal count" },
];

const formatPercent = (value: number) => `${value.toFixed(1)}%`;

const getLeaderboardMetricLabel = (metric: LeaderboardMetric) =>
  LEADERBOARD_METRIC_OPTIONS.find((option) => option.value === metric)?.label ||
  "Metric";

const formatLeaderboardMetricValue = (
  row: KpiLeaderboardRow,
  metric: LeaderboardMetric,
) => {
  if (metric === "count") return row.count.toString();
  return formatGBPAmount(row[metric]);
};

const sortLeaderboardRows = (
  rows: KpiLeaderboardRow[],
  metric: LeaderboardMetric,
) =>
  [...rows].sort(
    (a, b) =>
      b[metric] - a[metric] ||
      b.expectedCommissionGBP - a.expectedCommissionGBP ||
      b.valueGBP - a.valueGBP ||
      b.count - a.count,
  );

const formatDateInput = (date: Date) => date.toISOString().slice(0, 10);

const resolveDatePreset = (filters: DashboardFilters) => {
  if (filters.preset === "custom") {
    return { from: filters.from, to: filters.to };
  }

  if (filters.preset === "all") {
    return { from: "", to: "" };
  }

  const now = new Date();
  const from = new Date(now);

  if (filters.preset === "month") {
    from.setDate(1);
  }

  if (filters.preset === "quarter") {
    from.setMonth(now.getMonth() - 3);
  }

  if (filters.preset === "year") {
    from.setMonth(0, 1);
  }

  return {
    from: formatDateInput(from),
    to: formatDateInput(now),
  };
};

const buildDashboardQuery = (filters: DashboardFilters) => {
  const params = new URLSearchParams();
  const dateRange = resolveDatePreset(filters);

  if (dateRange.from) params.set("from", dateRange.from);
  if (dateRange.to) params.set("to", dateRange.to);
  if (filters.userId) params.set("userId", filters.userId);
  if (filters.leadManager) params.set("leadManager", filters.leadManager);
  if (filters.member) params.set("member", filters.member);
  if (filters.sector) params.set("sector", filters.sector);
  if (filters.company) params.set("company", filters.company);
  if (filters.stage) params.set("stage", filters.stage);
  if (filters.status) params.set("status", filters.status);
  if (filters.partnerId) params.set("partnerId", filters.partnerId);
  if (filters.scope === "mine") params.set("scope", "mine");

  return params.toString();
};

export default function KPIDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [dashboard, setDashboard] = useState<KpiDashboardData | null>(null);
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const queryString = useMemo(() => buildDashboardQuery(filters), [filters]);
  const [selectedOpportunityIds, setSelectedOpportunityIds] = useState<number[]>(
    [],
  );
  const [leaderboardMetric, setLeaderboardMetric] =
    useState<LeaderboardMetric>("expectedCommissionGBP");

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push("/admin");
      return;
    }

    let isMounted = true;

    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("authToken");
        const response = await fetch(
          `/api/admin/kpi-dashboard${queryString ? `?${queryString}` : ""}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        const data = (await response.json()) as KpiDashboardResponse;

        if (!isMounted) return;

        if (data.success) {
          setDashboard(data);
        } else {
          setDashboard(null);
          toast.error(data.error || "Failed to fetch KPI dashboard");
        }
      } catch {
        if (isMounted) {
          setDashboard(null);
          toast.error("Failed to fetch KPI dashboard");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDashboard();

    return () => {
      isMounted = false;
    };
  }, [user, authLoading, router, queryString]);

  const userRole = user?.role || (user?.is_admin ? "admin" : "viewer");
  const isViewer = userRole === "viewer";
  const canUseAdminFilters =
    user?.is_admin || userRole === "admin" || userRole === "opportunity_manager";
  const hasAccess = [
    "admin",
    "opportunity_manager",
    "sales_member",
    "viewer",
  ].includes(userRole);

  const chartData = useMemo(
    () =>
      (dashboard?.pipeline || [])
        .filter((stage) => stage.stage !== "Won" && stage.stage !== "Lost")
        .map((stage) => ({
          name: stage.stage,
          volume: stage.valueGBP,
          expected: stage.expectedValueGBP,
          commission: stage.expectedCommissionGBP,
          count: stage.count,
        })),
    [dashboard],
  );

  const statusData = useMemo(
    () =>
      (dashboard?.statusDistribution || []).map((status) => ({
        name: status.status,
        value: status.count,
        volume: status.valueGBP,
      })),
    [dashboard],
  );

  const companyChartData = useMemo(
    () =>
      sortLeaderboardRows(
        dashboard?.topCompanies || [],
        leaderboardMetric,
      )
        .slice(0, 5)
        .map((company) => ({
        name: company.name,
        value: company[leaderboardMetric],
      })),
    [dashboard, leaderboardMetric],
  );

  const closingForecastData = useMemo(
    () =>
      (dashboard?.closingForecast.horizons || []).map((bucket) => ({
        name: bucket.label,
        expectedCommission: bucket.expectedCommissionGBP,
        upside: bucket.upsideCommissionGBP,
        expectedRevenue: bucket.expectedValueGBP,
        count: bucket.count,
      })),
    [dashboard],
  );

  const selectableOpportunities = useMemo(
    () =>
      (dashboard?.opportunities || []).filter(
        (opportunity) => opportunity.status === "Active",
      ),
    [dashboard],
  );

  const selectedOpportunitySet = useMemo(
    () => new Set(selectedOpportunityIds),
    [selectedOpportunityIds],
  );

  const selectedOpportunities = useMemo(
    () =>
      selectableOpportunities.filter((opportunity) =>
        selectedOpportunitySet.has(opportunity.id),
      ),
    [selectableOpportunities, selectedOpportunitySet],
  );

  useEffect(() => {
    const visibleIds = new Set(selectableOpportunities.map((item) => item.id));
    setSelectedOpportunityIds((current) =>
      current.filter((id) => visibleIds.has(id)),
    );
  }, [selectableOpportunities]);

  const setFilter = <K extends keyof DashboardFilters>(
    key: K,
    value: DashboardFilters[K],
  ) => {
    setSelectedOpportunityIds([]);
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === "preset" && value !== "custom" ? { from: "", to: "" } : {}),
    }));
  };

  const refreshDashboard = () => {
    setFilters((current) => ({ ...current }));
  };

  const applyLeaderboardFilter = (
    key: "leadManager" | "member" | "sector" | "company" | "partnerId",
    value: string,
  ) => {
    setSelectedOpportunityIds([]);
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const applyPartnerFilter = (partnerName: string) => {
    const partner = dashboard?.filterOptions.partners.find(
      (item) => item.name === partnerName,
    );
    if (partner) applyLeaderboardFilter("partnerId", String(partner.id));
  };

  const toggleOpportunity = (opportunityId: number) => {
    setSelectedOpportunityIds((current) =>
      current.includes(opportunityId)
        ? current.filter((id) => id !== opportunityId)
        : [...current, opportunityId],
    );
  };

  const selectOpportunities = (
    predicate: (opportunity: KpiOpportunityDetail) => boolean,
  ) => {
    setSelectedOpportunityIds(
      selectableOpportunities.filter(predicate).map((opportunity) => opportunity.id),
    );
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-white dark:bg-gray-950">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600" />
      </div>
    );
  }

  if (!hasAccess || !dashboard) return null;

  const stats = dashboard.summary;

  return (
    <AdminContainer>
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-amber-500 font-black tracking-[0.3em] text-[10px] uppercase">
              <span className="w-6 h-[2px] bg-amber-500" />
              Performance Intelligence
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white">
              Analytics <span className="text-amber-500 italic">Dashboard</span>
            </h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium max-w-lg">
              Pipeline, forecast, member contribution and sector movement in one operating view.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={refreshDashboard}
              className="w-12 h-12 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-center text-gray-500 hover:text-amber-500 transition-colors"
              aria-label="Refresh KPI dashboard"
            >
              <FiRefreshCw />
            </button>
            <div className="px-5 py-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                {dashboard.meta.source}
              </span>
            </div>
          </div>
        </div>

        <FilterBar
          filters={filters}
          dashboard={dashboard}
          canUseAdminFilters={Boolean(canUseAdminFilters)}
          onFilterChange={setFilter}
          onReset={() => {
            setSelectedOpportunityIds([]);
            setFilters(DEFAULT_FILTERS);
          }}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {!isViewer ? (
            <>
              <CustomStatCard
                title="Won Revenue"
                value={formatGBPAmount(stats.wonValueGBP)}
                icon={FiCheckCircle}
                colorClass="text-emerald-500"
                subValue={`${stats.wonCount} closed deals`}
              />
              <CustomStatCard
                title="Active Pipeline"
                value={formatGBPAmount(stats.activePipelineValueGBP)}
                icon={FiDollarSign}
                colorClass="text-amber-500"
                subValue={`${stats.activeCount} active opportunities`}
              />
              <CustomStatCard
                title="Expected Revenue"
                value={formatGBPAmount(stats.expectedRevenueGBP)}
                icon={FiTrendingUp}
                colorClass="text-indigo-500"
                subValue="Stage weighted forecast"
              />
              <CustomStatCard
                title="Commission Forecast"
                value={formatGBPAmount(stats.expectedCommissionGBP)}
                icon={FiZap}
                colorClass="text-violet-500"
                subValue="Weighted LBC commission"
              />
              <CustomStatCard
                title="Closing Risk"
                value={stats.closingRiskCount}
                icon={FiAlertTriangle}
                colorClass="text-rose-500"
                subValue={`${formatPercent(stats.conversionRate)} conversion`}
              />
            </>
          ) : (
            <>
              <CustomStatCard
                title="Active Projects"
                value={stats.activeCount}
                icon={FiBriefcase}
                colorClass="text-amber-500"
              />
              <CustomStatCard
                title="Global Status"
                value="Stable"
                icon={FiActivity}
                colorClass="text-emerald-500"
              />
              <CustomStatCard
                title="Network Reach"
                value="Global"
                icon={FiLayers}
                colorClass="text-indigo-500"
              />
              <CustomStatCard
                title="System Health"
                value="Optimal"
                icon={FiCheckCircle}
                colorClass="text-violet-500"
              />
            </>
          )}
        </div>

        {!isViewer && (
          <ClosingForecastPanel
            dashboard={dashboard}
            chartData={closingForecastData}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {!isViewer ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-2 bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-50 dark:border-gray-800 shadow-sm"
            >
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest dark:text-white">
                    Revenue Distribution
                  </h3>
                  <p className="text-xs font-bold text-gray-500">
                    Actual pipeline value against stage weighted forecast
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                  <FiTrendingUp />
                </div>
              </div>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="expectedGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.05} />
                    <XAxis
                      dataKey="name"
                      stroke="#9CA3AF"
                      fontSize={10}
                      fontWeight="900"
                      axisLine={false}
                      tickLine={false}
                      dy={15}
                    />
                    <YAxis
                      stroke="#9CA3AF"
                      fontSize={10}
                      fontWeight="900"
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => formatGBPAmount(Number(val))}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#111827",
                        border: "none",
                        borderRadius: "1.25rem",
                        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
                      }}
                      itemStyle={{ fontWeight: "900" }}
                      labelStyle={{
                        color: "#9CA3AF",
                        marginBottom: "4px",
                        fontSize: "10px",
                        fontWeight: "bold",
                      }}
                      formatter={(value) => formatGBPAmount(Number(value))}
                    />
                    <Area
                      type="monotone"
                      dataKey="volume"
                      name="Pipeline"
                      stroke="#8B5CF6"
                      strokeWidth={4}
                      fillOpacity={1}
                      fill="url(#chartGradient)"
                    />
                    <Area
                      type="monotone"
                      dataKey="expected"
                      name="Expected"
                      stroke="#F59E0B"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#expectedGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          ) : (
            <div className="lg:col-span-2 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-[2.5rem] p-12 text-white relative overflow-hidden flex flex-col justify-end min-h-[400px]">
              <FiTarget className="absolute -top-10 -right-10 text-[20rem] opacity-10" />
              <div className="relative z-10 space-y-4">
                <h3 className="text-4xl font-black tracking-tight leading-none">
                  Operational <br />Overview Active
                </h3>
                <p className="text-indigo-100 font-medium max-w-sm">
                  London Bridge Club control center visibility is active for your role.
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/admin/customer-pool")}
                  className="mt-4 px-6 py-3 bg-white text-indigo-600 font-black rounded-2xl hover:bg-opacity-90 transition-all text-sm uppercase tracking-widest shadow-lg"
                >
                  View CRM Pipeline
                </button>
              </div>
            </div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-50 dark:border-gray-800 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black uppercase tracking-widest dark:text-white">
                Deal Success
              </h3>
              <FiPieChart className="text-amber-500" />
            </div>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                    cornerRadius={8}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#111827",
                      border: "none",
                      borderRadius: "1rem",
                      color: "#fff",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-3">
              {statusData.map((status, index) => (
                <div key={status.name} className="flex items-center justify-between text-xs font-bold">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-gray-500">{status.name}</span>
                  </div>
                  <span className="text-gray-900 dark:text-white">
                    {status.value}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {!isViewer && (
            <>
              <LeaderboardCard
                title="Top Lead Managers"
                icon={FiUser}
                rows={dashboard.topLeadManagers}
                metric={leaderboardMetric}
                onRowClick={(row) =>
                  applyLeaderboardFilter("leadManager", row.name)
                }
              />

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="lg:col-span-2 bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-50 dark:border-gray-800 shadow-sm"
              >
                <div className="flex items-center justify-between mb-10">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest dark:text-white">
                      Strategic Accounts
                    </h3>
                    <p className="text-xs font-bold text-gray-500 mt-1">
                      Ranked by {getLeaderboardMetricLabel(leaderboardMetric)}
                    </p>
                  </div>
                  <FiBriefcase className="text-emerald-500" />
                </div>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={companyChartData} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="name"
                        type="category"
                        stroke="#9CA3AF"
                        fontSize={10}
                        fontWeight="900"
                        axisLine={false}
                        tickLine={false}
                        width={120}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#111827",
                          border: "none",
                          borderRadius: "1rem",
                        }}
                        formatter={(value) =>
                          leaderboardMetric === "count"
                            ? Number(value).toLocaleString("en-GB")
                            : formatGBPAmount(Number(value))
                        }
                      />
                      <Bar
                        dataKey="value"
                        fill="#10B981"
                        radius={[0, 12, 12, 0]}
                        barSize={12}
                        className="opacity-80 hover:opacity-100 transition-opacity"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </>
          )}
        </div>

        {!isViewer && (
          <div className="space-y-5">
            <LeaderboardMetricControl
              value={leaderboardMetric}
              onChange={setLeaderboardMetric}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-8">
              <LeaderboardCard
                title="Top Members"
                icon={FiPackage}
                rows={dashboard.topMembers}
                metric={leaderboardMetric}
                onRowClick={(row) => applyLeaderboardFilter("member", row.name)}
              />
              <LeaderboardCard
                title="Top Sectors"
                icon={FiLayers}
                rows={dashboard.topSectors}
                metric={leaderboardMetric}
                onRowClick={(row) => applyLeaderboardFilter("sector", row.name)}
              />
              <LeaderboardCard
                title="Top Companies"
                icon={FiBriefcase}
                rows={dashboard.topCompanies}
                metric={leaderboardMetric}
                onRowClick={(row) => applyLeaderboardFilter("company", row.name)}
              />
              <LeaderboardCard
                title="Top Partners"
                icon={FiBriefcase}
                rows={dashboard.topPartners}
                metric={leaderboardMetric}
                onRowClick={(row) => applyPartnerFilter(row.name)}
              />
            </div>
          </div>
        )}

        {!isViewer && (
          <ScenarioPanel
            selectedOpportunities={selectedOpportunities}
            selectableCount={selectableOpportunities.length}
            onClear={() => setSelectedOpportunityIds([])}
            onSelectAll={() => selectOpportunities(() => true)}
            onSelectNegotiation={() =>
              selectOpportunities(
                (opportunity) => opportunity.stage === "Negotiation",
              )
            }
            onSelectProposalAndNegotiation={() =>
              selectOpportunities((opportunity) =>
                ["Proposal", "Negotiation"].includes(opportunity.stage),
              )
            }
          />
        )}

        {!isViewer && (
          <OpportunityTable
            opportunities={dashboard.opportunities}
            selectedIds={selectedOpportunitySet}
            selectableCount={selectableOpportunities.length}
            onToggleOpportunity={toggleOpportunity}
            onToggleAll={() => {
              if (selectedOpportunityIds.length === selectableOpportunities.length) {
                setSelectedOpportunityIds([]);
                return;
              }
              selectOpportunities(() => true);
            }}
          />
        )}

        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
          Generated {new Date(dashboard.meta.generatedAt).toLocaleString("en-GB")} · {dashboard.meta.rowCount} filtered records
        </div>
      </div>
    </AdminContainer>
  );
}

function CustomStatCard({
  title,
  value,
  icon: Icon,
  colorClass,
  subValue,
  trend,
}: CustomStatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800/50 shadow-sm relative overflow-hidden group transition-all duration-300"
    >
      <div className={`absolute -right-4 -bottom-4 text-9xl opacity-[0.03] group-hover:scale-110 transition-transform duration-700 ${colorClass}`}>
        <Icon />
      </div>
      <div className="flex items-center justify-between relative z-10 mb-4">
        <div className={`w-12 h-12 rounded-2xl bg-opacity-10 flex items-center justify-center text-xl shadow-inner ${colorClass.replace("text-", "bg-")} ${colorClass}`}>
          <Icon />
        </div>
        {trend && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-wider">
            <FiTrendingUp /> {trend}
          </div>
        )}
      </div>
      <div className="relative z-10">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">
          {title}
        </p>
        <h4 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white leading-none">
          {value}
        </h4>
        {subValue && (
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
            {subValue}
          </p>
        )}
      </div>
    </motion.div>
  );
}

function ClosingForecastPanel({
  dashboard,
  chartData,
}: {
  dashboard: KpiDashboardData;
  chartData: Array<{
    name: string;
    expectedCommission: number;
    upside: number;
    expectedRevenue: number;
    count: number;
  }>;
}) {
  const horizons = dashboard.closingForecast.horizons;
  const thisMonth = horizons.find((bucket) => bucket.key === "this_month");
  const thisQuarter = horizons.find((bucket) => bucket.key === "this_quarter");
  const thisYear = horizons.find((bucket) => bucket.key === "this_year");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-50 dark:border-gray-800 shadow-sm p-8"
    >
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 mb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-amber-500">
            <FiCalendar />
            <span className="text-xs font-black uppercase tracking-widest">
              Closing Forecast
            </span>
          </div>
          <h3 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
            Expected close timing
          </h3>
          <p className="text-sm font-bold text-gray-500 max-w-2xl">
            Cumulative horizons based on target close dates. This month is included in quarter and year totals.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 w-full lg:w-auto">
          <ForecastSummaryPill
            label="Month"
            value={formatGBPAmount(thisMonth?.expectedCommissionGBP || 0)}
          />
          <ForecastSummaryPill
            label="Quarter"
            value={formatGBPAmount(thisQuarter?.expectedCommissionGBP || 0)}
          />
          <ForecastSummaryPill
            label="Year"
            value={formatGBPAmount(thisYear?.expectedCommissionGBP || 0)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 h-[310px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.06} />
              <XAxis
                dataKey="name"
                stroke="#9CA3AF"
                fontSize={10}
                fontWeight="900"
                axisLine={false}
                tickLine={false}
                interval={0}
              />
              <YAxis
                stroke="#9CA3AF"
                fontSize={10}
                fontWeight="900"
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => formatGBPAmount(Number(value))}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#111827",
                  border: "none",
                  borderRadius: "1rem",
                }}
                formatter={(value) => formatGBPAmount(Number(value))}
              />
              <Bar
                dataKey="expectedCommission"
                name="Expected Commission"
                fill="#8B5CF6"
                radius={[10, 10, 0, 0]}
              />
              <Bar
                dataKey="upside"
                name="Commission Upside"
                fill="#F59E0B"
                radius={[10, 10, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-3">
          {horizons.map((bucket) => (
            <div
              key={bucket.key}
              className="flex items-center justify-between gap-4 rounded-2xl bg-gray-50 dark:bg-gray-950/70 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-black text-gray-900 dark:text-white">
                  {bucket.label}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  {bucket.count} deals · {formatGBPAmount(bucket.expectedValueGBP)} expected
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-violet-500">
                  {formatGBPAmount(bucket.expectedCommissionGBP)}
                </p>
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">
                  +{formatGBPAmount(bucket.upsideCommissionGBP)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function ForecastSummaryPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-gray-50 dark:bg-gray-950/70 px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
        {label}
      </p>
      <p className="text-sm font-black text-gray-900 dark:text-white whitespace-nowrap">
        {value}
      </p>
    </div>
  );
}

function FilterBar({
  filters,
  dashboard,
  canUseAdminFilters,
  onFilterChange,
  onReset,
}: {
  filters: DashboardFilters;
  dashboard: KpiDashboardData;
  canUseAdminFilters: boolean;
  onFilterChange: <K extends keyof DashboardFilters>(
    key: K,
    value: DashboardFilters[K],
  ) => void;
  onReset: () => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm p-5">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2 text-gray-900 dark:text-white">
          <FiFilter className="text-amber-500" />
          <span className="text-xs font-black uppercase tracking-widest">
            KPI Filters
          </span>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-amber-500 transition-colors"
        >
          Reset
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <SelectField
          label="Date"
          value={filters.preset}
          onChange={(value) => onFilterChange("preset", value as DatePreset)}
          options={[
            ["all", "All time"],
            ["month", "This month"],
            ["quarter", "Last 3 months"],
            ["year", "This year"],
            ["custom", "Custom"],
          ]}
        />

        {filters.preset === "custom" && (
          <>
            <InputField
              label="From"
              type="date"
              value={filters.from}
              onChange={(value) => onFilterChange("from", value)}
            />
            <InputField
              label="To"
              type="date"
              value={filters.to}
              onChange={(value) => onFilterChange("to", value)}
            />
          </>
        )}

        {canUseAdminFilters && (
          <SelectField
            label="Owner"
            value={filters.scope === "mine" ? "mine" : filters.userId}
            onChange={(value) => {
              if (value === "mine") {
                onFilterChange("scope", "mine");
                onFilterChange("userId", "");
                return;
              }
              onFilterChange("scope", "all");
              onFilterChange("userId", value);
            }}
            options={[
              ["", "All owners"],
              ["mine", "My deals"],
              ...dashboard.filterOptions.users.map((user) => [
                String(user.id),
                user.name,
              ]),
            ]}
          />
        )}

        <SelectField
          label="Lead Manager"
          value={filters.leadManager}
          onChange={(value) => onFilterChange("leadManager", value)}
          options={[
            ["", "All managers"],
            ...dashboard.filterOptions.leadManagers.map((manager) => [
              manager,
              manager,
            ]),
          ]}
        />

        <SelectField
          label="Member"
          value={filters.member}
          onChange={(value) => onFilterChange("member", value)}
          options={[
            ["", "All members"],
            ...dashboard.filterOptions.members.map((member) => [member, member]),
          ]}
        />

        <SelectField
          label="Sector"
          value={filters.sector}
          onChange={(value) => onFilterChange("sector", value)}
          options={[
            ["", "All sectors"],
            ...dashboard.filterOptions.sectors.map((sector) => [sector, sector]),
          ]}
        />

        <SelectField
          label="Company"
          value={filters.company}
          onChange={(value) => onFilterChange("company", value)}
          options={[
            ["", "All companies"],
            ...dashboard.filterOptions.companies.map((company) => [
              company,
              company,
            ]),
          ]}
        />

        <SelectField
          label="Stage"
          value={filters.stage}
          onChange={(value) => onFilterChange("stage", value)}
          options={[
            ["", "All stages"],
            ...dashboard.filterOptions.stages.map((stage) => [stage, stage]),
          ]}
        />

        <SelectField
          label="Status"
          value={filters.status}
          onChange={(value) => onFilterChange("status", value)}
          options={[
            ["", "All status"],
            ...dashboard.filterOptions.statuses.map((status) => [status, status]),
          ]}
        />

        <SelectField
          label="Partner"
          value={filters.partnerId}
          onChange={(value) => onFilterChange("partnerId", value)}
          options={[
            ["", "All partners"],
            ...dashboard.filterOptions.partners.map((partner) => [
              String(partner.id),
              partner.name,
            ]),
          ]}
        />
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<string[]>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1">
      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full h-11 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 px-3 text-sm font-bold text-gray-700 dark:text-gray-200 outline-none focus:border-amber-400"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={`${label}-${optionValue || optionLabel}`} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function InputField({
  label,
  value,
  type,
  onChange,
}: {
  label: string;
  value: string;
  type: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1">
      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full h-11 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 px-3 text-sm font-bold text-gray-700 dark:text-gray-200 outline-none focus:border-amber-400"
      />
    </label>
  );
}

function LeaderboardMetricControl({
  value,
  onChange,
}: {
  value: LeaderboardMetric;
  onChange: (value: LeaderboardMetric) => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">
          Top List Metric
        </p>
        <p className="text-sm font-bold text-gray-500 mt-1">
          Rank segment tables and account charts by the selected metric.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {LEADERBOARD_METRIC_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${
              value === option.value
                ? "bg-amber-500 text-white"
                : "bg-gray-100 dark:bg-gray-950 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function LeaderboardCard({
  title,
  icon: Icon,
  rows,
  metric,
  onRowClick,
}: {
  title: string;
  icon: IconType;
  rows: KpiLeaderboardRow[];
  metric: LeaderboardMetric;
  onRowClick?: (row: KpiLeaderboardRow) => void;
}) {
  const visibleRows = sortLeaderboardRows(rows, metric).slice(0, 10);
  const metricLabel = getLeaderboardMetricLabel(metric);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-50 dark:border-gray-800 shadow-sm"
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest dark:text-white">
            {title}
          </h3>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">
            {metricLabel}
          </p>
        </div>
        <Icon className="text-indigo-500" />
      </div>
      <div className="space-y-5">
        {visibleRows.length === 0 ? (
          <p className="text-sm font-bold text-gray-400">No records</p>
        ) : (
          visibleRows.map((row, index) => (
            <button
              key={`${title}-${row.name}`}
              type="button"
              onClick={() => onRowClick?.(row)}
              className="w-full flex items-center justify-between group gap-4 text-left rounded-2xl -mx-2 px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-950/70 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-slate-500 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                  {index + 1}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-gray-900 dark:text-white truncate">
                    {row.name}
                  </p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                    {row.count} deals · {row.wonCount} won
                  </p>
                </div>
              </div>
              <span className="text-sm font-black text-indigo-500 whitespace-nowrap">
                {formatLeaderboardMetricValue(row, metric)}
              </span>
            </button>
          ))
        )}
      </div>
    </motion.div>
  );
}

function ScenarioPanel({
  selectedOpportunities,
  selectableCount,
  onClear,
  onSelectAll,
  onSelectNegotiation,
  onSelectProposalAndNegotiation,
}: {
  selectedOpportunities: KpiOpportunityDetail[];
  selectableCount: number;
  onClear: () => void;
  onSelectAll: () => void;
  onSelectNegotiation: () => void;
  onSelectProposalAndNegotiation: () => void;
}) {
  const totals = selectedOpportunities.reduce(
    (acc, opportunity) => ({
      dealValue: acc.dealValue + opportunity.valueGBP,
      expectedRevenue: acc.expectedRevenue + opportunity.expectedValueGBP,
      maxCommission: acc.maxCommission + opportunity.commissionGBP,
      expectedCommission:
        acc.expectedCommission + opportunity.expectedCommissionGBP,
    }),
    {
      dealValue: 0,
      expectedRevenue: 0,
      maxCommission: 0,
      expectedCommission: 0,
    },
  );
  const upsideCommission = totals.maxCommission - totals.expectedCommission;
  const selectedCount = selectedOpportunities.length;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-50 dark:border-gray-800 shadow-sm p-8">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-amber-500">
            <FiTarget />
            <span className="text-xs font-black uppercase tracking-widest">
              Scenario Builder
            </span>
          </div>
          <h3 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
            If selected active deals close
          </h3>
          <p className="text-sm font-bold text-gray-500 max-w-2xl">
            Select active opportunities below to model best-case value,
            weighted forecast and remaining commission upside.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <ScenarioButton onClick={onSelectNegotiation}>
            Negotiation
          </ScenarioButton>
          <ScenarioButton onClick={onSelectProposalAndNegotiation}>
            Proposal + Negotiation
          </ScenarioButton>
          <ScenarioButton onClick={onSelectAll}>
            All Active ({selectableCount})
          </ScenarioButton>
          <ScenarioButton onClick={onClear}>Clear</ScenarioButton>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-gray-100 dark:divide-gray-800 border-y border-gray-100 dark:border-gray-800">
        <ScenarioMetric label="Selected" value={selectedCount.toString()} />
        <ScenarioMetric
          label="Max Deal Value"
          value={formatGBPAmount(totals.dealValue)}
        />
        <ScenarioMetric
          label="Expected Revenue"
          value={formatGBPAmount(totals.expectedRevenue)}
        />
        <ScenarioMetric
          label="Max Commission"
          value={formatGBPAmount(totals.maxCommission)}
        />
        <ScenarioMetric
          label="Commission Upside"
          value={formatGBPAmount(upsideCommission)}
          accent
        />
      </div>
    </div>
  );
}

function ScenarioButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-10 px-4 rounded-xl bg-gray-100 dark:bg-gray-950 text-gray-600 dark:text-gray-300 hover:bg-amber-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest"
    >
      {children}
    </button>
  );
}

function ScenarioMetric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="py-5 md:px-5">
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
        {label}
      </p>
      <p
        className={`text-xl font-black tracking-tight ${
          accent ? "text-amber-500" : "text-gray-900 dark:text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function OpportunityTable({
  opportunities,
  selectedIds,
  selectableCount,
  onToggleOpportunity,
  onToggleAll,
}: {
  opportunities: KpiOpportunityDetail[];
  selectedIds: Set<number>;
  selectableCount: number;
  onToggleOpportunity: (opportunityId: number) => void;
  onToggleAll: () => void;
}) {
  const activeRows = opportunities.filter(
    (opportunity) => opportunity.status === "Active",
  );
  const allSelected =
    selectableCount > 0 &&
    activeRows.length > 0 &&
    activeRows.every((opportunity) => selectedIds.has(opportunity.id));

  return (
    <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-50 dark:border-gray-800 shadow-sm overflow-hidden">
      <div className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest dark:text-white">
            High Impact Opportunities
          </h3>
          <p className="text-xs font-bold text-gray-500 mt-1">
            Ordered by expected commission impact
          </p>
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
          Top {opportunities.length}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1040px]">
          <thead className="bg-gray-50 dark:bg-gray-950/70">
            <tr className="text-left text-[10px] font-black uppercase tracking-widest text-gray-400">
              <th className="pl-8 pr-3 py-4">
                <input
                  type="checkbox"
                  checked={allSelected}
                  disabled={selectableCount === 0}
                  onChange={onToggleAll}
                  className="h-4 w-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                  aria-label="Select all active opportunities"
                />
              </th>
              <th className="px-8 py-4">Opportunity</th>
              <th className="px-4 py-4">Owner</th>
              <th className="px-4 py-4">Member</th>
              <th className="px-4 py-4">Stage</th>
              <th className="px-4 py-4">Status</th>
              <th className="px-4 py-4 text-right">Deal</th>
              <th className="px-4 py-4 text-right">Expected</th>
              <th className="px-8 py-4 text-right">Commission</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {opportunities.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-8 py-10 text-center text-sm font-bold text-gray-400">
                  No opportunities match the current filters.
                </td>
              </tr>
            ) : (
              opportunities.map((opportunity) => {
                const isSelectable = opportunity.status === "Active";
                const isSelected = selectedIds.has(opportunity.id);

                return (
                <tr
                  key={opportunity.id}
                  className={`text-sm ${
                    isSelected ? "bg-amber-50/60 dark:bg-amber-500/5" : ""
                  }`}
                >
                  <td className="pl-8 pr-3 py-5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={!isSelectable}
                      onChange={() => onToggleOpportunity(opportunity.id)}
                      className="h-4 w-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500 disabled:opacity-30"
                      aria-label={`Select ${opportunity.title}`}
                    />
                  </td>
                  <td className="px-8 py-5">
                    <p className="font-black text-gray-900 dark:text-white">
                      {opportunity.title}
                    </p>
                    <p className="text-xs font-bold text-gray-400">
                      {opportunity.companyName} · {opportunity.sector}
                    </p>
                  </td>
                  <td className="px-4 py-5 font-bold text-gray-600 dark:text-gray-300">
                    {opportunity.leadManager}
                  </td>
                  <td className="px-4 py-5 font-bold text-gray-600 dark:text-gray-300">
                    {opportunity.memberName}
                  </td>
                  <td className="px-4 py-5">
                    <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500 text-[10px] font-black uppercase tracking-widest">
                      {opportunity.stage}
                    </span>
                  </td>
                  <td className="px-4 py-5">
                    <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                      {opportunity.status}
                    </span>
                  </td>
                  <td className="px-4 py-5 text-right font-black text-gray-900 dark:text-white">
                    {formatGBPAmount(opportunity.valueGBP)}
                  </td>
                  <td className="px-4 py-5 text-right font-black text-amber-500">
                    {formatGBPAmount(opportunity.expectedValueGBP)}
                  </td>
                  <td className="px-8 py-5 text-right font-black text-violet-500">
                    {formatGBPAmount(opportunity.expectedCommissionGBP)}
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
