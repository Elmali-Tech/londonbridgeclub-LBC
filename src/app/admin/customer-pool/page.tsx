"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { lbcData } from "@/lib/lbc-data";
import type { Customer, CustomerOpportunity, DealValuationPeriod } from "@/types/database";
import {
  DEFAULT_CURRENCY,
  formatCommissionRate,
  resolveCommissionFields,
} from "@/lib/commission";
import { formatGBPAmount, getOpportunityValueInGBP } from "@/lib/currency";
import { motion, AnimatePresence } from "framer-motion";
import AdminContainer from "@/app/components/admin/AdminContainer";
import { getAssetPublicUrl } from "@/lib/storage";
import {
  FiPlus,
  FiSearch,
  FiFilter,
  FiUser,
  FiBriefcase,
  FiEdit3,
  FiTrash2,
  FiCheckCircle,
  FiXCircle,
  FiCalendar,
  FiActivity,
  FiLayers,
  FiArrowUpRight
} from "react-icons/fi";

const PIPELINE_STAGES = ["Lead", "Qualified", "Proposal", "Negotiation"];
const COMMON_HASHTAGS = [
  "urgent",
  "followup",
  "strategic",
  "high-value",
  "negotiation",
  "partnership",
  "expansion",
  "renewal",
];

const DEAL_VALUATION_PERIOD_OPTIONS: Array<{
  value: DealValuationPeriod;
  label: string;
}> = [
  { value: "one_time", label: "One-time" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "3 Monthly" },
  { value: "six_months", label: "6 Monthly" },
  { value: "annual", label: "12 Monthly" },
];

const getDealValuationPeriodLabel = (value?: string | null) =>
  DEAL_VALUATION_PERIOD_OPTIONS.find((option) => option.value === value)?.label ||
  "One-time";

const CRM_TEXT_FIELDS = [
  { label: "Full Identity", name: "customer_name", placeholder: "Individual Name" },
  { label: "Reference Contact", name: "contact_person", placeholder: "Reference Contact Name" },
  { label: "Opportunity Title", name: "opportunity_title", placeholder: "e.g. Q4 Expansion" },
  { label: "Deal Valuation", name: "estimated_deal_size", placeholder: "e.g. $50,000" },
] satisfies Array<{
  label: string;
  name: keyof Pick<
    CRMFormData,
    | "customer_name"
    | "contact_person"
    | "opportunity_title"
    | "estimated_deal_size"
  >;
  placeholder: string;
}>;

const normalizeStageLabel = (stage?: string | null) => {
  if (!stage || stage === "Prospect") return "Lead";
  if (stage === "Opportunity") return "Qualified";
  return stage;
};

type CRMFormData = {
  customer_id: string;
  partner_id: string;
  record_type: "lead" | "opportunity";
  customer_name: string;
  company_name: string;
  contact_person: string;
  opportunity_title: string;
  opportunity_description: string;
  estimated_deal_size: string;
  estimated_deal_value: string;
  deal_valuation_period: DealValuationPeriod;
  currency_code: string;
  referral_source: string;
  commission_rate: string;
  commission_rate_percent: string;
  lbc_commission: string;
  lbc_commission_amount: string;
  deal_stage: string;
  responsible_person: string;
  expected_closing_date: string;
  status: "Active" | "Won" | "Lost";
};

type PartnerOption = {
  id: number;
  name: string;
  logo_key: string | null;
  commission_rate_percent?: number | null;
};

type MentionUser = {
  id: number;
  full_name: string | null;
  email?: string | null;
  profile_image_key: string | null;
};

type CustomerOpportunityInterest = {
  id: number;
  customer_opportunity_id: number | null;
  status: string;
  created_at: string;
  user?: {
    id: number;
    full_name: string;
    email: string;
  } | null;
  opportunity?: {
    id: number;
    title: string;
  } | null;
};

