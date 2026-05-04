"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import { CustomerOpportunity } from "@/types/database";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiSearch,
  FiFilter,
  FiUser,
  FiBriefcase,
  FiCalendar,
  FiActivity,
  FiArrowUp,
  FiArrowDown,
  FiChevronLeft,
  FiChevronRight,
  FiTrendingUp,
} from "react-icons/fi";

type Stage =
  | "Lead"
  | "Opportunity"
  | "Proposal"
  | "Negotiation"
  | "Won"
  | "Lost";

const STAGES: Stage[] = [
  "Lead",
  "Opportunity",
  "Proposal",
  "Negotiation",
  "Won",
  "Lost",
];

export default function TrackingPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [opportunities, setOpportunities] = useState<CustomerOpportunity[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("All");
  const [sortConfig, setSortConfig] = useState<{
    key: keyof CustomerOpportunity;
    direction: "asc" | "desc";
  } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    fetchOpportunities();
    fetchPartners();
  }, [user, authLoading]);

  const fetchPartners = async () => {
    try {
      const { data, error } = await supabase
        .from('partners')
        .select('name, logo_key');
      if (data) setPartners(data);
    } catch (error) {
      console.error('Error fetching partners:', error);
    }
  };

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
        setOpportunities(data.opportunities);
      } else {
        toast.error(data.error || "Failed to fetch opportunities");
      }
    } catch (error) {
      toast.error("Failed to fetch opportunities");
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key: keyof CustomerOpportunity) => {
    let direction: "asc" | "desc" = "asc";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedAndFilteredOpportunities = useMemo(() => {
    let result = opportunities.filter((opp) => {
      const searchStr = searchTerm.toLowerCase();
      const matchesSearch =
        opp.customer_name.toLowerCase().includes(searchStr) ||
        opp.company_name.toLowerCase().includes(searchStr) ||
        opp.opportunity_title.toLowerCase().includes(searchStr) ||
        opp.responsible_person?.toLowerCase().includes(searchStr) ||
        "";

      const matchesStage =
        stageFilter === "All" ||
        opp.deal_stage === stageFilter ||
        (stageFilter === "Won" && opp.status === "Won") ||
        (stageFilter === "Lost" && opp.status === "Lost");

      return matchesSearch && matchesStage;
    });

    if (sortConfig) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key] || "";
        const bVal = b[sortConfig.key] || "";
        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [opportunities, searchTerm, stageFilter, sortConfig]);

  const getStageColor = (stage: string, status: string) => {
    if (status === "Won" || stage === "Won")
      return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    if (status === "Lost" || stage === "Lost")
      return "text-rose-500 bg-rose-500/10 border-rose-500/20";
    return "text-amber-500 bg-amber-500/10 border-amber-500/20";
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-transparent">
        <div className="relative w-16 h-16">
          <div className="absolute top-0 left-0 w-full h-full border-4 border-amber-500/20 rounded-full"></div>
          <div className="absolute top-0 left-0 w-full h-full border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  const getPartnerLogo = (companyName: string) => {
    const partner = partners.find(p => p.name.toLowerCase() === companyName.toLowerCase());
    if (partner?.logo_key) {
      return `${process.env.NEXT_PUBLIC_AWS_S3_URL || `https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || 'londonbridgeprojt'}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-1'}.amazonaws.com`}/${partner.logo_key}`;
    }
    return null;
  };

  const userRole = user?.role || (user?.is_admin ? "admin" : "viewer");
  const hasAccess = [
    "admin",
    "opportunity_manager",
    "sales_member",
    "viewer",
  ].includes(userRole);

  if (!hasAccess) return null;

  return (
    <div className="min-h-screen bg-transparent text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 text-amber-500 font-bold tracking-widest text-xs uppercase"
            >
              <span className="w-8 h-[2px] bg-amber-500"></span>
              Operations Hub
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-black tracking-tight dark:text-white"
            >
              Process <span className="text-amber-500 italic">Tracking</span>
            </motion.h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium max-w-lg">
              Monitor and analyze the real-time progress of every strategic
              project in the pipeline.
            </p>
          </div>

          <div className="w-full md:w-auto overflow-hidden">
            <div className="flex bg-white dark:bg-[#12181F] p-1.5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xl overflow-x-auto thin-scrollbar scroll-smooth">
              {["All", ...STAGES].map((stage) => (
                <button
                  key={stage}
                  onClick={() => setStageFilter(stage)}
                  className={`px-4 md:px-6 py-2.5 rounded-xl text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap flex-shrink-0 ${
                    stageFilter === stage
                      ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20"
                      : "text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  {stage}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Search & Stats Banner */}
        <div className="flex flex-col lg:flex-row gap-6 items-stretch">
          <div className="flex-[3] relative group">
            <FiSearch className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 text-2xl group-focus-within:text-amber-500 transition-colors" />
            <input
              type="text"
              placeholder="Search projects, clients or team members..."
              className="w-full h-full pl-16 pr-6 py-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl focus:ring-8 focus:ring-amber-500/5 outline-none transition-all font-bold text-gray-700 dark:text-white shadow-sm placeholder:text-gray-400 placeholder:font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex-[1] bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-6 text-black shadow-sm flex items-center justify-between overflow-hidden relative group">
            <FiTrendingUp className="absolute -right-4 -bottom-4 text-9xl opacity-10 group-hover:scale-110 transition-transform duration-700" />
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-80">
                ACTIVE PIPELINE
              </p>
              <h4 className="text-3xl font-black tracking-tighter">
                {sortedAndFilteredOpportunities.length} Projects
              </h4>
            </div>
            <div className="relative z-10 h-14 w-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-inner">
              <FiActivity className="text-2xl" />
            </div>
          </div>
        </div>

        {/* Table Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-[#1A2129]/50 border-b border-gray-100 dark:border-gray-800">
                  <th
                    className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 group cursor-pointer"
                    onClick={() => handleSort("opportunity_title")}
                  >
                    <div className="flex items-center gap-2">
                      Project Name{" "}
                      {sortConfig?.key === "opportunity_title" &&
                        (sortConfig.direction === "asc" ? (
                          <FiArrowUp />
                        ) : (
                          <FiArrowDown />
                        ))}
                    </div>
                  </th>
                  <th
                    className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 cursor-pointer"
                    onClick={() => handleSort("company_name")}
                  >
                    <div className="flex items-center gap-2">
                      Client / Company{" "}
                      {sortConfig?.key === "company_name" &&
                        (sortConfig.direction === "asc" ? (
                          <FiArrowUp />
                        ) : (
                          <FiArrowDown />
                        ))}
                    </div>
                  </th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                    Responsible
                  </th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                    Current Stage
                  </th>
                  <th
                    className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 cursor-pointer"
                    onClick={() => handleSort("estimated_deal_size")}
                  >
                    <div className="flex items-center gap-2">
                      Value{" "}
                      {sortConfig?.key === "estimated_deal_size" &&
                        (sortConfig.direction === "asc" ? (
                          <FiArrowUp />
                        ) : (
                          <FiArrowDown />
                        ))}
                    </div>
                  </th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                    Start Date
                  </th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                    Expected Closing
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                <AnimatePresence mode="popLayout">
                  {sortedAndFilteredOpportunities.map((opp, idx) => (
                    <motion.tr
                      key={opp.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="group hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-all duration-300"
                    >
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900 dark:text-white group-hover:text-amber-500 transition-colors">
                            {opp.opportunity_title}
                          </span>
                          <span className="text-[10px] font-bold text-gray-400 tracking-widest mt-1 uppercase">
                            ID: #{opp.id}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center overflow-hidden relative flex-shrink-0">
                            {getPartnerLogo(opp.company_name) ? (
                              <img 
                                src={getPartnerLogo(opp.company_name)!} 
                                alt={opp.company_name} 
                                className="w-full h-full object-contain p-1.5"
                              />
                            ) : (
                              <FiBriefcase className="text-indigo-500" />
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-700 dark:text-gray-200">
                              {opp.company_name}
                            </span>
                            <span className="text-xs text-gray-400">
                              {opp.customer_name}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 text-xs font-black uppercase">
                            {opp.responsible_person
                              ? opp.responsible_person[0]
                              : "?"}
                          </div>
                          <span className="text-sm font-bold text-gray-600 dark:text-gray-400">
                            {opp.responsible_person || "Unassigned"}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span
                          className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStageColor(opp.deal_stage || "Prospect", opp.status)}`}
                        >
                          {opp.status !== "Active"
                            ? opp.status
                            : opp.deal_stage || "Prospect"}
                        </span>
                      </td>
                      <td className="px-8 py-6 font-black text-amber-500 tracking-tighter">
                        {opp.estimated_deal_size || "—"}
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400">
                          <FiCalendar className="text-indigo-500" />
                          {new Date(opp.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400">
                          <FiCalendar className="text-amber-500" />
                          {opp.expected_closing_date
                            ? new Date(
                                opp.expected_closing_date,
                              ).toLocaleDateString()
                            : "TBD"}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>

            {sortedAndFilteredOpportunities.length === 0 && (
              <div className="py-32 text-center">
                <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FiActivity className="text-4xl text-gray-300" />
                </div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-widest">
                  No matching results
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">
                  Try adjusting your filters or search terms.
                </p>
              </div>
            )}
          </div>

          <div className="px-8 py-6 bg-gray-50/50 dark:bg-[#1A2129]/50 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Showing {sortedAndFilteredOpportunities.length} of{" "}
              {opportunities.length} opportunities
            </p>
            <div className="flex gap-2">
              <button
                className="p-2 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-400 hover:text-amber-500 transition-colors disabled:opacity-20"
                disabled
              >
                <FiChevronLeft size={20} />
              </button>
              <button
                className="p-2 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-400 hover:text-amber-500 transition-colors disabled:opacity-20"
                disabled
              >
                <FiChevronRight size={20} />
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      <style jsx global>{`
        .thin-scrollbar::-webkit-scrollbar {
          height: 2px;
        }
        .thin-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .thin-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .dark .thin-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
        }
        .thin-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}
