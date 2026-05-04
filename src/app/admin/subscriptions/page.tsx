"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase";
import { toast } from "react-hot-toast";
import {
  FiGrid, FiList, FiCreditCard, FiTrendingUp, FiAward,
  FiSearch, FiUser, FiMail, FiCalendar, FiXCircle, FiRefreshCw,
} from "react-icons/fi";
import type { Subscription, MembershipPlan } from "@/types/database";

interface SubscriptionWithUser extends Subscription {
  user?: { full_name: string; email: string; profile_image_key?: string };
  membership_plans?: MembershipPlan;
}

const PLAN_COLORS: Record<string, string> = {
  bronze:   "bg-amber-100 text-amber-800 border-amber-300",
  silver:   "bg-gray-100 text-gray-700 border-gray-300",
  gold:     "bg-yellow-100 text-yellow-800 border-yellow-300",
  platinum: "bg-blue-100 text-blue-800 border-blue-300",
  emerald:  "bg-green-100 text-green-800 border-green-300",
  diamond:  "bg-purple-100 text-purple-800 border-purple-300",
  personal: "bg-gray-100 text-gray-700 border-gray-300",
  corporate:"bg-blue-100 text-blue-800 border-blue-300",
};

export default function SubscriptionsPage() {
  const { user, isLoading: isLoadingAuth } = useAuth();
  const router = useRouter();

  const isAdmin = user?.is_admin || user?.role === "admin";

  const [subscriptions, setSubscriptions] = useState<SubscriptionWithUser[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [isLoading, setIsLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (!isLoadingAuth && !isAdmin && user) router.push("/admin");
  }, [isAdmin, isLoadingAuth, router, user]);

  const fetchSubscriptions = useCallback(async () => {
    if (!isAdmin) return;
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*, membership_plans(*)")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const withUsers = await Promise.all(
        (data ?? []).map(async (sub) => {
          const { data: userData } = await supabase
            .from("users")
            .select("full_name, email, profile_image_key")
            .eq("id", sub.user_id)
            .single();
          return { ...sub, user: userData ?? { full_name: "Unknown", email: "—" } };
        })
      );
      setSubscriptions(withUsers);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load subscriptions");
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { fetchSubscriptions(); }, [fetchSubscriptions]);

  const handleCancel = async (sub: SubscriptionWithUser) => {
    if (!confirm(`Cancel subscription for ${sub.user?.full_name}? This will immediately cancel via Stripe.`)) return;
    setCancellingId(sub.id);
    try {
      const token = localStorage.getItem("authToken") || "";
      const res = await fetch(`/api/admin/subscriptions/${sub.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSubscriptions(prev => prev.map(s => s.id === sub.id ? { ...s, status: "canceled" } : s));
        toast.success("Subscription cancelled");
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to cancel");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setCancellingId(null);
    }
  };

  const getPlanName = (sub: SubscriptionWithUser) =>
    sub.membership_plans?.name ||
    (sub.plan_type ? sub.plan_type.charAt(0).toUpperCase() + sub.plan_type.slice(1) : "—");

  const getPlanSlug = (sub: SubscriptionWithUser) =>
    sub.membership_plans?.slug || sub.plan_type || "personal";

  const getPlanPrice = (sub: SubscriptionWithUser) => {
    if (sub.membership_plans) {
      return sub.billing_cycle === "yearly"
        ? sub.membership_plans.yearly_price
        : sub.membership_plans.monthly_price;
    }
    return 0;
  };

  // Aylık gelire çevir (yıllık aboneler / 12)
  const getMonthlyRevenue = (sub: SubscriptionWithUser) => {
    const price = getPlanPrice(sub);
    return sub.billing_cycle === "yearly" ? Math.round((price / 12) * 100) / 100 : price;
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const token = localStorage.getItem("authToken") || "";
      const res = await fetch("/api/admin/subscriptions/sync", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (res.ok) {
        toast.success(result.message);
        await fetchSubscriptions();
      } else {
        toast.error(result.error || "Sync failed");
      }
    } catch {
      toast.error("An error occurred during sync");
    } finally {
      setIsSyncing(false);
    }
  };

  const formatDate = (d: string) => {
    if (!d) return "—";
    return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d));
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      active:     { label: "Active",     cls: "bg-teal-100 text-teal-800 border border-teal-200" },
      canceled:   { label: "Cancelled",  cls: "bg-red-100 text-red-800 border border-red-200" },
      past_due:   { label: "Past Due",   cls: "bg-amber-100 text-amber-800 border border-amber-200" },
      trialing:   { label: "Trial",      cls: "bg-blue-100 text-blue-800 border border-blue-200" },
      incomplete: { label: "Incomplete", cls: "bg-gray-100 text-gray-600 border border-gray-200" },
    };
    const s = map[status] || map.incomplete;
    return <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg ${s.cls}`}>{s.label}</span>;
  };

  const filtered = subscriptions.filter(s => {
    const q = searchTerm.toLowerCase();
    return (
      s.user?.full_name?.toLowerCase().includes(q) ||
      s.user?.email?.toLowerCase().includes(q) ||
      getPlanName(s).toLowerCase().includes(q) ||
      s.status?.toLowerCase().includes(q)
    );
  });

  const active = subscriptions.filter(s => s.status === "active");
  const totalMRR = active.reduce((sum, s) => sum + getMonthlyRevenue(s), 0);
  const corporateCount = active.filter(s => {
    const slug = getPlanSlug(s);
    return ["corporate", "platinum", "emerald", "diamond"].includes(slug);
  }).length;

  const S3_BASE = `https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || "londonbridgeprojt"}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || "eu-west-1"}.amazonaws.com`;

  if (isLoadingAuth) return (
    <div className="flex justify-center items-center h-[calc(100vh-100px)]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600" />
    </div>
  );
  if (!isAdmin) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-500 text-gray-900 dark:text-gray-100 min-h-screen">

      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Subscriptions</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium mt-1">Manage members and billing cycles</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchSubscriptions}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 rounded-xl text-sm font-medium transition-colors"
          >
            <FiRefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
          >
            <FiRefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync from Stripe'}
          </button>
          <Link
            href="/admin/plans"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm transition-colors"
          >
            Manage Plans
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { label: "Active Subscriptions", value: active.length, icon: FiCreditCard, color: "text-teal-600", bg: "bg-teal-50 dark:bg-teal-900/30" },
          { label: "Monthly Recurring Revenue", value: `£${totalMRR.toLocaleString()}`, icon: FiTrendingUp, color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/30" },
          { label: "Corporate Members", value: corporateCount, icon: FiAward, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-900/30" },
        ].map(stat => (
          <div key={stat.label} className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-5">
            <div className={`p-4 ${stat.bg} rounded-xl`}>
              <stat.icon size={24} className={stat.color} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{stat.label}</p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Search + View toggle */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:max-w-md">
          <input
            type="text"
            placeholder="Search by name, email or plan..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors placeholder:text-gray-400"
          />
          <FiSearch className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        </div>
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          {(["grid", "list"] as const).map(m => (
            <button key={m} onClick={() => setViewMode(m)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                viewMode === m ? "bg-white dark:bg-gray-700 text-teal-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}>
              {m === "grid" ? <><FiGrid /> Grid</> : <><FiList /> List</>}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-300 dark:border-gray-800 py-24 text-center">
          <FiCreditCard className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-bold">No subscriptions found</h3>
          <p className="mt-2 text-gray-500">Try a different search term.</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(sub => {
            const slug = getPlanSlug(sub);
            const planColor = PLAN_COLORS[slug] || PLAN_COLORS.personal;
            return (
              <div key={sub.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">
                <div className="p-6 flex-1 flex flex-col gap-4">
                  {/* Status + Plan badge */}
                  <div className="flex items-center justify-between">
                    {getStatusBadge(sub.status)}
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border capitalize ${planColor}`}>
                      {getPlanName(sub)}
                    </span>
                  </div>

                  {/* User */}
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                      {sub.user?.profile_image_key ? (
                        <img src={`${S3_BASE}/${sub.user.profile_image_key}`} alt="" className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = "none"; }} />
                      ) : <FiUser className="w-5 h-5 text-gray-400" />}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white text-sm leading-tight">{sub.user?.full_name || "—"}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><FiMail className="w-3 h-3" />{sub.user?.email || "—"}</p>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Plan</span>
                      <span className="font-bold">{getPlanName(sub)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Billing</span>
                      <span className="font-bold capitalize">{sub.billing_cycle || "monthly"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Price</span>
                      <span className="font-black text-teal-600">£{getPlanPrice(sub).toLocaleString()}/{sub.billing_cycle === "yearly" ? "yr" : "mo"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Renewal</span>
                      <span className="font-bold">{formatDate(sub.current_period_end)}</span>
                    </div>
                    {sub.entry_fee_paid != null && sub.entry_fee_paid > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Entry Fee</span>
                        <span className="font-bold text-amber-600">£{sub.entry_fee_paid}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1 border-t border-gray-100 dark:border-gray-800">
                    {sub.status === "active" && (
                      <button
                        onClick={() => handleCancel(sub)}
                        disabled={cancellingId === sub.id}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50 border border-red-200 rounded-xl transition-colors disabled:opacity-50"
                      >
                        {cancellingId === sub.id
                          ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600" />
                          : <FiXCircle className="w-4 h-4" />
                        }
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="px-6 py-4 font-bold">Member</th>
                  <th className="px-6 py-4 font-bold">Plan</th>
                  <th className="px-6 py-4 font-bold">Billing</th>
                  <th className="px-6 py-4 font-bold">Price</th>
                  <th className="px-6 py-4 font-bold">Entry Fee</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold">Renewal</th>
                  <th className="px-6 py-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.map(sub => {
                  const slug = getPlanSlug(sub);
                  const planColor = PLAN_COLORS[slug] || PLAN_COLORS.personal;
                  return (
                    <tr key={sub.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors ${sub.status !== "active" ? "opacity-60" : ""}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                            {sub.user?.profile_image_key ? (
                              <img src={`${S3_BASE}/${sub.user.profile_image_key}`} alt="" className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = "none"; }} />
                            ) : <FiUser className="w-4 h-4 text-gray-400" />}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white">{sub.user?.full_name || "—"}</p>
                            <p className="text-xs text-gray-500">{sub.user?.email || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border capitalize ${planColor}`}>
                          {getPlanName(sub)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-medium text-gray-600 capitalize bg-gray-100 px-2 py-1 rounded-lg">
                          {sub.billing_cycle || "monthly"}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-black text-teal-600">
                        £{getPlanPrice(sub).toLocaleString()}
                        <span className="text-xs font-normal text-gray-400">/{sub.billing_cycle === "yearly" ? "yr" : "mo"}</span>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold">
                        {sub.entry_fee_paid != null && sub.entry_fee_paid > 0
                          ? <span className="text-amber-600">£{sub.entry_fee_paid}</span>
                          : <span className="text-gray-300">—</span>
                        }
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(sub.status)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <FiCalendar className="w-3 h-3" />
                          {formatDate(sub.current_period_end)}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">Started: {formatDate(sub.created_at)}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {sub.status === "active" && (
                          <button
                            onClick={() => handleCancel(sub)}
                            disabled={cancellingId === sub.id}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Cancel subscription"
                          >
                            {cancellingId === sub.id
                              ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500 inline-block" />
                              : <FiXCircle className="w-4 h-4" />
                            }
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
