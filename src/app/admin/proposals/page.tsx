"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Customer, Proposal, ProposalStatus } from "@/types/database";
import { toast } from "react-hot-toast";
import { FiFileText, FiPlus, FiEdit2, FiTrash2, FiPaperclip, FiDownload } from "react-icons/fi";
import { getAssetPublicUrl } from "@/lib/storage";

const emptyForm = {
  customer_id: "" as number | "",
  title: "",
  description: "",
  amount: "",
  status: "Draft" as ProposalStatus,
  sent_date: "",
  document_key: "" as string | null,
};

const STATUS_TABS: { label: string; value: ProposalStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Draft", value: "Draft" },
  { label: "Sent", value: "Sent" },
  { label: "Accepted", value: "Accepted" },
  { label: "Rejected", value: "Rejected" },
  { label: "Expired", value: "Expired" },
];

const STATUS_BADGE: Record<ProposalStatus, string> = {
  Draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  Sent: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  Accepted: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  Rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  Expired: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
};

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);
  const [statusTab, setStatusTab] = useState<ProposalStatus | "all">("all");
  const [formData, setFormData] = useState(emptyForm);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

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

  const fetchProposals = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/proposals", { headers: authHeaders() });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      setProposals(data.proposals || []);
    } catch (error) {
      console.error("Error fetching proposals:", error);
      toast.error("Failed to load proposals");
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

  useEffect(() => { fetchProposals(); fetchCustomers(); }, [fetchProposals, fetchCustomers]);

  const getCustomerName = (id: number) => customers.find((c) => c.id === id)?.company_name || "Unknown";
  const filteredProposals = proposals.filter((p) => statusTab === "all" || p.status === statusTab);

  const resetForm = () => {
    setFormData(emptyForm);
    setDocumentFile(null);
    setEditingProposal(null);
  };

  const openModal = (proposal: Proposal | null = null) => {
    if (proposal) {
      setEditingProposal(proposal);
      setFormData({
        customer_id: proposal.customer_id,
        title: proposal.title,
        description: proposal.description || "",
        amount: proposal.amount || "",
        status: proposal.status,
        sent_date: proposal.sent_date || "",
        document_key: proposal.document_key || null,
      });
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Only PDF files are supported");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File is too large. Maximum size is 10MB");
      return;
    }
    setDocumentFile(file);
  };

  const uploadDocument = async (file: File): Promise<string | null> => {
    try {
      setIsUploading(true);
      const uploadForm = new FormData();
      uploadForm.append("file", file);
      uploadForm.append("fileType", "PROPOSAL_DOCUMENTS");
      const response = await fetch("/api/upload/storage", { method: "POST", headers: authHeaders(), body: uploadForm });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Upload failed");
      return data.key;
    } catch (error) {
      console.error("Error uploading document:", error);
      toast.error("Failed to upload document");
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_id || !formData.title.trim()) {
      toast.error("Customer and title are required");
      return;
    }
    try {
      setIsSubmitting(true);
      let document_key = formData.document_key;
      if (documentFile) {
        const uploadedKey = await uploadDocument(documentFile);
        if (uploadedKey) document_key = uploadedKey;
      }

      const url = editingProposal ? `/api/admin/proposals/${editingProposal.id}` : "/api/admin/proposals";
      const response = await fetch(url, {
        method: editingProposal ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ ...formData, document_key }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      toast.success(editingProposal ? "Proposal updated" : "Proposal created");
      setIsModalOpen(false);
      resetForm();
      fetchProposals();
    } catch (error) {
      console.error("Error saving proposal:", error);
      toast.error("Failed to save proposal");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this proposal?")) return;
    try {
      const response = await fetch(`/api/admin/proposals/${id}`, { method: "DELETE", headers: authHeaders() });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      setProposals(proposals.filter((p) => p.id !== id));
      toast.success("Proposal deleted");
    } catch (error) {
      console.error("Error deleting proposal:", error);
      toast.error("Failed to delete proposal");
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
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Proposals</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium mt-1">Track proposals sent to customers.</p>
        </div>
        <button onClick={() => openModal()} className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm transition-colors">
          <FiPlus /> New Proposal
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
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"><FiFileText className="text-teal-600" /> {editingProposal ? "Edit Proposal" : "New Proposal"}</h3>
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
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Title</label>
              <input value={formData.title} onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))} required className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Amount</label>
              <input value={formData.amount} onChange={(e) => setFormData((p) => ({ ...p, amount: e.target.value }))} placeholder="E.g. £15,000" className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Status</label>
              <select value={formData.status} onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value as ProposalStatus }))} className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20">
                {(["Draft", "Sent", "Accepted", "Rejected", "Expired"] as ProposalStatus[]).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Sent Date</label>
              <input type="date" value={formData.sent_date} onChange={(e) => setFormData((p) => ({ ...p, sent_date: e.target.value }))} className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Description</label>
              <textarea value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} rows={3} className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Document (PDF)</label>
              <input type="file" accept="application/pdf" onChange={handleDocumentChange} className="w-full text-sm text-gray-600 dark:text-gray-300" />
              {formData.document_key && !documentFile && (
                <a href={getAssetPublicUrl(formData.document_key)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-teal-600 hover:underline mt-1">
                  <FiPaperclip className="w-3 h-3" /> Current document attached
                </a>
              )}
            </div>
            <div className="flex items-center gap-3 md:col-span-2 pt-4 border-t border-gray-100 dark:border-gray-800">
              <button type="submit" disabled={isSubmitting || isUploading} className="px-6 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 transition disabled:opacity-50">
                {isUploading ? "Uploading..." : isSubmitting ? "Saving..." : editingProposal ? "Save Changes" : "Create Proposal"}
              </button>
              <button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }} disabled={isSubmitting} className="px-6 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="py-20 flex justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div></div>
      ) : filteredProposals.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 py-24 text-center">
          <FiFileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">No proposals found</h3>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm divide-y divide-gray-100 dark:divide-gray-800">
          {filteredProposals.map((proposal) => (
            <div key={proposal.id} className="p-5 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-gray-900 dark:text-white text-sm">{proposal.title}</p>
                  <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-lg ${STATUS_BADGE[proposal.status]}`}>{proposal.status}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{getCustomerName(proposal.customer_id)}{proposal.amount ? ` • ${proposal.amount}` : ""}{proposal.sent_date ? ` • Sent ${proposal.sent_date}` : ""}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {proposal.document_key && (
                  <a href={getAssetPublicUrl(proposal.document_key)} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-colors">
                    <FiDownload className="w-4 h-4" />
                  </a>
                )}
                <button onClick={() => openModal(proposal)} className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-colors"><FiEdit2 className="w-4 h-4" /></button>
                {isAdmin && <button onClick={() => handleDelete(proposal.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><FiTrash2 className="w-4 h-4" /></button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
