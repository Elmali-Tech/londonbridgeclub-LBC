"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Customer, Project, ProjectStatus, ProjectTeamMember, Task, TaskPriority, TaskStatus, User } from "@/types/database";
import { toast } from "react-hot-toast";
import { FiArrowLeft, FiBriefcase, FiEdit2, FiPlus, FiTrash2, FiUsers, FiCheckSquare } from "react-icons/fi";

type StaffOption = { id: number; full_name: string };

const emptyTaskForm = {
  title: "",
  description: "",
  assigned_to: "" as number | "",
  due_date: "",
  priority: "Medium" as TaskPriority,
};

export default function ProjectDetailPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const userRole = user?.role || (user?.is_admin ? "admin" : "viewer");
  const hasAccess = userRole === "admin" || userRole === "opportunity_manager" || userRole === "sales_member";

  const [project, setProject] = useState<Project | null>(null);
  const [team, setTeam] = useState<ProjectTeamMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [projectForm, setProjectForm] = useState({
    customer_id: "" as number | "", name: "", description: "", owner_id: "" as number | "",
    status: "Planning" as ProjectStatus, progress_percentage: 0, start_date: "", end_date: "",
    revenue: "", commission: "", risks: "",
  });
  const [savingProject, setSavingProject] = useState(false);

  const [addingTeamId, setAddingTeamId] = useState<number | "">("");
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState(emptyTaskForm);
  const [savingTask, setSavingTask] = useState(false);

  const authHeaders = () => {
    const token = localStorage.getItem("authToken");
    return { Authorization: `Bearer ${token}` };
  };

  useEffect(() => {
    if (!authLoading && !hasAccess && user) router.push("/admin");
  }, [hasAccess, authLoading, router, user]);

  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/projects/${projectId}`, { headers: authHeaders() });
      const data = await response.json();
      if (!data.success) {
        toast.error(data.error || "Project not found");
        router.push("/admin/projects");
        return;
      }
      setProject(data.project);
      setTeam(data.team || []);
      setTasks(data.tasks || []);
      setProjectForm({
        customer_id: data.project.customer_id,
        name: data.project.name,
        description: data.project.description || "",
        owner_id: data.project.owner_id || "",
        status: data.project.status,
        progress_percentage: data.project.progress_percentage,
        start_date: data.project.start_date || "",
        end_date: data.project.end_date || "",
        revenue: data.project.revenue || "",
        commission: data.project.commission || "",
        risks: data.project.risks || "",
      });
    } catch (error) {
      console.error("Error fetching project:", error);
      toast.error("Failed to load project");
    } finally {
      setLoading(false);
    }
  }, [projectId, router]);

  const fetchStaffAndCustomers = useCallback(async () => {
    try {
      const [usersRes, customersRes] = await Promise.all([
        fetch("/api/admin/users", { credentials: "same-origin" }),
        fetch("/api/admin/customers", { credentials: "same-origin" }),
      ]);
      if (!usersRes.ok) throw new Error("Failed to fetch staff");

      const usersData = (await usersRes.json()) as { users?: User[] };
      const staffData = (usersData.users || [])
        .filter((member) => ["admin", "opportunity_manager", "sales_member"].includes(member.role))
        .sort((a, b) => a.full_name.localeCompare(b.full_name))
        .map(({ id, full_name }) => ({ id, full_name }));
      setStaff(staffData);
      const customersData = await customersRes.json();
      if (customersData.success) setCustomers(customersData.customers || []);
    } catch (error) {
      console.error("Error fetching staff/customers:", error);
    }
  }, []);

  useEffect(() => { if (hasAccess) { fetchDetail(); fetchStaffAndCustomers(); } }, [hasAccess, fetchDetail, fetchStaffAndCustomers]);

  const getStaffName = (id?: number | null) => staff.find((s) => s.id === id)?.full_name;
  const getCustomerName = (id: number) => customers.find((c) => c.id === id)?.company_name;
  const availableStaff = staff.filter((s) => !team.some((t) => t.user_id === s.id));

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectForm.customer_id || !projectForm.name.trim()) {
      toast.error("Customer and project name are required");
      return;
    }
    try {
      setSavingProject(true);
      const response = await fetch(`/api/admin/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(projectForm),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      setProject(data.project);
      setIsEditing(false);
      toast.success("Project updated");
    } catch (error) {
      console.error("Error updating project:", error);
      toast.error("Failed to update project");
    } finally {
      setSavingProject(false);
    }
  };

  const handleAddTeamMember = async () => {
    if (!addingTeamId) return;
    try {
      const response = await fetch(`/api/admin/projects/${projectId}/team`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ user_id: addingTeamId }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      setTeam([...team, data.member]);
      setAddingTeamId("");
      toast.success("Team member added");
    } catch (error) {
      console.error("Error adding team member:", error);
      toast.error("Failed to add team member");
    }
  };

  const handleRemoveTeamMember = async (userId: number) => {
    try {
      const response = await fetch(`/api/admin/projects/${projectId}/team/${userId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      setTeam(team.filter((t) => t.user_id !== userId));
      toast.success("Team member removed");
    } catch (error) {
      console.error("Error removing team member:", error);
      toast.error("Failed to remove team member");
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title.trim()) {
      toast.error("Task title is required");
      return;
    }
    try {
      setSavingTask(true);
      const response = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ ...taskForm, project_id: Number(projectId) }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      setTasks([...tasks, data.task]);
      setIsTaskModalOpen(false);
      setTaskForm(emptyTaskForm);
      toast.success("Task added");
    } catch (error) {
      console.error("Error adding task:", error);
      toast.error("Failed to add task");
    } finally {
      setSavingTask(false);
    }
  };

  const handleTaskStatusChange = async (taskId: number, status: TaskStatus) => {
    try {
      const response = await fetch(`/api/admin/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      setTasks(tasks.map((t) => (t.id === taskId ? data.task : t)));
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm("Delete this task?")) return;
    try {
      const response = await fetch(`/api/admin/tasks/${taskId}`, { method: "DELETE", headers: authHeaders() });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      setTasks(tasks.filter((t) => t.id !== taskId));
      toast.success("Task deleted");
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("Failed to delete task");
    }
  };

  if (authLoading || loading) {
    return <div className="flex justify-center items-center h-[calc(100vh-100px)]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div></div>;
  }
  if (!hasAccess || !project) return null;
  const isAdmin = userRole === "admin";

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-in fade-in duration-500 text-gray-900 dark:text-gray-100 min-h-screen">
      <Link href="/admin/projects" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-teal-600 transition-colors mb-6">
        <FiArrowLeft /> Back to Projects
      </Link>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden mb-8">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"><FiBriefcase className="text-teal-600" /> Project Overview</h3>
          {!isEditing && <button onClick={() => setIsEditing(true)} className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-colors"><FiEdit2 className="w-4 h-4" /></button>}
        </div>

        {isEditing ? (
          <form onSubmit={handleSaveProject} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Project Name</label>
              <input value={projectForm.name} onChange={(e) => setProjectForm((p) => ({ ...p, name: e.target.value }))} required className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Owner</label>
              <select value={projectForm.owner_id} onChange={(e) => setProjectForm((p) => ({ ...p, owner_id: e.target.value ? Number(e.target.value) : "" }))} className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20">
                <option value="">Unassigned</option>
                {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Status</label>
              <select value={projectForm.status} onChange={(e) => setProjectForm((p) => ({ ...p, status: e.target.value as ProjectStatus }))} className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20">
                {(["Planning", "Active", "On Hold", "Completed", "Cancelled"] as ProjectStatus[]).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Start Date</label>
              <input type="date" value={projectForm.start_date} onChange={(e) => setProjectForm((p) => ({ ...p, start_date: e.target.value }))} className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">End Date</label>
              <input type="date" value={projectForm.end_date} onChange={(e) => setProjectForm((p) => ({ ...p, end_date: e.target.value }))} className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Revenue</label>
              <input value={projectForm.revenue} onChange={(e) => setProjectForm((p) => ({ ...p, revenue: e.target.value }))} className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Commission</label>
              <input value={projectForm.commission} onChange={(e) => setProjectForm((p) => ({ ...p, commission: e.target.value }))} className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Progress: {projectForm.progress_percentage}%</label>
              <input type="range" min={0} max={100} value={projectForm.progress_percentage} onChange={(e) => setProjectForm((p) => ({ ...p, progress_percentage: Number(e.target.value) }))} className="w-full accent-teal-600" />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Description</label>
              <textarea value={projectForm.description} onChange={(e) => setProjectForm((p) => ({ ...p, description: e.target.value }))} rows={2} className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Risks</label>
              <textarea value={projectForm.risks} onChange={(e) => setProjectForm((p) => ({ ...p, risks: e.target.value }))} rows={2} className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
            </div>
            <div className="flex items-center gap-3 md:col-span-2 pt-4 border-t border-gray-100 dark:border-gray-800">
              <button type="submit" disabled={savingProject} className="px-6 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 transition disabled:opacity-50">{savingProject ? "Saving..." : "Save Changes"}</button>
              <button type="button" onClick={() => setIsEditing(false)} disabled={savingProject} className="px-6 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition">Cancel</button>
            </div>
          </form>
        ) : (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white md:col-span-2">{project.name}</h2>
            <div><p className="text-xs font-bold text-gray-400 uppercase">Customer</p><p className="text-sm text-gray-700 dark:text-gray-300">{getCustomerName(project.customer_id) || "—"}</p></div>
            <div><p className="text-xs font-bold text-gray-400 uppercase">Owner</p><p className="text-sm text-gray-700 dark:text-gray-300">{getStaffName(project.owner_id) || "Unassigned"}</p></div>
            <div><p className="text-xs font-bold text-gray-400 uppercase">Status</p><p className="text-sm text-gray-700 dark:text-gray-300">{project.status}</p></div>
            <div><p className="text-xs font-bold text-gray-400 uppercase">Timeline</p><p className="text-sm text-gray-700 dark:text-gray-300">{project.start_date || "TBD"} → {project.end_date || "TBD"}</p></div>
            <div><p className="text-xs font-bold text-gray-400 uppercase">Revenue</p><p className="text-sm text-gray-700 dark:text-gray-300">{project.revenue || "—"}</p></div>
            <div><p className="text-xs font-bold text-gray-400 uppercase">Commission</p><p className="text-sm text-gray-700 dark:text-gray-300">{project.commission || "—"}</p></div>
            <div className="md:col-span-2">
              <p className="text-xs font-bold text-gray-400 uppercase mb-1">Progress</p>
              <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2"><div className="bg-teal-600 h-2 rounded-full" style={{ width: `${project.progress_percentage}%` }} /></div>
              <p className="text-xs text-gray-400 mt-1">{project.progress_percentage}%</p>
            </div>
            {project.description && <div className="md:col-span-2"><p className="text-xs font-bold text-gray-400 uppercase">Description</p><p className="text-sm text-gray-700 dark:text-gray-300">{project.description}</p></div>}
            {project.risks && <div className="md:col-span-2"><p className="text-xs font-bold text-gray-400 uppercase">Risks</p><p className="text-sm text-gray-700 dark:text-gray-300">{project.risks}</p></div>}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden mb-8">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"><FiUsers className="text-teal-600" /> Team</h3>
        </div>
        <div className="p-6 flex flex-wrap gap-2 items-center border-b border-gray-100 dark:border-gray-800">
          <select value={addingTeamId} onChange={(e) => setAddingTeamId(e.target.value ? Number(e.target.value) : "")} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20">
            <option value="">Add team member...</option>
            {availableStaff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
          <button onClick={handleAddTeamMember} disabled={!addingTeamId} className="px-4 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 transition disabled:opacity-50">Add</button>
        </div>
        {team.length === 0 ? (
          <p className="p-6 text-sm text-gray-400 text-center">No team members yet.</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {team.map((member) => (
              <div key={member.id} className="p-4 px-6 flex items-center justify-between">
                <p className="text-sm font-bold text-gray-900 dark:text-white">{getStaffName(member.user_id) || `User #${member.user_id}`}</p>
                <button onClick={() => handleRemoveTeamMember(member.user_id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><FiTrash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"><FiCheckSquare className="text-teal-600" /> Tasks</h3>
          <button onClick={() => setIsTaskModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors"><FiPlus className="w-3.5 h-3.5" /> Add Task</button>
        </div>

        {isTaskModalOpen && (
          <form onSubmit={handleAddTask} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-800/20">
            <input placeholder="Task title" value={taskForm.title} onChange={(e) => setTaskForm((p) => ({ ...p, title: e.target.value }))} required className="md:col-span-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
            <select value={taskForm.assigned_to} onChange={(e) => setTaskForm((p) => ({ ...p, assigned_to: e.target.value ? Number(e.target.value) : "" }))} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20">
              <option value="">Unassigned</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
            <input type="date" value={taskForm.due_date} onChange={(e) => setTaskForm((p) => ({ ...p, due_date: e.target.value }))} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
            <select value={taskForm.priority} onChange={(e) => setTaskForm((p) => ({ ...p, priority: e.target.value as TaskPriority }))} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20">
              {(["Low", "Medium", "High", "Urgent"] as TaskPriority[]).map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <div className="flex items-center gap-3 md:col-span-2">
              <button type="submit" disabled={savingTask} className="px-5 py-2 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 transition disabled:opacity-50">{savingTask ? "Saving..." : "Add Task"}</button>
              <button type="button" onClick={() => { setIsTaskModalOpen(false); setTaskForm(emptyTaskForm); }} className="px-5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition">Cancel</button>
            </div>
          </form>
        )}

        {tasks.length === 0 ? (
          <p className="p-6 text-sm text-gray-400 text-center">No tasks yet.</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {tasks.map((task) => (
              <div key={task.id} className="p-4 px-6 flex items-center justify-between gap-4">
                <div>
                  <p className={`font-bold text-sm ${task.status === "Done" ? "text-gray-400 line-through" : "text-gray-900 dark:text-white"}`}>{task.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{getStaffName(task.assigned_to) || "Unassigned"}{task.due_date ? ` • Due ${task.due_date}` : ""} • {task.priority}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <select value={task.status} onChange={(e) => handleTaskStatusChange(task.id, e.target.value as TaskStatus)} className="text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 outline-none focus:ring-2 focus:ring-teal-500/20 text-gray-700 dark:text-gray-300">
                    {(["To Do", "In Progress", "Done"] as TaskStatus[]).map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {isAdmin && <button onClick={() => handleDeleteTask(task.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><FiTrash2 className="w-3.5 h-3.5" /></button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
