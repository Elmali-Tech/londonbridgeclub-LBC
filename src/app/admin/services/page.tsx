"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-hot-toast";
import { FiPlus, FiEdit2, FiTrash2, FiPackage, FiSearch } from "react-icons/fi";

interface Partner { id: number; name: string; }
interface Customer { id: number; company_name: string; partner_id: number | null; }
interface Service {
  id: number;
  name: string;
  description: string | null;
  partner_id: number;
  customer_id: number;
  status: string;
  created_at: string;
  partners: { id: number; name: string } | null;
  customers: { id: number; company_name: string } | null;
}

const STATUS_OPTIONS = ["active", "inactive", "pending"];

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    inactive: "bg-gray-100 text-gray-600",
    pending: "bg-amber-100 text-amber-800",
  };
  return map[status] ?? "bg-gray-100 text-gray-600";
};

const emptyForm = {
  name: "",
  description: "",
  partner_id: "" as number | "",
  customer_id: "" as number | "",
  status: "active",
};

export default function ServicesPage() {
  const { user, isLoading: isLoadingAuth } = useAuth();
  const router = useRouter();

  const userRole = user?.role || (user?.is_admin ? "admin" : "viewer");
  const hasAccess = ["admin", "opportunity_manager", "sales_member"].includes(userRole);
  const isAdmin = userRole === "admin";

  const [services, setServices] = useState<Service[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("authToken")}`,
  });

  useEffect(() => {
    if (!isLoadingAuth && !hasAccess && user) router.push("/admin");
  }, [hasAccess, isLoadingAuth, user, router]);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [sRes, pRes, cRes] = await Promise.all([
        fetch("/api/admin/services", { headers: authHeaders() }),
        fetch("/api/admin/partners", { headers: authHeaders() }),
        fetch("/api/admin/customers", { headers: authHeaders() }),
      ]);
      const [sData, pData, cData] = await Promise.all([sRes.json(), pRes.json(), cRes.json()]);
      if (sData.success) setServices(sData.services);
      if (pData.success) setPartners(pData.partners);
      if (cData.success) setCustomers(cData.customers);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  // Customers filtered by the currently-selected partner in the form
  const filteredFormCustomers = formData.partner_id
    ? customers.filter((c) => c.partner_id === Number(formData.partner_id))
    : customers;

  const filteredServices = services.filter((s) => {
    const q = searchTerm.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.partners?.name ?? "").toLowerCase().includes(q) ||
      (s.customers?.company_name ?? "").toLowerCase().includes(q)
    );
  });

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEdit = (s: Service) => {
    setFormData({
      name: s.name,
      description: s.description ?? "",
      partner_id: s.partner_id,
      customer_id: s.customer_id,
      status: s.status,
    });
    setEditingId(s.id);
    setIsModalOpen(true);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    // Reset customer when partner changes
    if (name === "partner_id") {
      setFormData((prev) => ({ ...prev, partner_id: value === "" ? "" : Number(value), customer_id: "" }));
    } else if (name === "customer_id") {
      setFormData((prev) => ({ ...prev, customer_id: value === "" ? "" : Number(value) }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) { toast.error("Service name is required"); return; }
    if (!formData.partner_id) { toast.error("Partner is required"); return; }
    if (!formData.customer_id) { toast.error("Customer is required"); return; }

    setIsSubmitting(true);
    try {
      const url = editingId ? `/api/admin/services/${editingId}` : "/api/admin/services";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to save");

      toast.success(editingId ? "Service updated" : "Service created");
      setIsModalOpen(false);
      resetForm();
      fetchAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/services/${id}`, { method: "DELETE", headers: authHeaders() });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to delete");
      setServices((prev) => prev.filter((s) => s.id !== id));
      setDeleteConfirmId(null);
      toast.success("Service deleted");
    } catch {
      toast.error("Failed to delete service");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-100px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600" />
      </div>
    );
  }
  if (!hasAccess) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 min-h-screen text-gray-900 dark:text-gray-100">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Services</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium mt-1">
            Services linked to a Partner and a Customer.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3 flex-1">
          <div className="relative w-full sm:max-w-xs lg:w-64 shrink-0">
            <input
              type="text"
              placeholder="Search services..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors placeholder:text-gray-400"
            />
            <FiSearch className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm transition-colors"
          >
            <FiPlus /> New Service
          </button>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="mb-10 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FiPackage className="text-teal-600" />
              {editingId ? "Edit Service" : "New Service"}
            </h3>
          </div>
          <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Service Name *</label>
              <input
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g. Akaryakıt"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                required
              />
            </div>

            {/* Partner */}
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Partner *</label>
              <select
                name="partner_id"
                value={formData.partner_id}
                onChange={handleInputChange}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                required
              >
                <option value="">Select a partner…</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Customer — filtered by selected partner */}
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Customer *</label>
              <select
                name="customer_id"
                value={formData.customer_id}
                onChange={handleInputChange}
                disabled={!formData.partner_id}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 disabled:opacity-50"
                required
              >
                <option value="">
                  {formData.partner_id ? "Select a customer…" : "Select a partner first"}
                </option>
                {filteredFormCustomers.map((c) => (
                  <option key={c.id} value={c.id}>{c.company_name}</option>
                ))}
              </select>
              {formData.partner_id && filteredFormCustomers.length === 0 && (
                <p className="text-xs text-amber-600">No customers linked to this partner yet.</p>
              )}
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                placeholder="Describe the service…"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 resize-none"
              />
            </div>

            <div className="flex items-center gap-3 md:col-span-2 pt-4 border-t border-gray-100 dark:border-gray-800">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 transition disabled:opacity-50"
              >
                {isSubmitting ? "Saving…" : editingId ? "Save Changes" : "Create Service"}
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
      ) : filteredServices.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 py-24 text-center">
          <FiPackage className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">No services found</h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            {searchTerm ? "Adjust your search." : "Create the first service using the button above."}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-6 py-4 font-bold">Service</th>
                  <th className="px-6 py-4 font-bold">Partner</th>
                  <th className="px-6 py-4 font-bold">Customer</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredServices.map((service) => (
                  <tr key={service.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900 dark:text-white">{service.name}</p>
                      {service.description && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{service.description}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {service.partners?.name ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {service.customers?.company_name ?? "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${statusBadge(service.status)}`}>
                        {service.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(service)}
                          className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          deleteConfirmId === service.id ? (
                            <>
                              <button onClick={() => setDeleteConfirmId(null)} className="px-3 py-1.5 text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 rounded-lg">Cancel</button>
                              <button onClick={() => handleDelete(service.id)} disabled={isSubmitting} className="px-3 py-1.5 text-xs font-bold bg-red-600 text-white hover:bg-red-700 rounded-lg disabled:opacity-50">Confirm</button>
                            </>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(service.id)}
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          )
                        )}
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
