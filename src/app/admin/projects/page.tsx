"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { CommissionRate, Customer, Project, ProjectStatus, User } from "@/types/database";
import { toast } from "react-hot-toast";
import { FiBriefcase, FiPlus, FiTrash2, FiUsers } from "react-icons/fi";

type ProjectWithCount = Project & { team_count: number };
type StaffOption = { id: number; full_name: string };

const emptyForm = {
  customer_id: "" as number | "",
  name: "",
  description: "",
  owner_id: "" as number | "",
  status: "Planning" as ProjectStatus,
  progress_percentage: 0,
  start_date: "",
  end_date: "",
  revenue: "",
  rate_choice: "" as string, // "" | "custom" | "<rate id>"
  custom_commission_rate: "",
  risks: "",
};

const gbp = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 2 }).format(n);

const STATUS_TABS: { label: string; value: ProjectStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Planning", value: "Planning" },
  { label: "Active", value: "Active" },
  { label: "On Hold", value: "On Hold" },
  { label: "Completed", value: "Completed" },
  { label: "Cancelled", value: "Cancelled" },
];

const STATUS_BADGE: Record<ProjectStatus, string> = {
  Planning: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  Active: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  "On Hold": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  Completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  Cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectWithCount[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [rates, setRates] = useState<CommissionRate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusTab, setStatusTab] = useState<ProjectStatus | "all">("all");
  const [formData, setFormData] = useState(emptyForm);
  const [selectedTeam, setSelectedTeam] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user, isLoading: isLoadingAuth } = useAuth();
  const router = useRouter();

  const userRole = user?.role || (user?.is_admin ? "admin" : "viewer");
  const hasAccess = userRole === "admin" || userRole === "opportunity_manager" || userRole === "sales_member";
  const isAdmin = userRole === "admin";

  const authHeaders = () => {
    const token = localStorage.getItem("authToken");
    return { Authorization: `Bearer ${token}` };
  };

  useEffect(() => {
    if (!isLoadingAuth && !hasAccess && user) router.push("/admin");
  }, [hasAccess, isLoadingAuth, router, user]);

  const fetchProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/projects", { headers: authHeaders() });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      setProjects(data.projects || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Failed to load projects");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchCustomers = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/customers", { headers: authHeaders() });
      const data = await response.json();
      if (data.success) setCustomers(data.customers || []);
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  }, []);

  const fetchRates = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/commission-rates?active=true", { headers: authHeaders() });
      const data = await response.json();
      if (data.success) setRates(data.rates || []);
    } catch (error) {
      console.error("Error fetching commission rates:", error);
    }
  }, []);

  const fetchStaffList = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/users", { credentials: "same-origin" });
      if (!response.ok) throw new Error("Failed to fetch staff");

      const data = (await response.json()) as { users?: User[] };
      const staffUsers = (data.users || [])
        .filter((member) => ["admin", "opportunity_manager", "sales_member"].includes(member.role))
        .sort((a, b) => a.full_name.localeCompare(b.full_name))
        .map(({ id, full_name }) => ({ id, full_name }));
      setStaff(staffUsers);
    } catch (error) {
      console.error("Error fetching staff:", error);
    }
  }, []);

  useEffect(() => { fetchProjects(); fetchCustomers(); fetchStaffList(); fetchRates(); }, [fetchProjects, fetchCustomers, fetchStaffList, fetchRates]);

  const getCustomerName = (id: number) => customers.find((c) => c.id === id)?.company_name || "Unknown";
  const getOwnerName = (id?: number | null) => staff.find((s) => s.id === id)?.full_name;
  const filteredProjects = projects.filter((p) => statusTab === "all" || p.status === statusTab);

  // Live commission calculation for the create form.
  const selectedRate = rates.find((r) => String(r.id) === formData.rate_choice);
  const effectiveRate =
    formData.rate_choice === "custom"
      ? (formData.custom_commission_rate === "" ? null : Number(formData.custom_commission_rate))
      : selectedRate
        ? Number(selectedRate.percentage)
        : null;
  const revenueNum = formData.revenue === "" ? null : Number(formData.revenue);
  const commissionAmount =
    revenueNum !== null && Number.isFinite(revenueNum) && effectiveRate !== null && Number.isFinite(effectiveRate)
      ? Math.round(revenueNum * effectiveRate) / 100
      : null;

  const resetForm = () => {
    setFormData(emptyForm);
    setSelectedTeam([]);
  };

  const toggleTeamMember = (id: number) => {
    setSelectedTeam((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_id || !formData.name.trim()) {
      toast.error("Customer and project name are required");
      return;
    }
    try {
      setIsSubmitting(true);
      const { rate_choice, custom_commission_rate, ...rest } = formData;
      const payload = {
        ...rest,
        revenue: formData.revenue === "" ? null : Number(formData.revenue),
        commission_rate_id: rate_choice && rate_choice !== "custom" ? Number(rate_choice) : null,
        custom_commission_rate: rate_choice === "custom" && custom_commission_rate !== "" ? Number(custom_commission_rate) : null,
      };
      const response = await fetch("/api/admin/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);

      for (const userId of selectedTeam) {
        await fetch(`/api/admin/projects/${data.project.id}/team`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ user_id: userId }),
        });
      }

      toast.success("Project created");
      setIsModalOpen(false);
      resetForm();
      fetchProjects();
    } catch (error) {
      console.error("Error saving project:", error);
      toast.error("Failed to save project");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this project? Its tasks will be deleted too.")) return;
    try {
      const response = await fetch(`/api/admin/projects/${id}`, { method: "DELETE", headers: authHeaders() });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      setProjects(projects.filter((p) => p.id !== id));
      toast.success("Project deleted");
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error("Failed to delete project");
    }
  };

  if (isLoadingAuth) {
    return <div className="flex justify-center items-center h-[calc(100vh-100px)]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div></div>;
  }
  if (!hasAccess) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-in fade-in duration-500 text-gray-900 dark:text-gray-100 min-h-screen">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Projects</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium mt-1">Client engagements, timelines, and delivery teams.</p>
        </div>
        <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm transition-colors">
          <FiPlus /> New Project
        </button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusTab(tab.value)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-lg transition-all ${
              statusTab === tab.value ? "bg-teal-600 text-white shadow-sm" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isModalOpen && (
        <div className="mb-10 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"><FiBriefcase className="text-teal-600" /> New Project</h3>
          </div>
          <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Customer</label>
              <select value={formData.customer_id} onChange={(e) => setFormData((p) => ({ ...p, customer_id: e.target.value ? Number(e.target.value) : "" }))} required className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20">
                <option value="">Select a customer</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Project Name</label>
              <input value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} required className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Owner</label>
              <select value={formData.owner_id} onChange={(e) => setFormData((p) => ({ ...p, owner_id: e.target.value ? Number(e.target.value) : "" }))} className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20">
                <option value="">Unassigned</option>
                {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Status</label>
              <select value={formData.status} onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value as ProjectStatus }))} className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20">
                {(["Planning", "Active", "On Hold", "Completed", "Cancelled"] as ProjectStatus[]).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Start Date</label>
              <input type="date" value={formData.start_date} onChange={(e) => setFormData((p) => ({ ...p, start_date: e.target.value }))} className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">End Date</label>
              <input type="date" value={formData.end_date} onChange={(e) => setFormData((p) => ({ ...p, end_date: e.target.value }))} className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Revenue (£)</label>
              <input type="number" min={0} step="0.01" value={formData.revenue} onChange={(e) => setFormData((p) => ({ ...p, revenue: e.target.value }))} placeholder="E.g. 50000" className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Commission Rate</label>
              <select value={formData.rate_choice} onChange={(e) => setFormData((p) => ({ ...p, rate_choice: e.target.value }))} className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20">
                <option value="">No commission</option>
                {rates.map((r) => <option key={r.id} value={r.id}>{r.name} ({Number(r.percentage)}%)</option>)}
                <option value="custom">Custom rate…</option>
              </select>
            </div>
            {formData.rate_choice === "custom" && (
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Custom Rate (%)</label>
                <input type="number" min={0} max={100} step="0.01" value={formData.custom_commission_rate} onChange={(e) => setFormData((p) => ({ ...p, custom_commission_rate: e.target.value }))} placeholder="E.g. 7.5" className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Commission Amount</label>
              <div className="w-full rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-3 text-sm font-bold text-teal-600 dark:text-teal-400">
                {commissionAmount !== null ? gbp(commissionAmount) : "—"}
                {effectiveRate !== null && revenueNum !== null && (
                  <span className="ml-2 font-normal text-xs text-gray-400">= {gbp(revenueNum)} × {effectiveRate}%</span>
                )}
              </div>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Progress: {formData.progress_percentage}%</label>
              <input type="range" min={0} max={100} value={formData.progress_percentage} onChange={(e) => setFormData((p) => ({ ...p, progress_percentage: Number(e.target.value) }))} className="w-full accent-teal-600" />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Team Members</label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-3 border border-gray-200 dark:border-gray-700 rounded-xl">
                {staff.length === 0 ? (
                  <p className="text-xs text-gray-400 col-span-2">No staff found</p>
                ) : (
                  staff.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                      <input type="checkbox" checked={selectedTeam.includes(s.id)} onChange={() => toggleTeamMember(s.id)} className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-600" />
                      {s.full_name}
                    </label>
                  ))
                )}
              </div>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Description</label>
              <textarea value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} rows={2} className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Risks</label>
              <textarea value={formData.risks} onChange={(e) => setFormData((p) => ({ ...p, risks: e.target.value }))} rows={2} className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
            </div>
            <div className="flex items-center gap-3 md:col-span-2 pt-4 border-t border-gray-100 dark:border-gray-800">
              <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 transition disabled:opacity-50">{isSubmitting ? "Saving..." : "Create Project"}</button>
              <button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }} disabled={isSubmitting} className="px-6 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="py-20 flex justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div></div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 py-24 text-center">
          <FiBriefcase className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">No projects found</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <div key={project.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 hover:shadow-md hover:border-teal-200 dark:hover:border-teal-700/50 transition-all">
              <div className="flex items-start justify-between mb-3">
                <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-lg ${STATUS_BADGE[project.status]}`}>{project.status}</span>
                {isAdmin && (
                  <button onClick={() => handleDelete(project.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                    <FiTrash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <Link href={`/admin/projects/${project.id}`} className="block">
                <h3 className="text-lg font-black text-gray-900 dark:text-white hover:text-teal-600 transition-colors leading-tight mb-1">{project.name}</h3>
                <p className="text-xs text-gray-400 mb-3">{getCustomerName(project.customer_id)}</p>
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 mb-3">
                  <div className="bg-teal-600 h-1.5 rounded-full" style={{ width: `${project.progress_percentage}%` }} />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1"><FiUsers className="w-3 h-3" /> {project.team_count}</span>
                  <span>{getOwnerName(project.owner_id) || "Unassigned"}</span>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
