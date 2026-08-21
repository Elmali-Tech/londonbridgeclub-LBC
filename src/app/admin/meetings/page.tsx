"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Customer, CustomerContact, Meeting, MeetingType } from "@/types/database";
import { toast } from "react-hot-toast";
import { FiCalendar, FiPlus, FiEdit2, FiTrash2, FiPhone, FiVideo, FiMapPin } from "react-icons/fi";

const emptyForm = {
  customer_id: "" as number | "",
  contact_id: "" as number | "",
  title: "",
  meeting_date: "",
  meeting_time: "",
  meeting_type: "In-Person" as MeetingType,
  attendees: "",
  notes: "",
};

const TYPE_ICON: Record<MeetingType, React.ReactNode> = {
  "In-Person": <FiMapPin className="w-3.5 h-3.5" />,
  "Call": <FiPhone className="w-3.5 h-3.5" />,
  "Video Call": <FiVideo className="w-3.5 h-3.5" />,
};

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [contacts, setContacts] = useState<CustomerContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [formData, setFormData] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user, isLoading: isLoadingAuth } = useAuth();
  const router = useRouter();

  const userRole = user?.role || (user?.is_admin ? "admin" : "viewer");
  const hasAccess = userRole === "admin" || userRole === "opportunity_manager" || userRole === "sales_member";

  const authHeaders = () => {
    const token = localStorage.getItem("authToken");
    return { Authorization: `Bearer ${token}` };
  };

  useEffect(() => {
    if (!isLoadingAuth && !hasAccess && user) router.push("/admin");
  }, [hasAccess, isLoadingAuth, router, user]);

  const fetchMeetings = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/meetings", { headers: authHeaders() });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      setMeetings(data.meetings || []);
    } catch (error) {
      console.error("Error fetching meetings:", error);
      toast.error("Failed to load meetings");
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

  useEffect(() => { fetchMeetings(); fetchCustomers(); }, [fetchMeetings, fetchCustomers]);

  const fetchContactsForCustomer = async (customerId: number) => {
    try {
      const response = await fetch(`/api/admin/customers/${customerId}`, { headers: authHeaders() });
      const data = await response.json();
      if (data.success) setContacts(data.contacts || []);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      setContacts([]);
    }
  };

  const getCustomerName = (id: number) => customers.find((c) => c.id === id)?.company_name || "Unknown";

  const today = new Date().toISOString().slice(0, 10);
  const filteredMeetings = meetings.filter((m) =>
    tab === "upcoming" ? m.meeting_date >= today : m.meeting_date < today
  );

  const resetForm = () => {
    setFormData(emptyForm);
    setContacts([]);
    setEditingMeeting(null);
  };

  const openModal = (meeting: Meeting | null = null) => {
    if (meeting) {
      setEditingMeeting(meeting);
      setFormData({
        customer_id: meeting.customer_id,
        contact_id: meeting.contact_id || "",
        title: meeting.title,
        meeting_date: meeting.meeting_date,
        meeting_time: meeting.meeting_time || "",
        meeting_type: meeting.meeting_type,
        attendees: meeting.attendees || "",
        notes: meeting.notes || "",
      });
      fetchContactsForCustomer(meeting.customer_id);
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleCustomerChange = (value: string) => {
    const customerId = value ? Number(value) : "";
    setFormData((p) => ({ ...p, customer_id: customerId, contact_id: "" }));
    if (customerId) fetchContactsForCustomer(customerId);
    else setContacts([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_id || !formData.title.trim() || !formData.meeting_date) {
      toast.error("Customer, title, and date are required");
      return;
    }
    try {
      setIsSubmitting(true);
      const url = editingMeeting ? `/api/admin/meetings/${editingMeeting.id}` : "/api/admin/meetings";
      const response = await fetch(url, {
        method: editingMeeting ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          ...formData,
          contact_id: formData.contact_id || null,
        }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      toast.success(editingMeeting ? "Meeting updated" : "Meeting logged");
      setIsModalOpen(false);
      resetForm();
      fetchMeetings();
    } catch (error) {
      console.error("Error saving meeting:", error);
      toast.error("Failed to save meeting");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this meeting?")) return;
    try {
      const response = await fetch(`/api/admin/meetings/${id}`, { method: "DELETE", headers: authHeaders() });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      setMeetings(meetings.filter((m) => m.id !== id));
      toast.success("Meeting deleted");
    } catch (error) {
      console.error("Error deleting meeting:", error);
      toast.error("Failed to delete meeting");
    }
  };

  if (isLoadingAuth) {
    return <div className="flex justify-center items-center h-[calc(100vh-100px)]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div></div>;
  }
  if (!hasAccess) return null;
  const isAdmin = userRole === "admin";

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-in fade-in duration-500 text-gray-900 dark:text-gray-100 min-h-screen">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Meetings</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium mt-1">Log meetings and calls with customers.</p>
        </div>
        <button onClick={() => openModal()} className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm transition-colors">
          <FiPlus /> Log Meeting
        </button>
      </div>

      <div className="mb-6 flex gap-2">
        {(["upcoming", "past"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-lg transition-all ${
              tab === t ? "bg-teal-600 text-white shadow-sm" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {t === "upcoming" ? "Upcoming" : "Past"}
          </button>
        ))}
      </div>

      {isModalOpen && (
        <div className="mb-10 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"><FiCalendar className="text-teal-600" /> {editingMeeting ? "Edit Meeting" : "Log Meeting"}</h3>
          </div>
          <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Customer</label>
              <select value={formData.customer_id} onChange={(e) => handleCustomerChange(e.target.value)} required className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20">
                <option value="">Select a customer</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </div>
            {contacts.length > 0 && (
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Contact (optional)</label>
                <select value={formData.contact_id} onChange={(e) => setFormData((p) => ({ ...p, contact_id: e.target.value ? Number(e.target.value) : "" }))} className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20">
                  <option value="">Unspecified</option>
                  {contacts.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                </select>
              </div>
            )}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Title</label>
              <input value={formData.title} onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))} placeholder="E.g. Discovery call" required className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Date</label>
              <input type="date" value={formData.meeting_date} onChange={(e) => setFormData((p) => ({ ...p, meeting_date: e.target.value }))} required className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Time</label>
              <input type="time" value={formData.meeting_time} onChange={(e) => setFormData((p) => ({ ...p, meeting_time: e.target.value }))} className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Type</label>
              <select value={formData.meeting_type} onChange={(e) => setFormData((p) => ({ ...p, meeting_type: e.target.value as MeetingType }))} className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20">
                <option value="In-Person">In-Person</option>
                <option value="Call">Call</option>
                <option value="Video Call">Video Call</option>
              </select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Attendees</label>
              <input value={formData.attendees} onChange={(e) => setFormData((p) => ({ ...p, attendees: e.target.value }))} placeholder="Names, comma separated" className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Meeting Notes</label>
              <textarea value={formData.notes} onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))} rows={3} className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
            </div>
            <div className="flex items-center gap-3 md:col-span-2 pt-4 border-t border-gray-100 dark:border-gray-800">
              <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 transition disabled:opacity-50">{isSubmitting ? "Saving..." : editingMeeting ? "Save Changes" : "Log Meeting"}</button>
              <button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }} disabled={isSubmitting} className="px-6 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="py-20 flex justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div></div>
      ) : filteredMeetings.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 py-24 text-center">
          <FiCalendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">No {tab} meetings</h3>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm divide-y divide-gray-100 dark:divide-gray-800">
          {filteredMeetings.map((meeting) => (
            <div key={meeting.id} className="p-5 flex items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center flex-shrink-0">
                  {TYPE_ICON[meeting.meeting_type]}
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white text-sm">{meeting.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{getCustomerName(meeting.customer_id)} • {meeting.meeting_date}{meeting.meeting_time ? ` at ${meeting.meeting_time}` : ""}</p>
                  {meeting.notes && <p className="text-xs text-gray-400 mt-1 line-clamp-1 max-w-md">{meeting.notes}</p>}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => openModal(meeting)} className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-colors"><FiEdit2 className="w-4 h-4" /></button>
                {isAdmin && <button onClick={() => handleDelete(meeting.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><FiTrash2 className="w-4 h-4" /></button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
