"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Customer, CustomerContact, CustomerNote } from "@/types/database";
import { toast } from "react-hot-toast";
import { FiArrowLeft, FiBriefcase, FiEdit2, FiPlus, FiTrash2, FiUser, FiMessageSquare, FiBriefcase as FiOpportunity } from "react-icons/fi";

type StaffOption = { id: number; full_name: string };
type OpportunityRow = { id: number; opportunity_title: string; company_name: string; status: string; deal_stage?: string };

const emptyContactForm = { full_name: "", title: "", email: "", phone: "", is_primary: false, notes: "" };

export default function CustomerDetailPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;

  const userRole = user?.role || (user?.is_admin ? "admin" : "viewer");
  const hasAccess = userRole === "admin" || userRole === "opportunity_manager" || userRole === "sales_member";
  const isAdmin = userRole === "admin";

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [contacts, setContacts] = useState<CustomerContact[]>([]);
  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [relatedOpportunities, setRelatedOpportunities] = useState<OpportunityRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    company_name: "", industry: "", website_url: "", address: "", solutions_used: "", responsible_person: "" as number | "",
  });
  const [savingCompany, setSavingCompany] = useState(false);

  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<CustomerContact | null>(null);
  const [contactForm, setContactForm] = useState(emptyContactForm);
  const [savingContact, setSavingContact] = useState(false);

  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const authHeaders = () => {
    const token = localStorage.getItem("authToken");
    return { Authorization: `Bearer ${token}` };
  };

  useEffect(() => {
    if (!authLoading && !hasAccess && user) {
      router.push("/admin");
    }
  }, [hasAccess, authLoading, router, user]);

  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/customers/${customerId}`, { headers: authHeaders() });
      const data = await response.json();
      if (!data.success) {
        toast.error(data.error || "Customer not found");
        router.push("/admin/customers");
        return;
      }
      setCustomer(data.customer);
      setContacts(data.contacts || []);
      setNotes(data.notes || []);
      setCompanyForm({
        company_name: data.customer.company_name,
        industry: data.customer.industry || "",
        website_url: data.customer.website_url || "",
        address: data.customer.address || "",
        solutions_used: data.customer.solutions_used || "",
        responsible_person: data.customer.responsible_person || "",
      });
    } catch (error) {
      console.error("Error fetching customer:", error);
      toast.error("Failed to load customer");
    } finally {
      setLoading(false);
    }
  }, [customerId, router]);

  const fetchStaff = async () => {
    try {
      const { data } = await supabase
        .from('users')
        .select('id, full_name')
        .in('role', ['admin', 'opportunity_manager', 'sales_member'])
        .order('full_name', { ascending: true });
      if (data) setStaff(data);
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const fetchRelatedOpportunities = useCallback(async () => {
    if (!customer) return;
    try {
      const response = await fetch("/api/customer-opportunities", { headers: authHeaders() });
      const data = await response.json();
      if (data.success) {
        const matches = (data.opportunities || []).filter(
          (o: OpportunityRow) => o.company_name?.toLowerCase() === customer.company_name.toLowerCase()
        );
        setRelatedOpportunities(matches);
      }
    } catch (error) {
      console.error("Error fetching related opportunities:", error);
    }
  }, [customer]);

  useEffect(() => { if (hasAccess) { fetchDetail(); fetchStaff(); } }, [hasAccess, fetchDetail]);
  useEffect(() => { fetchRelatedOpportunities(); }, [fetchRelatedOpportunities]);

  const getResponsibleName = (id?: number | null) => staff.find((s) => s.id === id)?.full_name;

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyForm.company_name.trim()) {
      toast.error("Company name is required");
      return;
    }
    try {
      setSavingCompany(true);
      const response = await fetch(`/api/admin/customers/${customerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ ...companyForm, responsible_person: companyForm.responsible_person || null }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Failed to update customer");
      setCustomer(data.customer);
      setIsEditingCompany(false);
      toast.success("Customer updated");
    } catch (error) {
      console.error("Error updating customer:", error);
      toast.error("Failed to update customer");
    } finally {
      setSavingCompany(false);
    }
  };

  const openContactModal = (contact: CustomerContact | null = null) => {
    if (contact) {
      setEditingContact(contact);
      setContactForm({
        full_name: contact.full_name,
        title: contact.title || "",
        email: contact.email || "",
        phone: contact.phone || "",
        is_primary: contact.is_primary,
        notes: contact.notes || "",
      });
    } else {
      setEditingContact(null);
      setContactForm(emptyContactForm);
    }
    setIsContactModalOpen(true);
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.full_name.trim()) {
      toast.error("Contact name is required");
      return;
    }
    try {
      setSavingContact(true);
      const url = editingContact
        ? `/api/admin/customers/${customerId}/contacts/${editingContact.id}`
        : `/api/admin/customers/${customerId}/contacts`;
      const response = await fetch(url, {
        method: editingContact ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(contactForm),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Failed to save contact");

      toast.success(editingContact ? "Contact updated" : "Contact added");
      setIsContactModalOpen(false);
      setContactForm(emptyContactForm);
      setEditingContact(null);
      fetchDetail();
    } catch (error) {
      console.error("Error saving contact:", error);
      toast.error("Failed to save contact");
    } finally {
      setSavingContact(false);
    }
  };

  const handleDeleteContact = async (contactId: number) => {
    if (!confirm("Remove this contact?")) return;
    try {
      const response = await fetch(`/api/admin/customers/${customerId}/contacts/${contactId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Failed to delete contact");
      setContacts(contacts.filter((c) => c.id !== contactId));
      toast.success("Contact removed");
    } catch (error) {
      console.error("Error deleting contact:", error);
      toast.error("Failed to delete contact");
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    try {
      setSavingNote(true);
      const response = await fetch(`/api/admin/customers/${customerId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ note: newNote.trim() }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Failed to add note");
      setNotes([data.note, ...notes]);
      setNewNote("");
    } catch (error) {
      console.error("Error adding note:", error);
      toast.error("Failed to add note");
    } finally {
      setSavingNote(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-100px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }
  if (!hasAccess || !customer) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-in fade-in duration-500 text-gray-900 dark:text-gray-100 min-h-screen">
      <Link href="/admin/customers" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-teal-600 transition-colors mb-6">
        <FiArrowLeft /> Back to Customers
      </Link>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden mb-8">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FiBriefcase className="text-teal-600" /> Company Profile
          </h3>
          {!isEditingCompany && (
            <button onClick={() => setIsEditingCompany(true)} className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-colors">
              <FiEdit2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {isEditingCompany ? (
          <form onSubmit={handleSaveCompany} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Company Name</label>
              <input
                value={companyForm.company_name}
                onChange={(e) => setCompanyForm((p) => ({ ...p, company_name: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Industry</label>
              <input
                value={companyForm.industry}
                onChange={(e) => setCompanyForm((p) => ({ ...p, industry: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Website</label>
              <input
                type="url"
                value={companyForm.website_url}
                onChange={(e) => setCompanyForm((p) => ({ ...p, website_url: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Responsible Person</label>
              <select
                value={companyForm.responsible_person}
                onChange={(e) => setCompanyForm((p) => ({ ...p, responsible_person: e.target.value as any }))}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              >
                <option value="">Unassigned</option>
                {staff.map((person) => (
                  <option key={person.id} value={person.id}>{person.full_name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Address</label>
              <textarea
                value={companyForm.address}
                onChange={(e) => setCompanyForm((p) => ({ ...p, address: e.target.value }))}
                rows={2}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Solutions Currently Used</label>
              <textarea
                value={companyForm.solutions_used}
                onChange={(e) => setCompanyForm((p) => ({ ...p, solutions_used: e.target.value }))}
                rows={2}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
            <div className="flex items-center gap-3 md:col-span-2 pt-4 border-t border-gray-100 dark:border-gray-800">
              <button type="submit" disabled={savingCompany} className="px-6 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 transition disabled:opacity-50">
                {savingCompany ? "Saving..." : "Save Changes"}
              </button>
              <button type="button" onClick={() => setIsEditingCompany(false)} disabled={savingCompany} className="px-6 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white md:col-span-2">{customer.company_name}</h2>
            <div><p className="text-xs font-bold text-gray-400 uppercase">Industry</p><p className="text-sm text-gray-700 dark:text-gray-300">{customer.industry || "—"}</p></div>
            <div><p className="text-xs font-bold text-gray-400 uppercase">Website</p><p className="text-sm text-gray-700 dark:text-gray-300">{customer.website_url ? <a href={customer.website_url} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">{customer.website_url}</a> : "—"}</p></div>
            <div><p className="text-xs font-bold text-gray-400 uppercase">Responsible Person</p><p className="text-sm text-gray-700 dark:text-gray-300">{getResponsibleName(customer.responsible_person) || "Unassigned"}</p></div>
            <div><p className="text-xs font-bold text-gray-400 uppercase">Address</p><p className="text-sm text-gray-700 dark:text-gray-300">{customer.address || "—"}</p></div>
            <div className="md:col-span-2"><p className="text-xs font-bold text-gray-400 uppercase">Solutions Currently Used</p><p className="text-sm text-gray-700 dark:text-gray-300">{customer.solutions_used || "—"}</p></div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden mb-8">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FiUser className="text-teal-600" /> Authorized Contacts
          </h3>
          <button onClick={() => openContactModal()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors">
            <FiPlus className="w-3.5 h-3.5" /> Add Contact
          </button>
        </div>

        {isContactModalOpen && (
          <form onSubmit={handleSaveContact} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-800/20">
            <input placeholder="Full Name" value={contactForm.full_name} onChange={(e) => setContactForm((p) => ({ ...p, full_name: e.target.value }))} required className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
            <input placeholder="Title / Role" value={contactForm.title} onChange={(e) => setContactForm((p) => ({ ...p, title: e.target.value }))} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
            <input type="email" placeholder="Email" value={contactForm.email} onChange={(e) => setContactForm((p) => ({ ...p, email: e.target.value }))} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
            <input placeholder="Phone" value={contactForm.phone} onChange={(e) => setContactForm((p) => ({ ...p, phone: e.target.value }))} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
            <label className="flex items-center gap-2 md:col-span-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={contactForm.is_primary} onChange={(e) => setContactForm((p) => ({ ...p, is_primary: e.target.checked }))} className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-600" />
              Primary contact
            </label>
            <div className="flex items-center gap-3 md:col-span-2">
              <button type="submit" disabled={savingContact} className="px-5 py-2 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 transition disabled:opacity-50">
                {savingContact ? "Saving..." : editingContact ? "Save Changes" : "Add Contact"}
              </button>
              <button type="button" onClick={() => { setIsContactModalOpen(false); setEditingContact(null); }} className="px-5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                Cancel
              </button>
            </div>
          </form>
        )}

        {contacts.length === 0 ? (
          <p className="p-6 text-sm text-gray-400 text-center">No contacts added yet.</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {contacts.map((contact) => (
              <div key={contact.id} className="p-4 px-6 flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                    {contact.full_name}
                    {contact.is_primary && <span className="px-1.5 py-0.5 text-[9px] font-black uppercase bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 rounded">Primary</span>}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{[contact.title, contact.email, contact.phone].filter(Boolean).join(" • ") || "—"}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openContactModal(contact)} className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-colors">
                    <FiEdit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDeleteContact(contact.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                    <FiTrash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {relatedOpportunities.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden mb-8">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FiOpportunity className="text-teal-600" /> Open Opportunities
            </h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {relatedOpportunities.map((opp) => (
              <div key={opp.id} className="p-4 px-6 flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{opp.opportunity_title}</p>
                <span className="text-xs font-bold text-gray-400 uppercase">{opp.deal_stage || opp.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FiMessageSquare className="text-teal-600" /> Communication History
          </h3>
        </div>
        <form onSubmit={handleAddNote} className="p-6 border-b border-gray-100 dark:border-gray-800 flex gap-3">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Log a call, email, or meeting summary..."
            rows={2}
            className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
          />
          <button type="submit" disabled={savingNote || !newNote.trim()} className="px-5 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 transition disabled:opacity-50 self-start">
            {savingNote ? "Logging..." : "Log"}
          </button>
        </form>
        {notes.length === 0 ? (
          <p className="p-6 text-sm text-gray-400 text-center">No communication logged yet.</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {notes.map((note) => (
              <div key={note.id} className="p-4 px-6">
                <p className="text-sm text-gray-700 dark:text-gray-300">{note.note}</p>
                <p className="text-[11px] text-gray-400 mt-1">{new Date(note.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
