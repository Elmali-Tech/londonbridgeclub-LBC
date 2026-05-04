"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import { CustomerOpportunity } from "@/types/database";
import { motion, AnimatePresence } from "framer-motion";
import AdminContainer from "@/app/components/admin/AdminContainer";
import {
  FiPlus,
  FiSearch,
  FiFilter,
  FiUser,
  FiBriefcase,
  FiDollarSign,
  FiClock,
  FiEdit3,
  FiTrash2,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiCalendar,
  FiActivity,
  FiChevronRight,
  FiLayers,
  FiArrowUpRight
} from "react-icons/fi";

export default function CustomerPoolPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [opportunities, setOpportunities] = useState<CustomerOpportunity[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [tagging, setTagging] = useState<{ type: '@' | '#', query: string, position: number } | null>(null);
  const commonHashtags = ['urgent', 'followup', 'strategic', 'high-value', 'negotiation', 'partnership', 'expansion', 'renewal'];

  // Form State
  const [formData, setFormData] = useState({
    customer_name: "",
    company_name: "",
    contact_person: "",
    opportunity_title: "",
    opportunity_description: "",
    estimated_deal_size: "",
    deal_stage: "Prospect",
    responsible_person: "",
    expected_closing_date: "",
    status: "Active" as "Active" | "Won" | "Lost",
  });

  const filteredPartners = useMemo(() => {
    if (!formData.company_name) return [];
    return partners.filter(p => 
      p.name.toLowerCase().includes(formData.company_name.toLowerCase()) &&
      p.name.toLowerCase() !== formData.company_name.toLowerCase()
    );
  }, [formData.company_name, partners]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/admin");
      return;
    }
    fetchOpportunities();
    fetchPartners();
    fetchUsers();
  }, [user, authLoading, router]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.from('users').select('id, full_name, profile_image_key');
      if (data) setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchPartners = async () => {
    try {
      const { data, error } = await supabase
        .from('partners')
        .select('name, logo_key');
      if (data) setPartners(data);
    } catch (error) {
      console.error('Error fetching partners:', error);
    }
  };

  const fetchOpportunities = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("/api/customer-opportunities", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setOpportunities(data.opportunities || []);
      } else {
        toast.error(data.error || "Failed to fetch opportunities");
      }
    } catch (error) {
      toast.error("Failed to fetch opportunities");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === "company_name") {
      setShowSuggestions(true);
    }
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { value, selectionStart } = e.target;
    setFormData(prev => ({ ...prev, opportunity_description: value }));

    const textBeforeCursor = value.substring(0, selectionStart);
    const words = textBeforeCursor.split(/\s/);
    const lastWord = words[words.length - 1];

    if (lastWord.startsWith('@')) {
      setTagging({ type: '@', query: lastWord.substring(1), position: selectionStart });
    } else if (lastWord.startsWith('#')) {
      setTagging({ type: '#', query: lastWord.substring(1), position: selectionStart });
    } else {
      setTagging(null);
    }
  };

  const handleSelectTag = (value: string) => {
    if (!tagging) return;
    
    const description = formData.opportunity_description;
    const beforeTag = description.substring(0, tagging.position - tagging.query.length - 1);
    const afterTag = description.substring(tagging.position);
    
    const newDescription = `${beforeTag}${tagging.type}${value} ${afterTag}`;
    
    setFormData(prev => ({ ...prev, opportunity_description: newDescription }));
    setTagging(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const token = localStorage.getItem("authToken");

    try {
      const url = editingId
        ? `/api/customer-opportunities/${editingId}`
        : "/api/customer-opportunities";

      // Synchronize with Partners table
      const partnerExists = partners.some(p => p.name.toLowerCase() === formData.company_name.trim().toLowerCase());
      if (!partnerExists && formData.company_name.trim()) {
        await supabase.from('partners').insert({
          name: formData.company_name.trim(),
          description: `Strategic affiliate synchronized from Customer Pool (Primary Contact: ${formData.contact_person || 'N/A'})`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        fetchPartners();
      }

      const response = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(
          editingId ? "Opportunity updated" : "Opportunity created",
        );
        fetchOpportunities();
        resetForm();
      } else {
        toast.error(data.error || "Action failed");
      }
    } catch (error) {
      toast.error("Action failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (opp: CustomerOpportunity) => {
    try {
      let formattedDate = "";
      if (opp.expected_closing_date) {
        const dateObj = new Date(opp.expected_closing_date);
        if (!isNaN(dateObj.getTime())) {
          formattedDate = dateObj.toISOString().split("T")[0];
        }
      }

      setFormData({
        customer_name: opp.customer_name,
        company_name: opp.company_name,
        contact_person: opp.contact_person || "",
        opportunity_title: opp.opportunity_title,
        opportunity_description: opp.opportunity_description || "",
        estimated_deal_size: opp.estimated_deal_size || "",
        deal_stage: opp.deal_stage || "Prospect",
        responsible_person: opp.responsible_person || "",
        expected_closing_date: formattedDate,
        status: opp.status,
      });
      setEditingId(opp.id);
      setShowForm(true);
    } catch (error) {
      toast.error("Could not open edit form");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this record?")) return;

    const token = localStorage.getItem("authToken");
    try {
      const response = await fetch(`/api/customer-opportunities/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Deleted successfully");
        fetchOpportunities();
      } else {
        toast.error(data.error || "Delete failed");
      }
    } catch (error) {
      toast.error("Delete failed");
    }
  };

  const resetForm = () => {
    setFormData({
      customer_name: "",
      company_name: "",
      contact_person: "",
      opportunity_title: "",
      opportunity_description: "",
      estimated_deal_size: "",
      deal_stage: "Prospect",
      responsible_person: "",
      expected_closing_date: "",
      status: "Active",
    });
    setEditingId(null);
    setShowForm(false);
  };

  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((opp) => {
      const matchesSearch =
        opp.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opp.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opp.opportunity_title.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "All" || opp.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [opportunities, searchTerm, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Won": return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
      case "Lost": return "text-rose-500 bg-rose-500/10 border-rose-500/20";
      default: return "text-amber-500 bg-amber-500/10 border-amber-500/20";
    }
  };

  const getPartnerLogo = (companyName: string) => {
    const partner = partners.find(p => p.name.toLowerCase() === companyName.toLowerCase());
    if (partner?.logo_key) {
      return `${process.env.NEXT_PUBLIC_AWS_S3_URL || `https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || 'londonbridgeprojt'}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-1'}.amazonaws.com`}/${partner.logo_key}`;
    }
    return null;
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-white dark:bg-gray-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  const userRole = user?.role || (user?.is_admin ? "admin" : "viewer");
  const canCreate = userRole === "admin" || userRole === "opportunity_manager";
  const canDelete = userRole === "admin";

  return (
    <AdminContainer>
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-500">
        {/* Header Branding */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-amber-500 font-black tracking-[0.2em] text-[10px] uppercase">
              <span className="w-8 h-[2px] bg-amber-500"></span>
              Central Portfolio
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white">
              Customer <span className="text-amber-500 italic">Pool</span>
            </h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium max-w-lg">
              Aggregate hub for strategic prospect management and deal acquisition logic.
            </p>
          </div>

          {canCreate && (
             <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-3 bg-amber-500 hover:bg-amber-600 text-black px-6 py-4 rounded-2xl font-black transition-all shadow-[0_15px_30px_-10px_rgba(245,158,11,0.3)] active:scale-95 text-xs uppercase tracking-widest"
              >
                <FiPlus className="text-xl" /> Create Prospect
              </button>
          )}
        </div>

        {/* Global Stats Overlay */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: "Pipeline Active", value: opportunities.filter(o => o.status === "Active").length, icon: FiActivity, color: "text-amber-500 bg-amber-500/10" },
            { label: "Successfully Closed", value: opportunities.filter(o => o.status === "Won").length, icon: FiCheckCircle, color: "text-emerald-500 bg-emerald-500/10" },
            { label: "Inactive Tracks", value: opportunities.filter(o => o.status === "Lost").length, icon: FiXCircle, color: "text-rose-500 bg-rose-500/10" }
          ].map((stat, i) => (
             <div key={i} className="bg-white dark:bg-gray-900 px-6 py-6 rounded-[1.75rem] border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
                <div>
                   <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{stat.label}</p>
                   <h4 className="text-3xl font-black text-gray-900 dark:text-white leading-none">{stat.value}</h4>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${stat.color}`}>
                   <stat.icon />
                </div>
             </div>
          ))}
        </div>

        {/* Search & Intelligence */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative group">
            <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-amber-500 transition-colors" />
            <input
              type="text"
              placeholder="Query by customer, company or opportunity title..."
              className="w-full pl-14 pr-6 py-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl focus:ring-4 focus:ring-amber-500/5 focus:border-amber-500 transition-all outline-none font-bold text-sm placeholder:text-gray-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
             <div className="hidden md:flex items-center gap-2 text-gray-400 text-[10px] font-black uppercase tracking-widest px-3">
               <FiFilter /> Filter Engines
             </div>
             <select
                className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-6 py-4 outline-none font-black text-xs uppercase tracking-widest text-gray-600 dark:text-gray-300 transition-all focus:border-amber-500 shadow-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Entities</option>
                <option value="Active">Active Pipeline</option>
                <option value="Won">Closed - Won</option>
                <option value="Lost">Closed - Lost</option>
              </select>
          </div>
        </div>

        {/* Portfolio Grid */}
        {filteredOpportunities.length === 0 ? (
          <div className="py-32 flex flex-col items-center justify-center bg-gray-50/30 dark:bg-gray-900/30 rounded-[2.5rem] border border-dashed border-gray-200 dark:border-gray-800">
             <FiLayers size={48} className="text-gray-300 dark:text-gray-700 mb-6" />
             <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-widest">No matching datasets</h3>
             <p className="text-gray-500 font-medium text-sm mt-2">Try adjusting your filters or search parameters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatePresence mode="popLayout">
              {filteredOpportunities.map((opp, idx) => (
                <motion.div
                  key={opp.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4, delay: idx * 0.05 }}
                  className="group bg-white dark:bg-gray-900 rounded-[2.25rem] border border-gray-100 dark:border-gray-800/50 shadow-sm hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] transition-all duration-500 flex flex-col overflow-hidden h-full"
                >
                  <div className="p-8 flex-1 space-y-6">
                     <div className="flex justify-between items-start">
                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${getStatusColor(opp.status)}`}>
                           {opp.status}
                        </span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                           <button onClick={() => handleEdit(opp)} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-gray-400 hover:text-amber-500 transition-all"><FiEdit3 size={16} /></button>
                           {canDelete && <button onClick={() => handleDelete(opp.id)} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-gray-400 hover:text-rose-500 transition-all"><FiTrash2 size={16} /></button>}
                        </div>
                     </div>

                     <div className="space-y-1">
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-tight group-hover:text-amber-500 transition-colors">
                           {opp.opportunity_title}
                        </h3>
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 flex items-center justify-center overflow-hidden relative flex-shrink-0">
                               {getPartnerLogo(opp.company_name) ? (
                                 <img 
                                   src={getPartnerLogo(opp.company_name)!} 
                                   alt={opp.company_name} 
                                   className="w-full h-full object-contain p-1.5"
                                 />
                               ) : (
                                 <FiBriefcase className="text-amber-500" />
                               )}
                            </div>
                            <span className="text-xs font-bold text-gray-400">
                               {opp.company_name}
                            </span>
                         </div>
                     </div>

                     <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#1A2129] border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col justify-center">
                           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Valuation</p>
                           <p className="text-base md:text-lg font-black text-amber-500 break-words leading-tight">{opp.estimated_deal_size || "N/A"}</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#1A2129] border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col justify-center">
                           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Stage</p>
                           <p className="text-base md:text-lg font-black text-indigo-400 break-words leading-tight">{opp.deal_stage}</p>
                        </div>
                     </div>

                     <div className="space-y-4 pt-2">
                        <div className="flex items-center gap-3 text-sm font-bold text-gray-600 dark:text-gray-300">
                           <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500"><FiUser /></div>
                           <div>
                              <p className="text-[10px] text-gray-400 uppercase tracking-widest">Stakeholder</p>
                              <p>{opp.customer_name}</p>
                           </div>
                        </div>
                        {opp.opportunity_description && (
                           <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 italic text-xs font-medium text-slate-500 dark:text-slate-400">
                              \"{opp.opportunity_description}\"
                           </div>
                        )}
                     </div>
                  </div>

                  <div className="px-8 py-5 bg-gray-50 dark:bg-[#1A2129] border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
                     <div className="flex items-center gap-2">
                        <FiCalendar className="text-amber-500" /> Closing: {opp.expected_closing_date ? new Date(opp.expected_closing_date).toLocaleDateString() : "TBD"}
                     </div>
                     <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                        {opp.responsible_person || "Unassigned"}
                     </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

      </div>

      {/* Modern Form Overlay */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={resetForm}
              className="absolute inset-0 bg-gray-950/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.6)] border border-white/10 overflow-hidden"
            >
              <div className="p-10 md:p-14 space-y-10 overflow-y-auto max-h-[85vh] custom-scrollbar">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-amber-500 font-black tracking-widest text-[10px] uppercase">Transaction Engine</span>
                    <h2 className="text-4xl font-black text-gray-900 dark:text-white leading-none">
                      {editingId ? "Update" : "Initiate"} Prospect
                    </h2>
                  </div>
                  <button onClick={resetForm} className="p-4 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all text-gray-400"><FiXCircle size={32} /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {[
                        { label: "Full Identity", name: "customer_name", placeholder: "Individual Name" },
                        { label: "Entity/Company", name: "company_name", placeholder: "Legal Entity" },
                        { label: "Primary Contact", name: "contact_person", placeholder: "Contact Name" },
                        { label: "Prospect Title", name: "opportunity_title", placeholder: "e.g. Q4 Expansion" },
                        { label: "Deal Valuation", name: "estimated_deal_size", placeholder: "e.g. $50,000" },
                        { label: "Lead Manager", name: "responsible_person", placeholder: "Owner Name" },
                     ].map((field, i) => (
                        <div key={i} className="space-y-2 relative">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">{field.label}</label>
                           <input
                              name={field.name}
                              required={field.name !== "contact_person"}
                              placeholder={field.placeholder}
                              value={(formData as any)[field.name]}
                              onChange={handleInputChange}
                              onFocus={() => field.name === "company_name" && setShowSuggestions(true)}
                              onBlur={() => field.name === "company_name" && setTimeout(() => setShowSuggestions(false), 200)}
                              className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none transition-all font-bold dark:text-white"
                           />
                           {field.name === "company_name" && showSuggestions && filteredPartners.length > 0 && (
                             <div className="absolute z-[60] left-0 right-0 top-full mt-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 max-h-60 overflow-y-auto">
                               {filteredPartners.map((partner, idx) => (
                                 <button
                                   key={idx}
                                   type="button"
                                   onClick={() => {
                                     setFormData(prev => ({ ...prev, company_name: partner.name }));
                                     setShowSuggestions(false);
                                   }}
                                   className="w-full text-left px-6 py-4 hover:bg-amber-500/10 hover:text-amber-500 transition-colors flex items-center gap-3 border-b border-gray-50 dark:border-gray-700 last:border-0"
                                 >
                                   <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-900 flex items-center justify-center overflow-hidden flex-shrink-0">
                                     {partner.logo_key ? (
                                       <img 
                                         src={`${process.env.NEXT_PUBLIC_AWS_S3_URL || `https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || 'londonbridgeprojt'}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-1'}.amazonaws.com`}/${partner.logo_key}`} 
                                         alt="" 
                                         className="w-full h-full object-contain p-1"
                                       />
                                     ) : (
                                       <FiBriefcase className="text-amber-500 text-xs" />
                                     )}
                                   </div>
                                   <span className="font-bold text-sm truncate text-gray-700 dark:text-gray-200">{partner.name}</span>
                                 </button>
                               ))}
                             </div>
                           )}
                        </div>
                     ))}
                     
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Pipeline Phase</label>
                        <select
                          name="deal_stage"
                          value={formData.deal_stage}
                          onChange={handleInputChange}
                          className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none transition-all font-black text-sm dark:text-white"
                        >
                          <option>Prospect</option>
                          <option>Qualified</option>
                          <option>Proposal</option>
                          <option>Negotiation</option>
                        </select>
                     </div>

                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Target Close</label>
                        <input
                           type="date"
                           name="expected_closing_date"
                           value={formData.expected_closing_date}
                           onChange={handleInputChange}
                           className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none transition-all font-bold dark:text-white"
                        />
                     </div>

                     <div className="md:col-span-2 space-y-4">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2 text-center block">Execution Status</label>
                        <div className="flex gap-4">
                           {["Active", "Won", "Lost"].map((s) => (
                             <button
                               key={s}
                               type="button"
                               onClick={() => setFormData((p) => ({ ...p, status: s as any }))}
                               className={`flex-1 py-4 rounded-2xl border-2 font-black tracking-widest text-[10px] uppercase transition-all ${formData.status === s ? "border-amber-500 bg-amber-500/10 text-amber-500 shadow-xl" : "border-gray-100 dark:border-gray-800 text-gray-400 dark:text-gray-600"}`}
                             >
                               {s}
                             </button>
                           ))}
                        </div>
                     </div>

                     <div className="md:col-span-2 space-y-2 relative">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Engagement Intelligence</label>
                        <textarea
                          name="opportunity_description"
                          rows={3}
                          placeholder="Strategic notes and mission-critical details... (Use @ to mention, # for topics)"
                          value={formData.opportunity_description}
                          onChange={handleDescriptionChange}
                          className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-3xl focus:ring-2 focus:ring-amber-500 outline-none transition-all font-bold dark:text-white resize-none"
                        />
                        
                        {tagging && (
                          <div className="absolute z-[70] bottom-full left-0 mb-2 w-64 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 max-h-48 overflow-y-auto">
                            {tagging.type === '@' ? (
                              users.filter(u => u.full_name?.toLowerCase().includes(tagging.query.toLowerCase())).length > 0 ? (
                                users.filter(u => u.full_name?.toLowerCase().includes(tagging.query.toLowerCase())).map((u) => (
                                  <button
                                    key={u.id}
                                    type="button"
                                    onClick={() => handleSelectTag(u.full_name.replace(/\s+/g, ''))}
                                    className="w-full text-left px-4 py-3 hover:bg-amber-500/10 hover:text-amber-500 transition-colors flex items-center gap-2 border-b border-gray-50 dark:border-gray-800 last:border-0"
                                  >
                                    <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px] font-bold">
                                      {u.full_name?.[0]}
                                    </div>
                                    <span className="text-sm font-bold truncate dark:text-gray-200">{u.full_name}</span>
                                  </button>
                                ))
                              ) : (
                                <div className="p-4 text-xs text-gray-500 text-center font-bold">No users found</div>
                              )
                            ) : (
                              commonHashtags.filter(h => h.toLowerCase().includes(tagging.query.toLowerCase())).length > 0 ? (
                                commonHashtags.filter(h => h.toLowerCase().includes(tagging.query.toLowerCase())).map((h) => (
                                  <button
                                    key={h}
                                    type="button"
                                    onClick={() => handleSelectTag(h)}
                                    className="w-full text-left px-4 py-3 hover:bg-indigo-500/10 hover:text-indigo-500 transition-colors flex items-center gap-2 border-b border-gray-50 dark:border-gray-800 last:border-0"
                                  >
                                    <span className="text-indigo-500 font-black">#</span>
                                    <span className="text-sm font-bold truncate dark:text-gray-200">{h}</span>
                                  </button>
                                ))
                              ) : (
                                <div className="p-4 text-xs text-gray-500 text-center font-bold">No topics found</div>
                              )
                            )}
                          </div>
                        )}
                     </div>
                  </div>

                  <div className="pt-8 flex gap-4">
                    <button type="submit" disabled={submitting} className="flex-1 py-6 bg-amber-500 hover:bg-amber-600 text-black font-black rounded-2xl shadow-xl transition-all disabled:opacity-50 uppercase tracking-widest text-xs">
                      {submitting ? "Processing..." : editingId ? "Finalize Update" : "Establish Prospect"}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminContainer>
  );
}
