"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { CommissionRate, Project, ProjectKpi, ProjectStatus, Task, TaskPriority, TaskStatus, User } from "@/types/database";
import { toast } from "react-hot-toast";
import {
  FiArrowLeft, FiEdit2, FiSave, FiX, FiPlus, FiTrash2,
  FiUsers, FiCheckSquare, FiBarChart2, FiCalendar, FiInfo, FiDollarSign,
} from "react-icons/fi";

type Tab = "overview" | "timeline" | "tasks" | "kpis" | "team" | "commission";
type TeamMember = { id: number; user_id: number; full_name: string; added_at: string };
type CommissionShare = { id: number; user_id: number; share_percentage: number; status?: "Pending" | "Approved" | "Paid" };

const SHARE_STATUS_BADGE: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  Approved: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  Paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};
type StaffOption = { id: number; full_name: string };

const gbp = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 2 }).format(n);

const STATUS_BADGE: Record<ProjectStatus, string> = {
  Planning: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  Active: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  "On Hold": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  Completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  Cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const PRIORITY_BADGE: Record<TaskPriority, string> = {
  Low: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  Medium: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  High: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  Urgent: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const inputCls = "w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20";
const labelCls = "text-sm font-bold text-gray-700 dark:text-gray-300";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isLoading: isLoadingAuth } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [kpis, setKpis] = useState<ProjectKpi[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [rates, setRates] = useState<CommissionRate[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Project>>({});
  // Commission editing is held as strings (rate_choice: "" | "custom" | "<id>").
  const [editRevenue, setEditRevenue] = useState("");
  const [editRateChoice, setEditRateChoice] = useState("");
  const [editCustomRate, setEditCustomRate] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Commission shares
  const [shares, setShares] = useState<CommissionShare[]>([]);
  const [addingShare, setAddingShare] = useState(false);
  const [shareUser, setShareUser] = useState<number | "">("");
  const [sharePct, setSharePct] = useState("");

  // KPI form
  const [kpiForm, setKpiForm] = useState({ name: "", target: "", actual: "", unit: "" });
  const [editingKpi, setEditingKpi] = useState<ProjectKpi | null>(null);
  const [isSavingKpi, setIsSavingKpi] = useState(false);
  const [showKpiForm, setShowKpiForm] = useState(false);

  // Task form
  const [taskForm, setTaskForm] = useState({ title: "", due_date: "", priority: "Medium" as TaskPriority, assigned_to: "" as number | "" });
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [isSavingTask, setIsSavingTask] = useState(false);

  // Team
  const [addingTeam, setAddingTeam] = useState(false);
  const [selectedNewMember, setSelectedNewMember] = useState<number | "">("");

  const userRole = user?.role || (user?.is_admin ? "admin" : "viewer");
  const hasAccess = userRole === "admin" || userRole === "opportunity_manager" || userRole === "sales_member";
  const isAdmin = userRole === "admin";
  const canEdit = userRole === "admin" || userRole === "opportunity_manager";

  const authHeaders = useCallback(() => {
    const token = localStorage.getItem("authToken");
    return { Authorization: `Bearer ${token}` };
  }, []);

  // Derive the string-based commission edit fields from a project record.
  const syncCommissionState = useCallback((p: Partial<Project>) => {
    setEditRevenue(p.revenue == null ? "" : String(p.revenue));
    if (p.custom_commission_rate != null) {
      setEditRateChoice("custom");
      setEditCustomRate(String(p.custom_commission_rate));
    } else {
      setEditRateChoice(p.commission_rate_id != null ? String(p.commission_rate_id) : "");
      setEditCustomRate("");
    }
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      setIsLoading(true);
      const [projectRes, kpisRes] = await Promise.all([
        fetch(`/api/admin/projects/${id}`, { headers: authHeaders() }),
        fetch(`/api/admin/projects/${id}/kpis`, { headers: authHeaders() }),
      ]);
      const projectData = await projectRes.json();
      const kpisData = await kpisRes.json();

      if (!projectData.success) { toast.error("Project not found"); router.push("/admin/projects"); return; }

      setProject(projectData.project);
      setTeam(projectData.team || []);
      setTasks(projectData.tasks || []);
      setShares(projectData.commissionShares || []);
      setEditForm(projectData.project);
      syncCommissionState(projectData.project);
      setKpis(kpisData.kpis || []);

      // Fetch customer name
      if (projectData.project.customer_id) {
        const custRes = await fetch(`/api/admin/customers/${projectData.project.customer_id}`, { headers: authHeaders() });
        const custData = await custRes.json();
        if (custData.success) setCustomerName(custData.customer?.company_name || "");
      }
    } catch {
      toast.error("Failed to load project");
    } finally {
      setIsLoading(false);
    }
  }, [id, authHeaders, router, syncCommissionState]);

  const fetchStaff = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/users", { credentials: "same-origin" });
      if (!response.ok) throw new Error("Failed to fetch staff");

      const data = (await response.json()) as { users?: User[] };
      const staffData = (data.users || [])
        .filter((member) => ["admin", "opportunity_manager", "sales_member"].includes(member.role))
        .sort((a, b) => a.full_name.localeCompare(b.full_name))
        .map(({ id, full_name }) => ({ id, full_name }));
      setStaff(staffData);
    } catch {
      toast.error("Failed to load staff");
    }
  }, []);

  const fetchRates = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/commission-rates?active=true", { headers: authHeaders() });
      const data = await response.json();
      if (data.success) setRates(data.rates || []);
    } catch {
      // Non-fatal — the rate dropdown just stays empty.
    }
  }, [authHeaders]);

  useEffect(() => {
    if (!isLoadingAuth && !hasAccess && user) router.push("/admin");
  }, [hasAccess, isLoadingAuth, router, user]);

  useEffect(() => { fetchAll(); fetchStaff(); fetchRates(); }, [fetchAll, fetchStaff, fetchRates]);

  // ── Save project edits ──
  const handleSave = async () => {
    if (!editForm.name?.trim() || !editForm.customer_id) { toast.error("Name and customer are required"); return; }
    try {
      setIsSaving(true);
      const payload = {
        ...editForm,
        revenue: editRevenue === "" ? null : Number(editRevenue),
        commission_rate_id: editRateChoice && editRateChoice !== "custom" ? Number(editRateChoice) : null,
        custom_commission_rate: editRateChoice === "custom" && editCustomRate !== "" ? Number(editCustomRate) : null,
      };
      const res = await fetch(`/api/admin/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setProject(data.project);
      setEditForm(data.project);
      syncCommissionState(data.project);
      setIsEditing(false);
      toast.success("Project saved");
    } catch { toast.error("Failed to save"); }
    finally { setIsSaving(false); }
  };

  // ── KPI handlers ──
  const handleKpiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kpiForm.name.trim()) { toast.error("Name is required"); return; }
    try {
      setIsSavingKpi(true);
      if (editingKpi) {
        const res = await fetch(`/api/admin/projects/${id}/kpis/${editingKpi.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify(kpiForm),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        setKpis(kpis.map((k) => (k.id === editingKpi.id ? data.kpi : k)));
      } else {
        const res = await fetch(`/api/admin/projects/${id}/kpis`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify(kpiForm),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        setKpis([...kpis, data.kpi]);
      }
      setKpiForm({ name: "", target: "", actual: "", unit: "" });
      setEditingKpi(null);
      setShowKpiForm(false);
      toast.success(editingKpi ? "KPI updated" : "KPI added");
    } catch { toast.error("Failed to save KPI"); }
    finally { setIsSavingKpi(false); }
  };

  const handleKpiDelete = async (kpiId: number) => {
    if (!confirm("Delete this KPI?")) return;
    const res = await fetch(`/api/admin/projects/${id}/kpis/${kpiId}`, { method: "DELETE", headers: authHeaders() });
    const data = await res.json();
    if (data.success) { setKpis(kpis.filter((k) => k.id !== kpiId)); toast.success("KPI deleted"); }
    else toast.error("Failed to delete KPI");
  };

  // ── Task handlers ──
  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title.trim()) { toast.error("Title is required"); return; }
    try {
      setIsSavingTask(true);
      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          title: taskForm.title,
          due_date: taskForm.due_date || null,
          priority: taskForm.priority,
          assigned_to: taskForm.assigned_to || null,
          project_id: Number(id),
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setTasks([...tasks, data.task]);
      setTaskForm({ title: "", due_date: "", priority: "Medium", assigned_to: "" });
      setShowTaskForm(false);
      toast.success("Task added");
    } catch { toast.error("Failed to add task"); }
    finally { setIsSavingTask(false); }
  };

  const handleTaskStatusChange = async (task: Task, status: TaskStatus) => {
    const res = await fetch(`/api/admin/tasks/${task.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (data.success) setTasks(tasks.map((t) => (t.id === task.id ? data.task : t)));
    else toast.error("Failed to update task");
  };

  const handleTaskDelete = async (taskId: number) => {
    if (!confirm("Delete this task?")) return;
    const res = await fetch(`/api/admin/tasks/${taskId}`, { method: "DELETE", headers: authHeaders() });
    const data = await res.json();
    if (data.success) setTasks(tasks.filter((t) => t.id !== taskId));
    else toast.error("Failed to delete task");
  };

  // ── Team handlers ──
  const handleAddTeamMember = async () => {
    if (!selectedNewMember) return;
    const res = await fetch(`/api/admin/projects/${id}/team`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ user_id: selectedNewMember }),
    });
    const data = await res.json();
    if (data.success) {
      const member = staff.find((s) => s.id === selectedNewMember);
      if (member) setTeam([...team, { id: data.id, user_id: member.id, full_name: member.full_name, added_at: new Date().toISOString() }]);
      setSelectedNewMember("");
      setAddingTeam(false);
      toast.success("Member added");
    } else toast.error(data.error || "Failed to add member");
  };

  const handleRemoveTeamMember = async (member: TeamMember) => {
    if (!confirm("Remove this team member?")) return;
    // Route deletes by user_id: DELETE /api/admin/projects/[id]/team/[userId]
    const res = await fetch(`/api/admin/projects/${id}/team/${member.user_id}`, { method: "DELETE", headers: authHeaders() });
    const data = await res.json();
    if (data.success) setTeam(team.filter((m) => m.id !== member.id));
    else toast.error("Failed to remove member");
  };

  // ── Commission share handlers ──
  const handleAddShare = async () => {
    if (!shareUser || sharePct === "") { toast.error("Select a person and a share %"); return; }
    const res = await fetch(`/api/admin/projects/${id}/commission-shares`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ user_id: shareUser, share_percentage: Number(sharePct) }),
    });
    const data = await res.json();
    if (data.success) {
      setShares([...shares, data.share]);
      setShareUser("");
      setSharePct("");
      setAddingShare(false);
      toast.success("Commission share added");
    } else toast.error(data.error || "Failed to add share");
  };

  const handleRemoveShare = async (share: CommissionShare) => {
    if (!confirm("Remove this person's commission share?")) return;
    const res = await fetch(`/api/admin/projects/${id}/commission-shares/${share.user_id}`, { method: "DELETE", headers: authHeaders() });
    const data = await res.json();
    if (data.success) setShares(shares.filter((s) => s.id !== share.id));
    else toast.error("Failed to remove share");
  };

  // ── Timeline helpers ──
  const getTimelinePercent = () => {
    if (!project?.start_date || !project?.end_date) return null;
    const start = new Date(project.start_date).getTime();
    const end = new Date(project.end_date).getTime();
    const now = Date.now();
    if (end <= start) return null;
    const pct = Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
    return pct;
  };

  const formatDate = (d?: string | null) =>
    d ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d)) : "—";

  const getStaffName = (uid?: number | null) => staff.find((s) => s.id === uid)?.full_name;

  if (isLoadingAuth || isLoading) {
    return <div className="flex justify-center items-center h-[calc(100vh-100px)]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div></div>;
  }
  if (!hasAccess || !project) return null;

  const today = new Date().toISOString().slice(0, 10);
  const timelinePercent = getTimelinePercent();
  const availableToAdd = staff.filter((s) => !team.some((m) => m.user_id === s.id));

  // Live commission calc for the edit form.
  const editSelectedRate = rates.find((r) => String(r.id) === editRateChoice);
  const editEffectiveRate =
    editRateChoice === "custom"
      ? (editCustomRate === "" ? null : Number(editCustomRate))
      : editSelectedRate ? Number(editSelectedRate.percentage) : null;
  const editRevenueNum = editRevenue === "" ? null : Number(editRevenue);
  const editCommissionAmount =
    editRevenueNum !== null && Number.isFinite(editRevenueNum) && editEffectiveRate !== null && Number.isFinite(editEffectiveRate)
      ? Math.round(editRevenueNum * editEffectiveRate) / 100
      : null;

  // Commission rate label for the read-only overview.
  const projectRateLabel = (() => {
    if (project.effective_rate == null) return "—";
    if (project.custom_commission_rate != null) return `${Number(project.effective_rate)}% (custom)`;
    const r = rates.find((rr) => rr.id === project.commission_rate_id);
    return r ? `${Number(project.effective_rate)}% (${r.name})` : `${Number(project.effective_rate)}%`;
  })();

  // Commission shares: totals and remaining allocation.
  const totalCommission = project.commission_amount != null ? Number(project.commission_amount) : null;
  const totalSharePct = shares.reduce((sum, s) => sum + Number(s.share_percentage), 0);
  const remainingPct = Math.round((100 - totalSharePct) * 100) / 100;
  const availableForShares = staff.filter((s) => !shares.some((sh) => sh.user_id === s.id));

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: "Overview", icon: <FiInfo /> },
    { key: "timeline", label: "Timeline", icon: <FiCalendar /> },
    { key: "tasks", label: `Tasks (${tasks.length})`, icon: <FiCheckSquare /> },
    { key: "kpis", label: `KPIs (${kpis.length})`, icon: <FiBarChart2 /> },
    { key: "team", label: `Team (${team.length})`, icon: <FiUsers /> },
    { key: "commission", label: `Commission (${shares.length})`, icon: <FiDollarSign /> },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-in fade-in duration-500 text-gray-900 dark:text-gray-100 min-h-screen">

      {/* Back + Header */}
      <div className="mb-6">
        <Link href="/admin/projects" className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-teal-600 transition-colors mb-4">
          <FiArrowLeft className="w-4 h-4" /> All Projects
        </Link>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg ${STATUS_BADGE[project.status]}`}>{project.status}</span>
              {project.start_date && project.end_date && (
                <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(project.start_date)} → {formatDate(project.end_date)}</span>
              )}
            </div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{project.name}</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">{customerName}</p>
          </div>
          {canEdit && !isEditing && (
            <button onClick={() => setIsEditing(true)} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <FiEdit2 className="w-4 h-4" /> Edit
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
            <span>Progress</span>
            <span className="font-bold">{project.progress_percentage}%</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
            <div className="bg-teal-600 h-2 rounded-full transition-all" style={{ width: `${project.progress_percentage}%` }} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-1.5 border-b border-gray-100 dark:border-gray-800 pb-0">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold rounded-t-lg border-b-2 transition-all -mb-px ${
              activeTab === tab.key
                ? "border-teal-600 text-teal-600 dark:text-teal-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {isEditing ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex items-center justify-between">
                <h3 className="text-lg font-bold">Edit Project</h3>
                <button onClick={() => { setIsEditing(false); setEditForm(project); }} className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"><FiX /></button>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <label className={labelCls}>Project Name</label>
                  <input value={editForm.name || ""} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Status</label>
                  <select value={editForm.status} onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value as ProjectStatus }))} className={inputCls}>
                    {(["Planning", "Active", "On Hold", "Completed", "Cancelled"] as ProjectStatus[]).map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Owner</label>
                  <select value={editForm.owner_id ?? ""} onChange={(e) => setEditForm((p) => ({ ...p, owner_id: e.target.value ? Number(e.target.value) : null }))} className={inputCls}>
                    <option value="">Unassigned</option>
                    {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Start Date</label>
                  <input type="date" value={editForm.start_date || ""} onChange={(e) => setEditForm((p) => ({ ...p, start_date: e.target.value }))} className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>End Date</label>
                  <input type="date" value={editForm.end_date || ""} onChange={(e) => setEditForm((p) => ({ ...p, end_date: e.target.value }))} className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Revenue (£)</label>
                  <input type="number" min={0} step="0.01" value={editRevenue} onChange={(e) => setEditRevenue(e.target.value)} placeholder="e.g. 50000" className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Commission Rate</label>
                  <select value={editRateChoice} onChange={(e) => setEditRateChoice(e.target.value)} className={inputCls}>
                    <option value="">No commission</option>
                    {rates.map((r) => <option key={r.id} value={r.id}>{r.name} ({Number(r.percentage)}%)</option>)}
                    {/* Keep the currently-selected rate visible even if it was since deactivated */}
                    {project.commission_rate_id != null && !rates.some((r) => r.id === project.commission_rate_id) && editRateChoice === String(project.commission_rate_id) && (
                      <option value={project.commission_rate_id}>{`Rate #${project.commission_rate_id} (${Number(project.effective_rate)}%, inactive)`}</option>
                    )}
                    <option value="custom">Custom rate…</option>
                  </select>
                </div>
                {editRateChoice === "custom" && (
                  <div className="space-y-1.5">
                    <label className={labelCls}>Custom Rate (%)</label>
                    <input type="number" min={0} max={100} step="0.01" value={editCustomRate} onChange={(e) => setEditCustomRate(e.target.value)} placeholder="e.g. 7.5" className={inputCls} />
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className={labelCls}>Commission Amount</label>
                  <div className="w-full rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-3 text-sm font-bold text-teal-600 dark:text-teal-400">
                    {editCommissionAmount !== null ? gbp(editCommissionAmount) : "—"}
                    {editEffectiveRate !== null && editRevenueNum !== null && (
                      <span className="ml-2 font-normal text-xs text-gray-400">= {gbp(editRevenueNum)} × {editEffectiveRate}%</span>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className={labelCls}>Progress: {editForm.progress_percentage ?? 0}%</label>
                  <input type="range" min={0} max={100} value={editForm.progress_percentage ?? 0} onChange={(e) => setEditForm((p) => ({ ...p, progress_percentage: Number(e.target.value) }))} className="w-full accent-teal-600" />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className={labelCls}>Description</label>
                  <textarea value={editForm.description || ""} onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))} rows={3} className={inputCls} />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className={labelCls}>Risks</label>
                  <textarea value={editForm.risks || ""} onChange={(e) => setEditForm((p) => ({ ...p, risks: e.target.value }))} rows={2} className={inputCls} />
                </div>
                <div className="flex gap-3 md:col-span-2 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <button onClick={handleSave} disabled={isSaving} className="inline-flex items-center gap-2 px-6 py-2.5 bg-teal-600 text-white text-sm font-bold rounded-xl hover:bg-teal-700 transition disabled:opacity-50">
                    <FiSave /> {isSaving ? "Saving…" : "Save"}
                  </button>
                  <button onClick={() => { setIsEditing(false); setEditForm(project); }} className="px-6 py-2.5 border border-gray-200 dark:border-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition">Cancel</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">Details</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Owner</span><span className="font-semibold">{getStaffName(project.owner_id) || "Unassigned"}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Start</span><span className="font-semibold">{formatDate(project.start_date)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">End</span><span className="font-semibold">{formatDate(project.end_date)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Revenue</span><span className="font-semibold text-green-600 dark:text-green-400">{project.revenue != null ? gbp(Number(project.revenue)) : "—"}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Commission Rate</span><span className="font-semibold text-gray-700 dark:text-gray-300">{projectRateLabel}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Commission</span><span className="font-semibold text-teal-600 dark:text-teal-400">{project.commission_amount != null ? gbp(Number(project.commission_amount)) : "—"}</span></div>
                </div>
              </div>
              <div className="space-y-4">
                {project.description && (
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
                    <h3 className="text-sm font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">Description</h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{project.description}</p>
                  </div>
                )}
                {project.risks && (
                  <div className="bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/30 p-6">
                    <h3 className="text-sm font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-3">Risks</h3>
                    <p className="text-sm text-amber-800 dark:text-amber-300 whitespace-pre-wrap leading-relaxed">{project.risks}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TIMELINE TAB ── */}
      {activeTab === "timeline" && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
          <h3 className="text-sm font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-6">Project Timeline</h3>
          {!project.start_date || !project.end_date ? (
            <div className="py-16 text-center">
              <FiCalendar className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-700 mb-3" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">No start or end date set.</p>
              {canEdit && <button onClick={() => setActiveTab("overview")} className="mt-3 text-sm text-teal-600 hover:underline">Edit project to add dates →</button>}
            </div>
          ) : (
            <div className="space-y-8">
              <div className="flex justify-between text-sm font-bold text-gray-700 dark:text-gray-300">
                <span>{formatDate(project.start_date)}</span>
                <span>{formatDate(project.end_date)}</span>
              </div>
              {/* Track */}
              <div className="relative">
                <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${project.status === "Completed" ? "bg-green-500" : project.status === "Cancelled" ? "bg-red-400" : project.status === "On Hold" ? "bg-amber-400" : "bg-teal-500"}`}
                    style={{ width: `${project.progress_percentage}%` }}
                  />
                </div>
                {/* Today marker */}
                {timelinePercent !== null && timelinePercent >= 0 && timelinePercent <= 100 && (
                  <div className="absolute top-0 h-full" style={{ left: `${timelinePercent}%` }}>
                    <div className="w-0.5 h-8 bg-gray-900 dark:bg-white opacity-60" />
                    <div className="absolute top-9 left-1/2 -translate-x-1/2 text-[10px] font-black text-gray-600 dark:text-gray-400 whitespace-nowrap">Today</div>
                  </div>
                )}
              </div>
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-4 mt-8">
                {[
                  { label: "Duration", val: (() => { const s = new Date(project.start_date!); const e = new Date(project.end_date!); const days = Math.round((e.getTime() - s.getTime()) / 86400000); return `${days} days`; })() },
                  { label: "Progress", val: `${project.progress_percentage}%` },
                  { label: "Time Elapsed", val: timelinePercent !== null ? `${timelinePercent}%` : "—" },
                ].map((s) => (
                  <div key={s.label} className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <p className="text-2xl font-black text-gray-900 dark:text-white">{s.val}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
              {/* Tasks on timeline */}
              {tasks.filter((t) => t.due_date).length > 0 && (
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">Task Due Dates</h4>
                  <div className="space-y-2">
                    {tasks.filter((t) => t.due_date).sort((a, b) => (a.due_date! > b.due_date! ? 1 : -1)).map((t) => {
                      const start = new Date(project.start_date!).getTime();
                      const end = new Date(project.end_date!).getTime();
                      const due = new Date(t.due_date!).getTime();
                      const pct = end > start ? Math.min(100, Math.max(0, Math.round(((due - start) / (end - start)) * 100))) : 0;
                      const isOverdue = t.status !== "Done" && t.due_date! < today;
                      return (
                        <div key={t.id} className="flex items-center gap-3">
                          <div className="w-36 text-xs text-right text-gray-500 dark:text-gray-400 shrink-0">{t.due_date}</div>
                          <div className="flex-1 relative h-5">
                            <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 shadow"
                              style={{ left: `calc(${pct}% - 6px)`, backgroundColor: t.status === "Done" ? "#10b981" : isOverdue ? "#ef4444" : "#6366f1" }} />
                          </div>
                          <div className={`text-xs font-semibold truncate max-w-[180px] ${isOverdue ? "text-red-600" : "text-gray-700 dark:text-gray-300"}`}>{t.title}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TASKS TAB ── */}
      {activeTab === "tasks" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">Project Tasks</h3>
            <button onClick={() => setShowTaskForm(!showTaskForm)} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-colors">
              <FiPlus /> Add Task
            </button>
          </div>

          {showTaskForm && (
            <form onSubmit={handleTaskSubmit} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <label className={labelCls}>Title</label>
                <input value={taskForm.title} onChange={(e) => setTaskForm((p) => ({ ...p, title: e.target.value }))} required className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Due Date</label>
                <input type="date" value={taskForm.due_date} onChange={(e) => setTaskForm((p) => ({ ...p, due_date: e.target.value }))} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Priority</label>
                <select value={taskForm.priority} onChange={(e) => setTaskForm((p) => ({ ...p, priority: e.target.value as TaskPriority }))} className={inputCls}>
                  {(["Low", "Medium", "High", "Urgent"] as TaskPriority[]).map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className={labelCls}>Assignee</label>
                <select value={taskForm.assigned_to} onChange={(e) => setTaskForm((p) => ({ ...p, assigned_to: e.target.value ? Number(e.target.value) : "" }))} className={inputCls}>
                  <option value="">Unassigned</option>
                  {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
              </div>
              <div className="flex gap-3 md:col-span-2">
                <button type="submit" disabled={isSavingTask} className="px-5 py-2 bg-teal-600 text-white text-sm font-bold rounded-xl hover:bg-teal-700 disabled:opacity-50">{isSavingTask ? "Adding…" : "Add Task"}</button>
                <button type="button" onClick={() => setShowTaskForm(false)} className="px-5 py-2 border border-gray-200 dark:border-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
              </div>
            </form>
          )}

          {tasks.length === 0 && !showTaskForm ? (
            <div className="py-16 text-center bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
              <FiCheckSquare className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-700 mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No tasks yet.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm divide-y divide-gray-100 dark:divide-gray-800">
              {tasks.map((task) => {
                const isOverdue = task.status !== "Done" && !!task.due_date && task.due_date < today;
                return (
                  <div key={task.id} className="px-5 py-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className={`font-bold text-sm ${task.status === "Done" ? "text-gray-400 line-through" : "text-gray-900 dark:text-white"}`}>{task.title}</p>
                        <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-lg ${PRIORITY_BADGE[task.priority]}`}>{task.priority}</span>
                      </div>
                      <p className={`text-xs mt-0.5 ${isOverdue ? "text-red-600 font-bold" : "text-gray-500 dark:text-gray-400"}`}>
                        {getStaffName(task.assigned_to) || "Unassigned"}
                        {task.due_date ? ` • Due ${task.due_date}${isOverdue ? " (Overdue)" : ""}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select value={task.status} onChange={(e) => handleTaskStatusChange(task, e.target.value as TaskStatus)} className="text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 outline-none text-gray-700 dark:text-gray-300">
                        {(["To Do", "In Progress", "Done"] as TaskStatus[]).map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      {isAdmin && <button onClick={() => handleTaskDelete(task.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><FiTrash2 className="w-4 h-4" /></button>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── KPIs TAB ── */}
      {activeTab === "kpis" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">Key Performance Indicators</h3>
            {canEdit && <button onClick={() => { setShowKpiForm(!showKpiForm); setEditingKpi(null); setKpiForm({ name: "", target: "", actual: "", unit: "" }); }} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-colors"><FiPlus /> Add KPI</button>}
          </div>

          {(showKpiForm || editingKpi) && (
            <form onSubmit={handleKpiSubmit} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1.5 col-span-2 md:col-span-4">
                <label className={labelCls}>KPI Name</label>
                <input value={kpiForm.name} onChange={(e) => setKpiForm((p) => ({ ...p, name: e.target.value }))} required placeholder="e.g. Customer Satisfaction Score" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Target</label>
                <input value={kpiForm.target} onChange={(e) => setKpiForm((p) => ({ ...p, target: e.target.value }))} placeholder="e.g. 90" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Actual</label>
                <input value={kpiForm.actual} onChange={(e) => setKpiForm((p) => ({ ...p, actual: e.target.value }))} placeholder="e.g. 85" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Unit</label>
                <input value={kpiForm.unit} onChange={(e) => setKpiForm((p) => ({ ...p, unit: e.target.value }))} placeholder="e.g. %, £, count" className={inputCls} />
              </div>
              <div className="flex gap-2 items-end">
                <button type="submit" disabled={isSavingKpi} className="flex-1 py-3 bg-teal-600 text-white text-sm font-bold rounded-xl hover:bg-teal-700 disabled:opacity-50">{isSavingKpi ? "Saving…" : editingKpi ? "Update" : "Add"}</button>
                <button type="button" onClick={() => { setShowKpiForm(false); setEditingKpi(null); }} className="flex-1 py-3 border border-gray-200 dark:border-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
              </div>
            </form>
          )}

          {kpis.length === 0 && !showKpiForm ? (
            <div className="py-16 text-center bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
              <FiBarChart2 className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-700 mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No KPIs defined yet.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30">
                    <th className="text-left px-5 py-3 text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">KPI</th>
                    <th className="text-center px-4 py-3 text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">Target</th>
                    <th className="text-center px-4 py-3 text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">Actual</th>
                    <th className="text-center px-4 py-3 text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">Unit</th>
                    <th className="text-center px-4 py-3 text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</th>
                    {canEdit && <th className="px-4 py-3" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {kpis.map((kpi) => {
                    const target = parseFloat(kpi.target || "");
                    const actual = parseFloat(kpi.actual || "");
                    const achieved = !isNaN(target) && !isNaN(actual) && target > 0;
                    const pct = achieved ? Math.round((actual / target) * 100) : null;
                    return (
                      <tr key={kpi.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <td className="px-5 py-4 font-semibold text-gray-900 dark:text-white">{kpi.name}</td>
                        <td className="px-4 py-4 text-center text-gray-600 dark:text-gray-400 font-variant-numeric tabular-nums">{kpi.target || "—"}</td>
                        <td className="px-4 py-4 text-center font-bold font-variant-numeric tabular-nums">{kpi.actual || "—"}</td>
                        <td className="px-4 py-4 text-center text-gray-500 dark:text-gray-400">{kpi.unit || "—"}</td>
                        <td className="px-4 py-4 text-center">
                          {pct !== null ? (
                            <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${pct >= 100 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : pct >= 75 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                              {pct}%
                            </span>
                          ) : "—"}
                        </td>
                        {canEdit && (
                          <td className="px-4 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button onClick={() => { setEditingKpi(kpi); setKpiForm({ name: kpi.name, target: kpi.target || "", actual: kpi.actual || "", unit: kpi.unit || "" }); setShowKpiForm(false); }} className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg"><FiEdit2 className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleKpiDelete(kpi.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><FiTrash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TEAM TAB ── */}
      {activeTab === "team" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">Team Members</h3>
            {canEdit && availableToAdd.length > 0 && (
              <button onClick={() => setAddingTeam(!addingTeam)} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-colors"><FiPlus /> Add Member</button>
            )}
          </div>

          {addingTeam && (
            <div className="flex gap-3">
              <select value={selectedNewMember} onChange={(e) => setSelectedNewMember(e.target.value ? Number(e.target.value) : "")} className={`flex-1 ${inputCls}`}>
                <option value="">Select a staff member…</option>
                {availableToAdd.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
              <button onClick={handleAddTeamMember} disabled={!selectedNewMember} className="px-5 py-2 bg-teal-600 text-white text-sm font-bold rounded-xl hover:bg-teal-700 disabled:opacity-50">Add</button>
              <button onClick={() => { setAddingTeam(false); setSelectedNewMember(""); }} className="px-5 py-2 border border-gray-200 dark:border-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
            </div>
          )}

          {team.length === 0 ? (
            <div className="py-16 text-center bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
              <FiUsers className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-700 mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No team members yet.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm divide-y divide-gray-100 dark:divide-gray-800">
              {team.map((member) => (
                <div key={member.id} className="px-5 py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 flex items-center justify-center font-bold text-sm">
                      {member.full_name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{member.full_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Added {formatDate(member.added_at)}</p>
                    </div>
                  </div>
                  {isAdmin && (
                    <button onClick={() => handleRemoveTeamMember(member)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><FiTrash2 className="w-4 h-4" /></button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── COMMISSION TAB ── */}
      {activeTab === "commission" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">Commission Distribution</h3>
            {canEdit && availableForShares.length > 0 && (
              <button onClick={() => setAddingShare(!addingShare)} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-colors"><FiPlus /> Add Person</button>
            )}
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <p className="text-xl font-black text-gray-900 dark:text-white">{totalCommission != null ? gbp(totalCommission) : "—"}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total Commission</p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <p className="text-xl font-black text-gray-900 dark:text-white">{totalSharePct}%</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Allocated</p>
            </div>
            <div className={`text-center p-4 rounded-xl ${remainingPct < 0 ? "bg-red-50 dark:bg-red-900/10" : "bg-gray-50 dark:bg-gray-800"}`}>
              <p className={`text-xl font-black ${remainingPct < 0 ? "text-red-600" : "text-gray-900 dark:text-white"}`}>{remainingPct}%</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Remaining</p>
            </div>
          </div>

          {totalCommission == null && (
            <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/10 rounded-xl px-4 py-3">
              Set a revenue and commission rate on the Overview tab to see each person&apos;s £ amount.
            </div>
          )}

          {addingShare && (
            <div className="flex flex-wrap gap-3">
              <select value={shareUser} onChange={(e) => setShareUser(e.target.value ? Number(e.target.value) : "")} className={`flex-1 min-w-[200px] ${inputCls}`}>
                <option value="">Select a person…</option>
                {availableForShares.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
              <input type="number" min={0} max={100} step="0.01" value={sharePct} onChange={(e) => setSharePct(e.target.value)} placeholder={`Share % (max ${Math.max(0, remainingPct)})`} className={`w-40 ${inputCls}`} />
              <button onClick={handleAddShare} disabled={!shareUser || sharePct === ""} className="px-5 py-2 bg-teal-600 text-white text-sm font-bold rounded-xl hover:bg-teal-700 disabled:opacity-50">Add</button>
              <button onClick={() => { setAddingShare(false); setShareUser(""); setSharePct(""); }} className="px-5 py-2 border border-gray-200 dark:border-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
            </div>
          )}

          {shares.length === 0 ? (
            <div className="py-16 text-center bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
              <FiDollarSign className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-700 mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No commission shares yet.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm divide-y divide-gray-100 dark:divide-gray-800">
              {shares.map((share) => {
                const amount = totalCommission != null ? Math.round(totalCommission * Number(share.share_percentage)) / 100 : null;
                return (
                  <div key={share.id} className="px-5 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 flex items-center justify-center font-bold text-sm">
                        {getStaffName(share.user_id)?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          {getStaffName(share.user_id) || `User #${share.user_id}`}
                          {share.status && <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${SHARE_STATUS_BADGE[share.status] || ""}`}>{share.status}</span>}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{Number(share.share_percentage)}% of commission</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-teal-600 dark:text-teal-400 tabular-nums">{amount != null ? gbp(amount) : "—"}</span>
                      {isAdmin && (
                        <button onClick={() => handleRemoveShare(share)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><FiTrash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
