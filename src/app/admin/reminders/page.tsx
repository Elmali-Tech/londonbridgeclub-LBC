"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Customer, Reminder } from "@/types/database";
import { toast } from "react-hot-toast";
import { FiBell, FiPlus, FiTrash2, FiCheck } from "react-icons/fi";

const emptyForm = {
  title: "",
  due_date: "",
  customer_id: "" as number | "",
  notes: "",
};

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
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

  const fetchReminders = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/reminders", { headers: authHeaders() });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      setReminders(data.reminders || []);
    } catch (error) {
      console.error("Error fetching reminders:", error);
      toast.error("Failed to load reminders");
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

  useEffect(() => { fetchReminders(); fetchCustomers(); }, [fetchReminders, fetchCustomers]);

  const getCustomerName = (id?: number | null) => customers.find((c) => c.id === id)?.company_name;
  const today = new Date().toISOString().slice(0, 10);
  const visibleReminders = reminders.filter((r) => showCompleted || !r.is_completed);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.due_date) {
      toast.error("Title and due date are required");
      return;
    }
    try {
      setIsSubmitting(true);
      const response = await fetch("/api/admin/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ ...formData, customer_id: formData.customer_id || null }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      toast.success("Reminder added");
      setIsModalOpen(false);
      setFormData(emptyForm);
      fetchReminders();
    } catch (error) {
      console.error("Error saving reminder:", error);
      toast.error("Failed to save reminder");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleComplete = async (reminder: Reminder) => {
    try {
      const response = await fetch(`/api/admin/reminders/${reminder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ is_completed: !reminder.is_completed }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      setReminders(reminders.map((r) => (r.id === reminder.id ? data.reminder : r)));
    } catch (error) {
      console.error("Error updating reminder:", error);
      toast.error("Failed to update reminder");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this reminder?")) return;
    try {
      const response = await fetch(`/api/admin/reminders/${id}`, { method: "DELETE", headers: authHeaders() });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      setReminders(reminders.filter((r) => r.id !== id));
      toast.success("Reminder deleted");
    } catch (error) {
      console.error("Error deleting reminder:", error);
      toast.error("Failed to delete reminder");
    }
  };

  if (isLoadingAuth) {
    return <div className="flex justify-center items-center h-[calc(100vh-100px)]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div></div>;
  }
  if (!hasAccess) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-in fade-in duration-500 text-gray-900 dark:text-gray-100 min-h-screen">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Reminders</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium mt-1">Follow-ups and to-dos for the CRM team.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm transition-colors">
          <FiPlus /> New Reminder
        </button>
      </div>

      <label className="mb-6 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 w-fit cursor-pointer">
        <input type="checkbox" checked={showCompleted} onChange={(e) => setShowCompleted(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-600" />
        Show completed
      </label>

      {isModalOpen && (
        <div className="mb-10 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"><FiBell className="text-teal-600" /> New Reminder</h3>
          </div>
          <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Title</label>
              <input value={formData.title} onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))} placeholder="E.g. Follow up on proposal" required className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Due Date</label>
              <input type="date" value={formData.due_date} onChange={(e) => setFormData((p) => ({ ...p, due_date: e.target.value }))} required className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Customer (optional)</label>
              <select value={formData.customer_id} onChange={(e) => setFormData((p) => ({ ...p, customer_id: e.target.value ? Number(e.target.value) : "" }))} className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20">
                <option value="">None</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Notes</label>
              <textarea value={formData.notes} onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))} rows={2} className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
            </div>
            <div className="flex items-center gap-3 md:col-span-2 pt-4 border-t border-gray-100 dark:border-gray-800">
              <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 transition disabled:opacity-50">{isSubmitting ? "Saving..." : "Add Reminder"}</button>
              <button type="button" onClick={() => { setIsModalOpen(false); setFormData(emptyForm); }} disabled={isSubmitting} className="px-6 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="py-20 flex justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div></div>
      ) : visibleReminders.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 py-24 text-center">
          <FiBell className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Nothing here</h3>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm divide-y divide-gray-100 dark:divide-gray-800">
          {visibleReminders.map((reminder) => {
            const isOverdue = !reminder.is_completed && reminder.due_date < today;
            return (
              <div key={reminder.id} className="p-4 px-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleComplete(reminder)}
                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      reminder.is_completed ? "bg-teal-600 border-teal-600 text-white" : "border-gray-300 dark:border-gray-600 hover:border-teal-500"
                    }`}
                  >
                    {reminder.is_completed && <FiCheck className="w-3.5 h-3.5" />}
                  </button>
                  <div>
                    <p className={`font-bold text-sm ${reminder.is_completed ? "text-gray-400 line-through" : "text-gray-900 dark:text-white"}`}>{reminder.title}</p>
                    <p className={`text-xs ${isOverdue ? "text-red-600 font-bold" : "text-gray-500 dark:text-gray-400"}`}>
                      Due {reminder.due_date}{isOverdue ? " (Overdue)" : ""}{getCustomerName(reminder.customer_id) ? ` • ${getCustomerName(reminder.customer_id)}` : ""}
                    </p>
                  </div>
                </div>
                {isAdmin && (
                  <button onClick={() => handleDelete(reminder.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
