"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { CommissionStatus } from "@/types/database";
import { toast } from "react-hot-toast";
import { FiPercent, FiCheck, FiDollarSign, FiEdit2, FiFilter, FiX } from "react-icons/fi";

type Commission = {
  id: number;
  project_id: number;
  project_name: string;
  customer_name: string;
  user_id: number;
  user_name: string;
  share_percentage: number;
  project_commission_amount: number;
  amount: number;
  status: CommissionStatus;
  due_date: string | null;
  paid_date: string | null;
  notes: string | null;
  created_at: string;
};
type ProjectOption = { id: number; name: string };
type StaffOption = { id: number; full_name: string };
type Tab = "individual" | "by-project";

const gbp = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 2 }).format(n);

const STATUS_BADGE: Record<CommissionStatus, string> = {
  Pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  Approved: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  Paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

const emptyFilters = { status: "", project_id: "", user_id: "", from: "", to: "" };

export default function CommissionManagementPage() {
  const { user, isLoading: isLoadingAuth } = useAuth();
  const router = useRouter();

  const userRole = user?.role || (user?.is_admin ? "admin" : "viewer");
  const hasAccess = userRole === "admin" || userRole === "opportunity_manager";

  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [filters, setFilters] = useState(emptyFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("individual");
  const [editing, setEditing] = useState<Commission | null>(null);
  const [editDue, setEditDue] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const authHeaders = useCallback(() => ({ Authorization: `Bearer ${localStorage.getItem("authToken")}` }), []);

  useEffect(() => {
    if (!isLoadingAuth && !hasAccess && user) router.push("/admin");
  }, [hasAccess, isLoadingAuth, user, router]);

  const fetchCommissions = useCallback(async () => {
    setIsLoading(true);
    try {
      const qs = new URLSearchParams();
      if (filters.status) qs.set("status", filters.status);
      if (filters.project_id) qs.set("project_id", filters.project_id);
      if (filters.user_id) qs.set("user_id", filters.user_id);
      if (filters.from) qs.set("from", filters.from);
      if (filters.to) qs.set("to", filters.to);
      const res = await fetch(`/api/admin/commissions?${qs.toString()}`, { headers: authHeaders() });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setCommissions(data.commissions || []);
    } catch {
      toast.error("Failed to load commissions");
    } finally {
      setIsLoading(false);
    }
  }, [filters, authHeaders]);

  const fetchLookups = useCallback(async () => {
    try {
      const [pRes, uRes] = await Promise.all([
        fetch("/api/admin/projects", { headers: authHeaders() }),
        fetch("/api/admin/users", { credentials: "same-origin" }),
      ]);
      const pData = await pRes.json();
      const uData = await uRes.json();
      if (pData.success) setProjects((pData.projects || []).map((p: { id: number; name: string }) => ({ id: p.id, name: p.name })));
      const staffUsers = ((uData.users || []) as { id: number; full_name: string; role: string }[])
        .filter((m) => ["admin", "opportunity_manager", "sales_member"].includes(m.role))
        .sort((a, b) => a.full_name.localeCompare(b.full_name))
        .map(({ id, full_name }) => ({ id, full_name }));
      setStaff(staffUsers);
    } catch {
      // Non-fatal — filters just have fewer options.
    }
  }, [authHeaders]);

  useEffect(() => { fetchCommissions(); }, [fetchCommissions]);
  useEffect(() => { fetchLookups(); }, [fetchLookups]);

  // Update a commission (status / due / notes) via the per-project share endpoint.
  const patchCommission = async (c: Commission, patch: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/projects/${c.project_id}/commission-shares/${c.user_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!data.success) { toast.error(data.error || "Update failed"); return false; }
    return true;
  };

  const approve = async (c: Commission) => {
    if (await patchCommission(c, { status: "Approved" })) { toast.success("Approved"); fetchCommissions(); }
  };
  const markPaid = async (c: Commission) => {
    if (await patchCommission(c, { status: "Paid" })) { toast.success("Marked as paid"); fetchCommissions(); }
  };
  const revertToPending = async (c: Commission) => {
    if (await patchCommission(c, { status: "Pending" })) { toast.success("Reset to pending"); fetchCommissions(); }
  };

  const openEdit = (c: Commission) => {
    setEditing(c);
    setEditDue(c.due_date || "");
    setEditNotes(c.notes || "");
  };
  const saveEdit = async () => {
    if (!editing) return;
    if (await patchCommission(editing, { due_date: editDue || null, notes: editNotes || null })) {
      toast.success("Saved");
      setEditing(null);
      fetchCommissions();
    }
  };

  // Summary over the currently-loaded (filtered) commissions.
  const sumBy = (pred: (c: Commission) => boolean) =>
    commissions.filter(pred).reduce((s, c) => s + c.amount, 0);
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const total = sumBy(() => true);
  const pending = sumBy((c) => c.status === "Pending");
  const approved = sumBy((c) => c.status === "Approved");
  const paid = sumBy((c) => c.status === "Paid");
  const thisMonth = sumBy((c) => (c.created_at || "").slice(0, 7) === monthKey);

  // By-project grouping.
  const byProject = Array.from(
    commissions.reduce((map, c) => {
      const g = map.get(c.project_id) || {
        project_id: c.project_id, project_name: c.project_name, customer_name: c.customer_name,
        projectCommission: c.project_commission_amount, allocatedPct: 0, allocatedAmount: 0, people: 0,
        pending: 0, approved: 0, paid: 0,
      };
      g.allocatedPct += c.share_percentage;
      g.allocatedAmount += c.amount;
      g.people += 1;
      if (c.status === "Pending") g.pending += c.amount;
      else if (c.status === "Approved") g.approved += c.amount;
      else g.paid += c.amount;
      map.set(c.project_id, g);
      return map;
    }, new Map<number, { project_id: number; project_name: string; customer_name: string; projectCommission: number; allocatedPct: number; allocatedAmount: number; people: number; pending: number; approved: number; paid: number }>()).values(),
  );

  const fmtDate = (d: string | null) =>
    d ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d)) : "—";
  const hasFilters = Object.values(filters).some(Boolean);

  if (isLoadingAuth) {
    return <div className="flex justify-center items-center h-[calc(100vh-100px)]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600" /></div>;
  }
  if (!hasAccess) return null;

  const SUMMARY = [
    { label: "Total", value: total, color: "text-gray-900 dark:text-white" },
    { label: "Pending", value: pending, color: "text-amber-600 dark:text-amber-400" },
    { label: "Approved", value: approved, color: "text-blue-600 dark:text-blue-400" },
    { label: "Paid", value: paid, color: "text-green-600 dark:text-green-400" },
    { label: "This Month", value: thisMonth, color: "text-teal-600 dark:text-teal-400" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 min-h-screen text-gray-900 dark:text-gray-100">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Commission Management</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium mt-1">Review, approve, and pay commissions across all projects.</p>
        </div>
        <Link href="/admin/commission-rates" className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <FiPercent /> Manage Rates
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {SUMMARY.map((s) => (
          <div key={s.label} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">{s.label}</p>
            <p className={`text-2xl font-black ${s.color}`}>{gbp(s.value)}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4 mb-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-1.5 text-sm font-bold text-gray-500 dark:text-gray-400"><FiFilter className="w-4 h-4" /> Filters</div>
          <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm outline-none focus:border-teal-500">
            <option value="">All statuses</option>
            {(["Pending", "Approved", "Paid"] as CommissionStatus[]).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filters.project_id} onChange={(e) => setFilters((f) => ({ ...f, project_id: e.target.value }))} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm outline-none focus:border-teal-500 max-w-[180px]">
            <option value="">All projects</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={filters.user_id} onChange={(e) => setFilters((f) => ({ ...f, user_id: e.target.value }))} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm outline-none focus:border-teal-500 max-w-[180px]">
            <option value="">All people</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
          <div className="flex items-center gap-1.5">
            <input type="date" value={filters.from} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm outline-none focus:border-teal-500" />
            <span className="text-gray-400 text-sm">→</span>
            <input type="date" value={filters.to} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm outline-none focus:border-teal-500" />
          </div>
          {hasFilters && (
            <button onClick={() => setFilters(emptyFilters)} className="inline-flex items-center gap-1 px-3 py-2 text-sm font-bold text-gray-500 hover:text-red-600 rounded-xl"><FiX className="w-4 h-4" /> Clear</button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1.5 border-b border-gray-100 dark:border-gray-800">
        {([["individual", "Individual Commissions"], ["by-project", "By Project"]] as [Tab, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 -mb-px transition-all ${activeTab === key ? "border-teal-600 text-teal-600 dark:text-teal-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"}`}>
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" /></div>
      ) : commissions.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 py-24 text-center">
          <FiDollarSign className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">No commissions found</h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">{hasFilters ? "Adjust the filters above." : "Add commission shares to a project to see them here."}</p>
        </div>
      ) : activeTab === "individual" ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 font-bold">Project</th>
                  <th className="px-4 py-3 font-bold">Person</th>
                  <th className="px-4 py-3 font-bold text-right">Share</th>
                  <th className="px-4 py-3 font-bold text-right">Amount</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 font-bold">Due</th>
                  <th className="px-4 py-3 font-bold">Paid</th>
                  <th className="px-4 py-3 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {commissions.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/admin/projects/${c.project_id}`} className="font-bold text-gray-900 dark:text-white hover:text-teal-600">{c.project_name}</Link>
                      {c.customer_name && <p className="text-xs text-gray-400">{c.customer_name}</p>}
                      {c.notes && <p className="text-xs text-gray-400 italic mt-0.5 line-clamp-1">{c.notes}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{c.user_name}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600 dark:text-gray-400">{c.share_percentage}%</td>
                    <td className="px-4 py-3 text-right font-bold text-teal-600 dark:text-teal-400 tabular-nums">{gbp(c.amount)}</td>
                    <td className="px-4 py-3"><span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${STATUS_BADGE[c.status]}`}>{c.status}</span></td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtDate(c.due_date)}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtDate(c.paid_date)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {c.status === "Pending" && (
                          <button onClick={() => approve(c)} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 rounded-lg"><FiCheck className="w-3.5 h-3.5" /> Approve</button>
                        )}
                        {c.status === "Approved" && (
                          <button onClick={() => markPaid(c)} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 rounded-lg"><FiDollarSign className="w-3.5 h-3.5" /> Mark Paid</button>
                        )}
                        {c.status === "Paid" && (
                          <button onClick={() => revertToPending(c)} className="px-2.5 py-1.5 text-xs font-bold text-gray-500 hover:text-amber-600 rounded-lg">Revert</button>
                        )}
                        <button onClick={() => openEdit(c)} title="Edit due date / notes" className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg"><FiEdit2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 font-bold">Project</th>
                  <th className="px-4 py-3 font-bold text-right">Project Commission</th>
                  <th className="px-4 py-3 font-bold text-right">Allocated</th>
                  <th className="px-4 py-3 font-bold text-right">People</th>
                  <th className="px-4 py-3 font-bold text-right">Pending</th>
                  <th className="px-4 py-3 font-bold text-right">Approved</th>
                  <th className="px-4 py-3 font-bold text-right">Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {byProject.map((g) => (
                  <tr key={g.project_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/admin/projects/${g.project_id}`} className="font-bold text-gray-900 dark:text-white hover:text-teal-600">{g.project_name}</Link>
                      {g.customer_name && <p className="text-xs text-gray-400">{g.customer_name}</p>}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{gbp(g.projectCommission)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{gbp(g.allocatedAmount)} <span className="text-xs text-gray-400">({g.allocatedPct}%)</span></td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-500">{g.people}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-amber-600 dark:text-amber-400">{gbp(g.pending)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-blue-600 dark:text-blue-400">{gbp(g.approved)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-green-600 dark:text-green-400">{gbp(g.paid)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit due date / notes modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditing(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-lg font-bold">{editing.user_name} · {editing.project_name}</h3>
              <button onClick={() => setEditing(null)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><FiX /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Due Date</label>
                <input type="date" value={editDue} onChange={(e) => setEditDue(e.target.value)} className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm outline-none focus:border-teal-500" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Notes</label>
                <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm outline-none focus:border-teal-500" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={saveEdit} className="px-6 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 transition">Save</button>
                <button onClick={() => setEditing(null)} className="px-6 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
