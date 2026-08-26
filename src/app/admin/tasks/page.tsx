"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { CustomerOpportunity, Project, Task, TaskPriority, TaskRecurrence, TaskStatus } from "@/types/database";
import { toast } from "react-hot-toast";
import { FiCheckSquare, FiPlus, FiTrash2, FiCalendar, FiList } from "react-icons/fi";

type StaffOption = { id: number; full_name: string };

const emptyForm = {
  title: "",
  description: "",
  project_id: "" as number | "",
  customer_opportunity_id: "" as number | "",
  assigned_to: "" as number | "",
  due_date: "",
  priority: "Medium" as TaskPriority,
  recurrence: "" as TaskRecurrence | "",
};

const STATUS_TABS: { label: string; value: TaskStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "To Do", value: "To Do" },
  { label: "In Progress", value: "In Progress" },
  { label: "Done", value: "Done" },
];

const PRIORITY_BADGE: Record<TaskPriority, string> = {
  Low: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  Medium: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  High: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  Urgent: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [opportunities, setOpportunities] = useState<CustomerOpportunity[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusTab, setStatusTab] = useState<TaskStatus | "all">("all");
  const [myTasksOnly, setMyTasksOnly] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [calendarDate, setCalendarDate] = useState(() => new Date());

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

  const fetchTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/tasks", { headers: authHeaders() });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      setTasks(data.tasks || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast.error("Failed to load tasks");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/projects", { headers: authHeaders() });
      const data = await response.json();
      if (data.success) setProjects(data.projects || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  }, []);

  const fetchStaff = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("users")
        .select("id, full_name")
        .in("role", ["admin", "opportunity_manager", "sales_member"])
        .order("full_name", { ascending: true });
      if (data) setStaff(data);
    } catch (error) {
      console.error("Error fetching staff:", error);
    }
  }, []);

  const fetchOpportunities = useCallback(async () => {
    try {
      const response = await fetch("/api/customer-opportunities", { headers: authHeaders() });
      const data = await response.json();
      if (data.success) setOpportunities(data.opportunities || []);
    } catch (error) {
      console.error("Error fetching opportunities:", error);
    }
  }, []);

  useEffect(() => { fetchTasks(); fetchProjects(); fetchStaff(); fetchOpportunities(); }, [fetchTasks, fetchProjects, fetchStaff, fetchOpportunities]);

  const getProjectName = (id?: number | null) => projects.find((p) => p.id === id)?.name;
  const getOpportunityTitle = (id?: number | null) => opportunities.find((o) => o.id === id)?.opportunity_title;
  const getStaffName = (id?: number | null) => staff.find((s) => s.id === id)?.full_name;
  const today = new Date().toISOString().slice(0, 10);

  const visibleTasks = tasks.filter((t) => {
    if (statusTab !== "all" && t.status !== statusTab) return false;
    if (myTasksOnly && t.assigned_to !== user?.id) return false;
    return true;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }
    try {
      setIsSubmitting(true);
      const response = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          ...formData,
          project_id: formData.project_id || null,
          customer_opportunity_id: formData.customer_opportunity_id || null,
          recurrence: formData.recurrence || null,
        }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      toast.success("Task added");
      setIsModalOpen(false);
      setFormData(emptyForm);
      fetchTasks();
    } catch (error) {
      console.error("Error saving task:", error);
      toast.error("Failed to save task");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (task: Task, status: TaskStatus) => {
    try {
      const response = await fetch(`/api/admin/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      setTasks(tasks.map((t) => (t.id === task.id ? data.task : t)));
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this task?")) return;
    try {
      const response = await fetch(`/api/admin/tasks/${id}`, { method: "DELETE", headers: authHeaders() });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      setTasks(tasks.filter((t) => t.id !== id));
      toast.success("Task deleted");
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("Failed to delete task");
    }
  };

  if (isLoadingAuth) {
    return <div className="flex justify-center items-center h-[calc(100vh-100px)]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div></div>;
  }
  if (!hasAccess) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-in fade-in duration-500 text-gray-900 dark:text-gray-100 min-h-screen">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Tasks</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium mt-1">Daily, weekly and project to-dos.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button onClick={() => setViewMode("list")} className={`px-3 py-2 text-sm font-bold flex items-center gap-1.5 transition-colors ${viewMode === "list" ? "bg-teal-600 text-white" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>
              <FiList className="w-4 h-4" /> List
            </button>
            <button onClick={() => setViewMode("calendar")} className={`px-3 py-2 text-sm font-bold flex items-center gap-1.5 transition-colors ${viewMode === "calendar" ? "bg-teal-600 text-white" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>
              <FiCalendar className="w-4 h-4" /> Calendar
            </button>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm transition-colors">
            <FiPlus /> New Task
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
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
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
          <input type="checkbox" checked={myTasksOnly} onChange={(e) => setMyTasksOnly(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-600" />
          My Tasks
        </label>
      </div>

      {isModalOpen && (
        <div className="mb-10 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"><FiCheckSquare className="text-teal-600" /> New Task</h3>
          </div>
          <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Title</label>
              <input value={formData.title} onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))} required className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Project (optional)</label>
              <select value={formData.project_id} onChange={(e) => setFormData((p) => ({ ...p, project_id: e.target.value ? Number(e.target.value) : "" }))} className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20">
                <option value="">None</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Linked Opportunity (optional)</label>
              <select value={formData.customer_opportunity_id} onChange={(e) => setFormData((p) => ({ ...p, customer_opportunity_id: e.target.value ? Number(e.target.value) : "" }))} className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20">
                <option value="">None</option>
                {opportunities.map((o) => <option key={o.id} value={o.id}>{o.opportunity_title} ({o.company_name})</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Assignee</label>
              <select value={formData.assigned_to} onChange={(e) => setFormData((p) => ({ ...p, assigned_to: e.target.value ? Number(e.target.value) : "" }))} className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20">
                <option value="">Unassigned</option>
                {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Due Date</label>
              <input type="date" value={formData.due_date} onChange={(e) => setFormData((p) => ({ ...p, due_date: e.target.value }))} className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Priority</label>
              <select value={formData.priority} onChange={(e) => setFormData((p) => ({ ...p, priority: e.target.value as TaskPriority }))} className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20">
                {(["Low", "Medium", "High", "Urgent"] as TaskPriority[]).map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Recurrence (optional)</label>
              <select value={formData.recurrence} onChange={(e) => setFormData((p) => ({ ...p, recurrence: e.target.value as TaskRecurrence | "" }))} className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20">
                <option value="">One-off</option>
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
              </select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Description</label>
              <textarea value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} rows={2} className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
            </div>
            <div className="flex items-center gap-3 md:col-span-2 pt-4 border-t border-gray-100 dark:border-gray-800">
              <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 transition disabled:opacity-50">{isSubmitting ? "Saving..." : "Add Task"}</button>
              <button type="button" onClick={() => { setIsModalOpen(false); setFormData(emptyForm); }} disabled={isSubmitting} className="px-6 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* ── Calendar view ── */}
      {!isLoading && viewMode === "calendar" && (() => {
        const year = calendarDate.getFullYear();
        const month = calendarDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const tasksByDate = new Map<string, Task[]>();
        tasks.forEach((t) => {
          if (t.due_date) {
            const existing = tasksByDate.get(t.due_date) || [];
            tasksByDate.set(t.due_date, [...existing, t]);
          }
        });
        const prevMonth = () => setCalendarDate(new Date(year, month - 1, 1));
        const nextMonth = () => setCalendarDate(new Date(year, month + 1, 1));
        const monthLabel = calendarDate.toLocaleString("en-GB", { month: "long", year: "numeric" });
        const todayStr = new Date().toISOString().slice(0, 10);
        const cells = Array.from({ length: firstDay === 0 ? 6 : firstDay - 1 }, () => null)
          .concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));
        // Pad to full weeks
        while (cells.length % 7 !== 0) cells.push(null);

        return (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300">←</button>
              <h3 className="font-black text-gray-900 dark:text-white">{monthLabel}</h3>
              <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300">→</button>
            </div>
            <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-800">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d} className="py-2 text-center text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {cells.map((day, idx) => {
                if (day === null) return <div key={`empty-${idx}`} className="border-b border-r border-gray-50 dark:border-gray-800/50 p-1 min-h-[80px]" />;
                const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const dayTasks = tasksByDate.get(dateStr) || [];
                const isToday = dateStr === todayStr;
                return (
                  <div key={dateStr} className={`border-b border-r border-gray-50 dark:border-gray-800/50 p-1.5 min-h-[80px] ${isToday ? "bg-teal-50/40 dark:bg-teal-900/10" : ""}`}>
                    <div className={`text-xs font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "bg-teal-600 text-white" : "text-gray-600 dark:text-gray-400"}`}>{day}</div>
                    <div className="space-y-0.5">
                      {dayTasks.slice(0, 3).map((t) => (
                        <div key={t.id} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded truncate ${
                          t.status === "Done" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 line-through"
                          : t.status === "In Progress" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        }`} title={t.title}>{t.title}</div>
                      ))}
                      {dayTasks.length > 3 && <div className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold pl-1">+{dayTasks.length - 3} more</div>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-gray-100 dark:bg-gray-800 inline-block" />To Do</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-100 dark:bg-blue-900/30 inline-block" />In Progress</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-green-100 dark:bg-green-900/30 inline-block" />Done</span>
            </div>
          </div>
        );
      })()}

      {viewMode === "list" && isLoading ? (
        <div className="py-20 flex justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div></div>
      ) : viewMode === "list" && visibleTasks.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 py-24 text-center">
          <FiCheckSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Nothing here</h3>
        </div>
      ) : viewMode === "list" ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm divide-y divide-gray-100 dark:divide-gray-800">
          {visibleTasks.map((task) => {
            const isOverdue = task.status !== "Done" && !!task.due_date && task.due_date < today;
            return (
              <div key={task.id} className="p-4 px-6 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className={`font-bold text-sm ${task.status === "Done" ? "text-gray-400 line-through" : "text-gray-900 dark:text-white"}`}>{task.title}</p>
                    <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-lg ${PRIORITY_BADGE[task.priority]}`}>{task.priority}</span>
                  </div>
                  <p className={`text-xs ${isOverdue ? "text-red-600 font-bold" : "text-gray-500 dark:text-gray-400"}`}>
                    {getStaffName(task.assigned_to) || "Unassigned"}
                    {task.due_date ? ` • Due ${task.due_date}${isOverdue ? " (Overdue)" : ""}` : ""}
                    {task.project_id && (
                      <> • <Link href={`/admin/projects/${task.project_id}`} className="text-teal-600 hover:underline">{getProjectName(task.project_id) || "Project"}</Link></>
                    )}
                    {task.customer_opportunity_id && (
                      <> • {getOpportunityTitle(task.customer_opportunity_id) || "Opportunity"}</>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <select value={task.status} onChange={(e) => handleStatusChange(task, e.target.value as TaskStatus)} className="text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 outline-none focus:ring-2 focus:ring-teal-500/20 text-gray-700 dark:text-gray-300">
                    {(["To Do", "In Progress", "Done"] as TaskStatus[]).map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {isAdmin && <button onClick={() => handleDelete(task.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><FiTrash2 className="w-4 h-4" /></button>}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
