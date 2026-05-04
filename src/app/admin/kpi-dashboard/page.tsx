"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { CustomerOpportunity } from "@/types/database";
import { motion } from "framer-motion";
import AdminContainer from "@/app/components/admin/AdminContainer";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import {
  FiTrendingUp,
  FiPieChart,
  FiBarChart2,
  FiActivity,
  FiDollarSign,
  FiCheckCircle,
  FiXCircle,
  FiTarget,
  FiUser,
  FiBriefcase,
  FiZap,
  FiLayers,
  FiPackage
} from "react-icons/fi";

const COLORS = [
  "#F59E0B", // Amber
  "#10B981", // Emerald
  "#EF4444", // Rose
  "#3B82F6", // Blue
  "#8B5CF6", // Violet
  "#EC4899", // Pink
];

export default function KPIDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [opportunities, setOpportunities] = useState<CustomerOpportunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/admin");
      return;
    }
    fetchOpportunities();
  }, [user, authLoading, router]);

  const fetchOpportunities = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("/api/customer-opportunities", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setOpportunities(data.opportunities || []);
      } else {
        toast.error(data.error || "Failed to fetch opportunities");
      }
    } catch (error) {
      toast.error("Failed to fetch opportunities");
    } finally {
      setLoading(false);
    }
  };

  const parseVolume = (value: string | undefined) => {
    if (!value) return 0;
    const numericStr = value.replace(/[^0-9.-]+/g, "");
    const parsed = parseFloat(numericStr);
    return isNaN(parsed) ? 0 : parsed;
  };

  const stats = useMemo(() => {
    const totalPotential = opportunities.reduce(
      (acc, opp) => acc + parseVolume(opp.estimated_deal_size),
      0,
    );
    const wonVolume = opportunities
      .filter((opp) => opp.status === "Won")
      .reduce((acc, opp) => acc + parseVolume(opp.estimated_deal_size), 0);
    const lostVolume = opportunities
      .filter((opp) => opp.status === "Lost")
      .reduce((acc, opp) => acc + parseVolume(opp.estimated_deal_size), 0);
    const activeCount = opportunities.filter(
      (opp) => opp.status === "Active",
    ).length;

    const wonCount = opportunities.filter((opp) => opp.status === "Won").length;
    const lostCount = opportunities.filter(
      (opp) => opp.status === "Lost",
    ).length;
    const conversionRate =
      wonCount + lostCount > 0 ? (wonCount / (wonCount + lostCount)) * 100 : 0;

    // Most sold product (opportunity_title among Won deals)
    const wonOpportunities = opportunities.filter(opp => opp.status === "Won");
    const productMap: { [key: string]: number } = {};
    wonOpportunities.forEach(opp => {
      const title = opp.opportunity_title || "Unknown";
      productMap[title] = (productMap[title] || 0) + 1;
    });
    const mostSoldProduct = Object.entries(productMap)
      .sort((a, b) => b[1] - a[1])[0] || ["N/A", 0];

    // Volume by Member
    const memberMap: { [key: string]: number } = {};
    opportunities.forEach((opp) => {
      const resp = opp.responsible_person || "Unassigned";
      memberMap[resp] =
        (memberMap[resp] || 0) + parseVolume(opp.estimated_deal_size);
    });
    const volumeByMember = Object.entries(memberMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Volume by Company
    const companyMap: { [key: string]: number } = {};
    opportunities.forEach((opp) => {
      companyMap[opp.company_name] =
        (companyMap[opp.company_name] || 0) +
        parseVolume(opp.estimated_deal_size);
    });
    const volumeByCompany = Object.entries(companyMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Just top 5 for better UI

    // Pipeline Data
    const pipelineStages = ["Lead", "Opportunity", "Proposal", "Negotiation"];
    const pipelineData = pipelineStages.map((stage) => ({
      name: stage,
      count: opportunities.filter(
        (opp) => opp.deal_stage === stage && opp.status === "Active",
      ).length,
      volume: opportunities
        .filter((opp) => opp.deal_stage === stage && opp.status === "Active")
        .reduce((acc, opp) => acc + parseVolume(opp.estimated_deal_size), 0),
    }));

    // Status Distribution
    const statusData = [
      { name: "Active", value: activeCount },
      { name: "Won", value: wonCount },
      { name: "Lost", value: lostCount },
    ];

    return {
      totalPotential,
      wonVolume,
      lostVolume,
      activeCount,
      conversionRate,
      volumeByMember,
      volumeByCompany,
      pipelineData,
      statusData,
      mostSoldProduct: mostSoldProduct[0],
      mostSoldCount: mostSoldProduct[1],
    };
  }, [opportunities]);

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-white dark:bg-gray-950">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  const userRole = user?.role || (user?.is_admin ? "admin" : "viewer");
  const isViewer = userRole === "viewer";
  const hasAccess = [
    "admin",
    "opportunity_manager",
    "sales_member",
    "viewer",
  ].includes(userRole);

  if (!hasAccess) return null;

  const CustomStatCard = ({ title, value, icon: Icon, colorClass, subValue, trend }: any) => (
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

  return (
    <AdminContainer>
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-10 animate-in fade-in duration-700">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-amber-500 font-black tracking-[0.3em] text-[10px] uppercase">
              <span className="w-6 h-[2px] bg-amber-500"></span>
              Performance Intelligence
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white">
               Analytics <span className="text-amber-500 italic">Dashboard</span>
            </h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium max-w-lg">
              Strategic oversight into deal cycles, conversion metrics and organizational growth.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="px-5 py-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-3">
               <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
               <span className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">Live Engine Active</span>
             </div>
          </div>
        </div>

        {/* Core Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {!isViewer ? (
            <>
              <CustomStatCard
                title="Potential Pipeline"
                value={`$${stats.totalPotential.toLocaleString()}`}
                icon={FiDollarSign}
                colorClass="text-amber-500"
                subValue="Total estimated market value"
                trend="+12%"
              />
              <CustomStatCard
                title="Revenue Captured"
                value={`$${stats.wonVolume.toLocaleString()}`}
                icon={FiCheckCircle}
                colorClass="text-emerald-500"
                subValue="Successfully closed deals"
              />
              <CustomStatCard
                title="Active Pipeline"
                value={stats.activeCount}
                icon={FiZap}
                colorClass="text-indigo-500"
                subValue="Ongoing opportunities"
              />
              <CustomStatCard
                title="Performance"
                value={`${stats.conversionRate.toFixed(1)}%`}
                icon={FiTarget}
                colorClass="text-violet-500"
                subValue="Deal conversion efficiency"
              />
              <CustomStatCard
                title="Top Performer"
                value={stats.mostSoldProduct}
                icon={FiPackage}
                colorClass="text-indigo-500"
                subValue={`${stats.mostSoldCount} Successful closures`}
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

        {/* Visual Insights Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Pipeline Chart - Span 2 */}
          {!isViewer ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-2 bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-50 dark:border-gray-800 shadow-sm"
            >
              <div className="flex items-center justify-between mb-10">
                <div>
                   <h3 className="text-xl font-black tracking-tight dark:text-white uppercase tracking-widest text-sm">Revenue Distribution</h3>
                   <p className="text-xs font-bold text-gray-500">Volume across active pipeline stages</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                  <FiTrendingUp />
                </div>
              </div>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.pipelineData}>
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.05} />
                    <XAxis 
                      dataKey="name" 
                      stroke="#9CA3AF" 
                      fontSize={10} 
                      fontWeight="black" 
                      axisLine={false} 
                      tickLine={false} 
                      dy={15}
                    />
                    <YAxis 
                      stroke="#9CA3AF" 
                      fontSize={10} 
                      fontWeight="black" 
                      axisLine={false} 
                      tickLine={false}
                      tickFormatter={(val) => `$${val > 999 ? (val/1000).toFixed(0) + 'k' : val}`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#111827", border: "none", borderRadius: "1.25rem", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)" }}
                      itemStyle={{ color: "#8B5CF6", fontWeight: "900" }}
                      labelStyle={{ color: "#9CA3AF", marginBottom: "4px", fontSize: "10px", fontWeight: "bold" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="volume"
                      stroke="#8B5CF6"
                      strokeWidth={4}
                      fillOpacity={1}
                      fill="url(#chartGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          ) : (
            <div className="lg:col-span-2 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-[2.5rem] p-12 text-white relative overflow-hidden flex flex-col justify-end min-h-[400px]">
               <FiTarget className="absolute -top-10 -right-10 text-[20rem] opacity-10" />
               <div className="relative z-10 space-y-4">
                  <h3 className="text-4xl font-black tracking-tight leading-none">Operational <br/>Overview Active</h3>
                  <p className="text-indigo-100 font-medium max-w-sm">Welcome to the London Bridge Club control center. Your viewer access provides real-time visibility into project volumes.</p>
                  <button onClick={() => router.push('/admin/customer-pool')} className="mt-4 px-6 py-3 bg-white text-indigo-600 font-black rounded-2xl hover:bg-opacity-90 transition-all text-sm uppercase tracking-widest shadow-lg">View Customer Pool</button>
               </div>
            </div>
          )}

          {/* Status Breakdown - Pie */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-50 dark:border-gray-800 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black uppercase tracking-widest dark:text-white">Deal Success</h3>
               <FiPieChart className="text-amber-500" />
            </div>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                    cornerRadius={8}
                  >
                    {stats.statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#111827", border: "none", borderRadius: "1rem", color: "#fff" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-3">
               {stats.statusData.map((s, i) => (
                 <div key={i} className="flex items-center justify-between text-xs font-bold">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                      <span className="text-gray-500">{s.name}</span>
                    </div>
                    <span className="text-gray-900 dark:text-white">{s.value}</span>
                 </div>
               ))}
            </div>
          </motion.div>

          {/* Bottom Insights Row */}
          {!isViewer && (
            <>
              {/* Leaderboard */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-50 dark:border-gray-800 shadow-sm lg:col-span-1"
              >
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-sm font-black uppercase tracking-widest dark:text-white">Active Leaders</h3>
                  <FiUser className="text-indigo-500" />
                </div>
                <div className="space-y-6">
                   {stats.volumeByMember.slice(0, 4).map((m, i) => (
                     <div key={i} className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-slate-500 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                              {m.name[0]}
                           </div>
                           <div>
                              <p className="text-sm font-black text-gray-900 dark:text-white">{m.name}</p>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider italic">Executive Representative</p>
                           </div>
                        </div>
                        <span className="text-sm font-black text-indigo-500">${(m.value/1000).toFixed(1)}k</span>
                     </div>
                   ))}
                </div>
              </motion.div>

              {/* Company Performance Bar Chart */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="lg:col-span-2 bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-50 dark:border-gray-800 shadow-sm"
              >
                <div className="flex items-center justify-between mb-10">
                  <h3 className="text-sm font-black uppercase tracking-widest dark:text-white">Strategic Accounts</h3>
                  <FiBriefcase className="text-emerald-500" />
                </div>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.volumeByCompany} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        stroke="#9CA3AF" 
                        fontSize={10} 
                        fontWeight="black" 
                        axisLine={false} 
                        tickLine={false}
                        width={120}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#111827", border: "none", borderRadius: "1rem" }}
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
      </div>
    </AdminContainer>
  );
}
