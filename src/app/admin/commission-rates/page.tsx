"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { CommissionRate } from "@/types/database";
import { toast } from "react-hot-toast";
import { FiPlus, FiEdit2, FiPercent, FiPower } from "react-icons/fi";

const emptyForm = { name: "", percentage: "" };

export default function CommissionRatesPage() {
  const { user, isLoading: isLoadingAuth } = useAuth();
  const router = useRouter();

  const userRole = user?.role || (user?.is_admin ? "admin" : "viewer");
  const isAdmin = userRole === "admin";

  const [rates, setRates] = useState<CommissionRate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("authToken")}` });

  useEffect(() => {
    if (!isLoadingAuth && !isAdmin && user) router.push("/admin");
  }, [isAdmin, isLoadingAuth, user, router]);

  const fetchRates = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/commission-rates", { headers: authHeaders() });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setRates(data.rates || []);
    } catch {
      toast.error("Failed to load commission rates");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchRates(); }, [fetchRates]);

  const resetForm = () => { setFormData(emptyForm); setEditingId(null); };

  const openCreate = () => { resetForm(); setIsModalOpen(true); };

  const openEdit = (rate: CommissionRate) => {
    setFormData({ name: rate.name, percentage: String(rate.percentage) });
    setEditingId(rate.id);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const percentage = Number(formData.percentage);
    if (!formData.name.trim()) { toast.error("Name is required"); return; }
    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
      toast.error("Percentage must be between 0 and 100");
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editingId ? `/api/admin/commission-rates/${editingId}` : "/api/admin/commission-rates";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ name: formData.name.trim(), percentage }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to save");
      toast.success(editingId ? "Rate updated" : "Rate created");
      setIsModalOpen(false);
      resetForm();
      fetchRates();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleActive = async (rate: CommissionRate) => {
    try {
      const res = await fetch(`/api/admin/commission-rates/${rate.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ is_active: !rate.is_active }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setRates((prev) => prev.map((r) => (r.id === rate.id ? data.rate : r)));
      toast.success(rate.is_active ? "Rate deactivated" : "Rate reactivated");
    } catch {
      toast.error("Failed to update rate");
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-100px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600" />
      </div>
    );
  }
  if (!isAdmin) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 min-h-screen text-gray-900 dark:text-gray-100">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Commission Rates</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium mt-1">
            Define the standard commission rates selectable when creating projects.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm transition-colors"
        >
          <FiPlus /> New Rate
        </button>
      </div>

      {/* Form */}
      {isModalOpen && (
        <div className="mb-10 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FiPercent className="text-teal-600" />
              {editingId ? "Edit Commission Rate" : "New Commission Rate"}
            </h3>
          </div>
          <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5 md:col-span-1">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Name *</label>
              <input
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Default Commission"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                required
              />
            </div>
            <div className="space-y-1.5 md:col-span-1">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Percentage (%) *</label>
              <input
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={formData.percentage}
                onChange={(e) => setFormData((p) => ({ ...p, percentage: e.target.value }))}
                placeholder="e.g. 10"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                required
              />
            </div>
            <div className="flex items-center gap-3 md:col-span-2 pt-4 border-t border-gray-100 dark:border-gray-800">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 transition disabled:opacity-50"
              >
                {isSubmitting ? "Saving…" : editingId ? "Save Changes" : "Create Rate"}
              </button>
              <button
                type="button"
                onClick={() => { setIsModalOpen(false); resetForm(); }}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="py-20 flex justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
        </div>
      ) : rates.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 py-24 text-center">
          <FiPercent className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">No commission rates yet</h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">Create your first rate using the button above.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-6 py-4 font-bold">Name</th>
                  <th className="px-6 py-4 font-bold">Percentage</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {rates.map((rate) => (
                  <tr key={rate.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${!rate.is_active ? "opacity-60" : ""}`}>
                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{rate.name}</td>
                    <td className="px-6 py-4 font-semibold text-teal-600 dark:text-teal-400 tabular-nums">{Number(rate.percentage)}%</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${rate.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                        {rate.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(rate)}
                          className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleActive(rate)}
                          className={`p-2 rounded-lg transition-colors ${rate.is_active ? "text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" : "text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"}`}
                          title={rate.is_active ? "Deactivate" : "Reactivate"}
                        >
                          <FiPower className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