export default function CustomerPoolPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [opportunities, setOpportunities] = useState<CustomerOpportunity[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState<MentionUser[]>([]);
  const [interests, setInterests] = useState<CustomerOpportunityInterest[]>([]);
  const [publishingId, setPublishingId] = useState<number | null>(null);
  const [tagging, setTagging] = useState<{ type: '@' | '#', query: string, position: number } | null>(null);

  // Form State
  const [formData, setFormData] = useState<CRMFormData>({
    customer_id: "",
    partner_id: "",
    record_type: "lead",
    customer_name: "",
    company_name: "",
    contact_person: "",
    opportunity_title: "",
    opportunity_description: "",
    estimated_deal_size: "",
    estimated_deal_value: "",
    deal_valuation_period: "one_time",
    currency_code: DEFAULT_CURRENCY,
    referral_source: "",
    commission_rate: "",
    commission_rate_percent: "",
    lbc_commission: "",
    lbc_commission_amount: "",
    deal_stage: "Lead",
    responsible_person: "",
    expected_closing_date: "",
    status: "Active" as "Active" | "Won" | "Lost",
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/admin");
      return;
    }
    fetchCustomers();
    fetchOpportunities();
    fetchInterests();
    fetchPartners();
    fetchUsers();
  }, [user, authLoading, router]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await lbcData
        .from('users')
        .select('id, full_name, email, profile_image_key')
        .order('full_name', { ascending: true });
      if (error) throw error;
      if (data) setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchPartners = async () => {
    try {
      const { data, error } = await lbcData
        .from('partners')
        .select('id, name, logo_key, commission_rate_percent');
      if (error) throw error;
      if (data) setPartners(data);
    } catch (error) {
      console.error('Error fetching partners:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("/api/customers", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setCustomers(data.customers || []);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
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
    } catch {
      toast.error("Failed to fetch opportunities");
    } finally {
      setLoading(false);
    }
  };

  const fetchInterests = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("/api/customer-opportunities/interests", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setInterests(data.interests || []);
      }
    } catch (error) {
      console.error("Error fetching opportunity interests:", error);
    }
  };

  const applyAutomaticCommission = (next: CRMFormData) => {
    const selectedPartner = partners.find(
      (partner) => partner.id.toString() === next.partner_id,
    );
    const financials = resolveCommissionFields({
      estimatedDealSize: next.estimated_deal_size,
      estimatedDealValue: next.estimated_deal_value,
      commissionRate: next.commission_rate,
      commissionRatePercent:
        next.commission_rate_percent ||
        selectedPartner?.commission_rate_percent,
      partnerCommissionRatePercent: selectedPartner?.commission_rate_percent,
      currencyCode: next.currency_code,
    });

    return {
      ...next,
      estimated_deal_value:
        financials.estimatedDealValue !== null
          ? financials.estimatedDealValue.toString()
          : "",
      commission_rate_percent:
        financials.commissionRatePercent !== null
          ? financials.commissionRatePercent.toString()
          : "",
      commission_rate: financials.commissionRateDisplay || "",
      lbc_commission_amount:
        financials.lbcCommissionAmount !== null
          ? financials.lbcCommissionAmount.toString()
          : "",
      lbc_commission: financials.lbcCommissionDisplay || "",
    };
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      let next: CRMFormData = { ...prev, [name]: value };

      if (name === "customer_id") {
        const selectedCustomer = customers.find(
          (customer) => customer.id.toString() === value,
        );
        if (selectedCustomer) {
          next = {
            ...next,
            customer_name: selectedCustomer.name || next.customer_name,
            company_name:
              selectedCustomer.company_name || next.company_name,
            contact_person:
              selectedCustomer.contact_person || next.contact_person,
            referral_source:
              selectedCustomer.reference_person || next.referral_source,
          };
        }
      }

      if (name === "partner_id") {
        const selectedPartner = partners.find(
          (partner) => partner.id.toString() === value,
        );
        if (selectedPartner) {
          next = {
            ...next,
            company_name: selectedPartner.name,
            commission_rate_percent:
              selectedPartner.commission_rate_percent?.toString() || "",
            commission_rate:
              selectedPartner.commission_rate_percent !== null &&
              selectedPartner.commission_rate_percent !== undefined
                ? formatCommissionRate(selectedPartner.commission_rate_percent)
                : "",
          };
        }
      }

      if (
        [
          "partner_id",
          "estimated_deal_size",
          "estimated_deal_value",
          "commission_rate",
          "commission_rate_percent",
          "currency_code",
        ].includes(name)
      ) {
        return applyAutomaticCommission(next);
      }

      return next;
    });
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

      const response = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          reference_person: formData.referral_source,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(
          editingId ? "Opportunity updated" : "Opportunity created",
        );
        fetchCustomers();
        fetchOpportunities();
        resetForm();
      } else {
        toast.error(data.error || "Action failed");
      }
    } catch {
      toast.error("Action failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublish = async (id: number) => {
    const token = localStorage.getItem("authToken");
    setPublishingId(id);
    try {
      const response = await fetch(`/api/customer-opportunities/${id}/publish`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        toast.success(
          data.mode === "updated"
            ? "Published opportunity updated"
            : "Published to member opportunities",
        );
        fetchOpportunities();
        fetchInterests();
      } else {
        toast.error(data.error || "Publish failed");
      }
    } catch {
      toast.error("Publish failed");
    } finally {
      setPublishingId(null);
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
        customer_id: opp.customer_id?.toString() || "",
        partner_id: opp.partner_id?.toString() || "",
        record_type: opp.record_type || "lead",
        customer_name: opp.customer_name,
        company_name: opp.company_name,
        contact_person: opp.contact_person || "",
        opportunity_title: opp.opportunity_title,
        opportunity_description: opp.opportunity_description || "",
        estimated_deal_size: opp.estimated_deal_size || "",
        estimated_deal_value: opp.estimated_deal_value?.toString() || "",
        deal_valuation_period: opp.deal_valuation_period || "one_time",
        currency_code: opp.currency_code || DEFAULT_CURRENCY,
        referral_source: opp.referral_source || "",
        commission_rate: opp.commission_rate || "",
        commission_rate_percent: opp.commission_rate_percent?.toString() || "",
        lbc_commission: opp.lbc_commission || "",
        lbc_commission_amount: opp.lbc_commission_amount?.toString() || "",
        deal_stage: normalizeStageLabel(opp.deal_stage),
        responsible_person: opp.responsible_person || "",
        expected_closing_date: formattedDate,
        status: opp.status,
      });
      setEditingId(opp.id);
      setShowForm(true);
    } catch {
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
    } catch {
      toast.error("Delete failed");
    }
  };

  const resetForm = () => {
    setFormData({
      customer_id: "",
      partner_id: "",
      record_type: "lead",
      customer_name: "",
      company_name: "",
      contact_person: "",
      opportunity_title: "",
      opportunity_description: "",
      estimated_deal_size: "",
      estimated_deal_value: "",
      deal_valuation_period: "one_time",
      currency_code: DEFAULT_CURRENCY,
      referral_source: "",
      commission_rate: "",
      commission_rate_percent: "",
      lbc_commission: "",
      lbc_commission_amount: "",
      deal_stage: "Lead",
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
        opp.opportunity_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        Boolean(opp.referral_source?.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus =
        statusFilter === "All" || opp.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [opportunities, searchTerm, statusFilter]);

  const interestsByCustomerOpportunityId = useMemo(() => {
    return interests.reduce<Record<number, CustomerOpportunityInterest[]>>(
      (groups, interest) => {
        if (!interest.customer_opportunity_id) return groups;
        const id = interest.customer_opportunity_id;
        groups[id] = groups[id] || [];
        groups[id].push(interest);
        return groups;
      },
      {},
    );
  }, [interests]);

  const matchingMentionUsers = useMemo(() => {
    if (!tagging || tagging.type !== "@") return [];
    const query = tagging.query.toLowerCase();
    return users.filter(
      (candidate): candidate is MentionUser & { full_name: string } =>
        Boolean(candidate.full_name?.toLowerCase().includes(query)),
    );
  }, [tagging, users]);

  const matchingHashtags = useMemo(() => {
    if (!tagging || tagging.type !== "#") return [];
    const query = tagging.query.toLowerCase();
    return COMMON_HASHTAGS.filter((hashtag) =>
      hashtag.toLowerCase().includes(query),
    );
  }, [tagging]);

  const leadManagerOptions = useMemo(
    () =>
      users
        .map((candidate) => ({
          id: candidate.id,
          label: candidate.full_name || candidate.email || `User #${candidate.id}`,
        }))
        .filter((candidate) => Boolean(candidate.label))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [users],
  );

  const getInterestedMembers = (id: number) =>
    interestsByCustomerOpportunityId[id] || [];

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
      return getAssetPublicUrl(partner.logo_key);
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
              CRM <span className="text-amber-500 italic">Pipeline</span>
            </h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium max-w-lg">
              Central source for strategic leads, deal stages and member-published opportunities.
            </p>
          </div>

          {canCreate && (
             <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-3 bg-amber-500 hover:bg-amber-600 text-black px-6 py-4 rounded-2xl font-black transition-all shadow-[0_15px_30px_-10px_rgba(245,158,11,0.3)] active:scale-95 text-xs uppercase tracking-widest"
              >
                <FiPlus className="text-xl" /> Create CRM Lead
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
                           <button
                             onClick={() => handlePublish(opp.id)}
                             disabled={publishingId === opp.id}
                             title="Publish to member opportunities"
                             className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-gray-400 hover:text-blue-500 transition-all disabled:opacity-50"
                           >
                             <FiArrowUpRight size={16} />
                           </button>
	                           <button onClick={() => handleEdit(opp)} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-gray-400 hover:text-amber-500 transition-all"><FiEdit3 size={16} /></button>
	                           {canDelete && <button onClick={() => handleDelete(opp.id)} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-gray-400 hover:text-rose-500 transition-all"><FiTrash2 size={16} /></button>}
	                        </div>
                     </div>

                     <div className="space-y-1">
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-tight group-hover:text-amber-500 transition-colors">
                           {opp.opportunity_title}
                        </h3>
                         <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 flex items-center justify-center overflow-hidden relative flex-shrink-0 shadow-sm">
                               {getPartnerLogo(opp.company_name) ? (
                                 <img 
                                   src={getPartnerLogo(opp.company_name)!} 
                                   alt={opp.company_name} 
                                   className="h-full w-full object-contain p-2.5"
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
                           <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
                             {getDealValuationPeriodLabel(opp.deal_valuation_period)}
                           </p>
                           <p className="mt-2 text-xs font-black text-gray-700 dark:text-gray-200">
                             {formatGBPAmount(getOpportunityValueInGBP(opp))}
                           </p>
                        </div>
                        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#1A2129] border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col justify-center">
                           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Stage</p>
	                           <p className="text-base md:text-lg font-black text-indigo-400 break-words leading-tight">{normalizeStageLabel(opp.deal_stage)}</p>
	                        </div>
                        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#1A2129] border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col justify-center">
                           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">LBC Commission</p>
                           <p className="text-base md:text-lg font-black text-emerald-500 break-words leading-tight">{opp.lbc_commission || "N/A"}</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#1A2129] border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col justify-center">
                           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Commission Rate</p>
                           <p className="text-base md:text-lg font-black text-sky-500 break-words leading-tight">{opp.commission_rate || "N/A"}</p>
                        </div>
	                     </div>

                     <div className="space-y-4 pt-2">
                        <div className="flex items-center gap-3 text-sm font-bold text-gray-600 dark:text-gray-300">
                           <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500"><FiUser /></div>
                           <div>
                              <p className="text-[10px] text-gray-400 uppercase tracking-widest">Full Identity</p>
                              <p>{opp.customer_name}</p>
                           </div>
                        </div>
                        {(opp.referral_source || opp.lbc_commission || opp.commission_rate) && (
                          <div className="flex items-start gap-3 text-sm font-bold text-gray-600 dark:text-gray-300">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-500">
                              <FiActivity />
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-400 uppercase tracking-widest">Reference</p>
                              <p>{opp.referral_source || "N/A"}</p>
                              <p className="mt-1 text-xs text-gray-400">
                                {opp.lbc_commission || "No commission"} {opp.commission_rate ? `· ${opp.commission_rate}` : ""}
                              </p>
                            </div>
                          </div>
                        )}
	                        {opp.opportunity_description && (
	                           <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 italic text-xs font-medium text-slate-500 dark:text-slate-400">
                              &ldquo;{opp.opportunity_description}&rdquo;
	                           </div>
	                        )}
                          {getInterestedMembers(opp.id).length > 0 && (
                            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-2xl border border-blue-100 dark:border-blue-900/40 text-xs font-bold text-blue-700 dark:text-blue-300">
                              <p className="text-[10px] uppercase tracking-widest text-blue-400 mb-2">
                                Member Interest
                              </p>
                              <div className="space-y-1">
                                {getInterestedMembers(opp.id)
                                  .slice(0, 3)
                                  .map((interest) => (
                                    <p key={interest.id} className="truncate">
                                      {interest.user?.full_name ||
                                        interest.user?.email ||
                                        `User #${interest.id}`}
                                    </p>
                                  ))}
                                {getInterestedMembers(opp.id).length > 3 && (
                                  <p className="text-blue-400">
                                    +{getInterestedMembers(opp.id).length - 3} more
                                  </p>
                                )}
                              </div>
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
                      {editingId ? "Update" : "Initiate"} CRM Lead
                    </h2>
                  </div>
                  <button onClick={resetForm} className="p-4 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all text-gray-400"><FiXCircle size={32} /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Customer Account</label>
                        <select
                          name="customer_id"
                          value={formData.customer_id}
                          onChange={handleInputChange}
                          className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none transition-all font-black text-sm dark:text-white"
                        >
                          <option value="">Create from form details</option>
                          {customers.map((customer) => (
                            <option key={customer.id} value={customer.id}>
                              #{customer.id} - {customer.name}{customer.company_name ? ` / ${customer.company_name}` : ""}
                            </option>
                          ))}
                        </select>
                     </div>

                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Business Partner</label>
                        <select
                          name="partner_id"
                          value={formData.partner_id}
                          onChange={handleInputChange}
                          className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none transition-all font-black text-sm dark:text-white"
                        >
                          <option value="">No partner link</option>
                          {partners.map((partner) => (
                            <option key={partner.id} value={partner.id}>
                              {partner.name}
                              {partner.commission_rate_percent
                                ? ` - ${formatCommissionRate(partner.commission_rate_percent)}`
                                : ""}
                            </option>
                          ))}
                        </select>
                     </div>

                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Record Type</label>
                        <select
                          name="record_type"
                          value={formData.record_type}
                          onChange={handleInputChange}
                          className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none transition-all font-black text-sm dark:text-white"
                        >
                          <option value="lead">Lead</option>
                          <option value="opportunity">Opportunity</option>
                        </select>
                     </div>

                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Currency</label>
                        <select
                          name="currency_code"
                          value={formData.currency_code}
                          onChange={handleInputChange}
                          className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none transition-all font-black text-sm dark:text-white"
                        >
                          <option value="GBP">GBP</option>
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                          <option value="TRY">TRY</option>
                        </select>
                     </div>

                     {CRM_TEXT_FIELDS.map((field, i) => (
                        <div key={i} className="space-y-2 relative">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">{field.label}</label>
                           <input
                              name={field.name}
                              required={field.name !== "contact_person"}
                              placeholder={field.placeholder}
                              value={formData[field.name]}
                              onChange={handleInputChange}
                              className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none transition-all font-bold dark:text-white"
                           />
                        </div>
                     ))}

                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Deal Valuation Period</label>
                        <select
                          name="deal_valuation_period"
                          value={formData.deal_valuation_period}
                          onChange={handleInputChange}
                          className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none transition-all font-black text-sm dark:text-white"
                        >
                          {DEAL_VALUATION_PERIOD_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                     </div>

                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Lead Manager</label>
                        <select
                          name="responsible_person"
                          required
                          value={formData.responsible_person}
                          onChange={handleInputChange}
                          className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none transition-all font-black text-sm dark:text-white"
                        >
                          <option value="">Select member</option>
                          {formData.responsible_person &&
                            !leadManagerOptions.some(
                              (option) => option.label === formData.responsible_person,
                            ) && (
                              <option value={formData.responsible_person}>
                                {formData.responsible_person}
                              </option>
                            )}
                          {leadManagerOptions.map((option) => (
                            <option key={option.id} value={option.label}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                     </div>

                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Reference Person</label>
                        <input
                           name="referral_source"
                           placeholder="Who referred this lead?"
                           value={formData.referral_source}
                           onChange={handleInputChange}
                           className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none transition-all font-bold dark:text-white"
                        />
                     </div>

                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">LBC Commission</label>
                        <input
                           name="lbc_commission"
                           placeholder="e.g. £5,000"
                           value={formData.lbc_commission}
                           onChange={handleInputChange}
                           readOnly
                           className="w-full px-6 py-4 bg-gray-100 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none transition-all font-bold dark:text-white"
                        />
                     </div>

                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Commission Rate</label>
                        <input
                           name="commission_rate"
                           placeholder="e.g. 10%"
                           value={formData.commission_rate}
                           onChange={handleInputChange}
                           readOnly={Boolean(formData.partner_id)}
                           className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none transition-all font-bold dark:text-white"
                        />
                     </div>
                     
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Pipeline Phase</label>
                        <select
                          name="deal_stage"
                          value={formData.deal_stage}
                          onChange={handleInputChange}
                          className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none transition-all font-black text-sm dark:text-white"
                        >
	                          {PIPELINE_STAGES.map((stage) => (
                              <option key={stage}>{stage}</option>
                            ))}
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
                           {(["Active", "Won", "Lost"] as const).map((s) => (
                             <button
                               key={s}
                               type="button"
                               onClick={() => setFormData((p) => ({ ...p, status: s }))}
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
	                              matchingMentionUsers.length > 0 ? (
	                                matchingMentionUsers.map((u) => (
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
	                              matchingHashtags.length > 0 ? (
	                                matchingHashtags.map((h) => (
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
                      {submitting ? "Processing..." : editingId ? "Finalize Update" : "Establish CRM Lead"}
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
