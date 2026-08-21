"use client";
import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { getS3PublicUrl } from "@/lib/awsConfig";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import DashboardContainer from "@/app/components/dashboard/DashboardContainer";
import RichTextTokens from "@/app/components/RichTextTokens";
import { extractTextTokens } from "@/lib/textTokens";
import { lbcData } from "@/lib/lbc-data";
import Cookies from "js-cookie";
import { toast } from "react-hot-toast";
import { BriefcaseBusiness } from "lucide-react";
import {
  DEFAULT_CURRENCY,
  formatCommissionRate,
  resolveCommissionFields,
} from "@/lib/commission";
import { formatGBPAmount, getMoneyValueInGBP, getOpportunityValueInGBP } from "@/lib/currency";
import { CustomerOpportunity } from "@/types/database";

interface Opportunity {
  id: number | string;
  title: string;
  company: string;
  service_detail: string;
  category: string;
  estimated_budget: string;
  description: string | null;
  image_key: string | null;
  is_active: boolean;
  customer_opportunity_id?: number | null;
  created_at: string;
  source?: "lbc-api";
  can_record_interest?: boolean;
  lbc_project_no?: string | null;
  lbc_status?: string | null;
}

type CustomerOption = {
  id: number;
  name: string;
  company_name?: string | null;
  contact_person?: string | null;
  reference_person?: string | null;
};

type PartnerOption = {
  id: number;
  name: string;
  commission_rate_percent?: number | null;
};

type SubmissionForm = {
  customer_id: string;
  partner_id: string;
  record_type: "lead" | "opportunity";
  customer_name: string;
  company_name: string;
  contact_person: string;
  reference_person: string;
  opportunity_title: string;
  estimated_deal_size: string;
  estimated_deal_value: string;
  currency_code: string;
  commission_rate: string;
  commission_rate_percent: string;
  lbc_commission: string;
  lbc_commission_amount: string;
  opportunity_description: string;
};

export default function OpportunitiesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [dealFlowRecords, setDealFlowRecords] = useState<CustomerOpportunity[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);
  const [submissionForm, setSubmissionForm] = useState<SubmissionForm>({
    customer_id: "",
    partner_id: "",
    record_type: "lead",
    customer_name: "",
    company_name: "",
    contact_person: "",
    reference_person: "",
    opportunity_title: "",
    estimated_deal_size: "",
    estimated_deal_value: "",
    currency_code: DEFAULT_CURRENCY,
    commission_rate: "",
    commission_rate_percent: "",
    lbc_commission: "",
    lbc_commission_amount: "",
    opportunity_description: "",
  });

  useEffect(() => {
    fetchOpportunities();
    fetchLeadFormOptions();
    fetchDealFlow();
  }, []);

  const fetchOpportunities = async () => {
    try {
      const token = localStorage.getItem("authToken") || Cookies.get("authToken");
      const response = await fetch("/api/dashboard/opportunities", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = await response.json();
      if (data.success) {
        setOpportunities(Array.isArray(data.opportunities) ? data.opportunities : []);
      } else {
        setError("Failed to fetch opportunities");
      }
    } catch (err) {
      setError("An error occurred while fetching opportunities");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLeadFormOptions = async () => {
    try {
      const token = localStorage.getItem("authToken") || Cookies.get("authToken");
      const [customersResponse, partnersResponse] = await Promise.all([
        fetch("/api/customers", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        lbcData
          .from("partners")
          .select("id, name, commission_rate_percent")
          .order("name", { ascending: true }),
      ]);

      const customersPayload = await customersResponse.json();
      if (customersPayload.success) {
        setCustomers(customersPayload.customers || []);
      }

      if (!partnersResponse.error) {
        setPartners(partnersResponse.data || []);
      }
    } catch (err) {
      console.error("Failed to load lead form options", err);
    }
  };

  const fetchDealFlow = async () => {
    try {
      const token = localStorage.getItem("authToken") || Cookies.get("authToken");
      if (!token) return;

      const response = await fetch("/api/customer-opportunities", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setDealFlowRecords(Array.isArray(data.opportunities) ? data.opportunities : []);
      }
    } catch (err) {
      console.error("Failed to load deal flow", err);
    }
  };

  const parseMoney = (value?: string | number | null) => {
    return getMoneyValueInGBP(value);
  };

  const formatCurrency = (value: number) =>
    formatGBPAmount(value);

  const dealFlowSummary = useMemo(() => {
    const stages = [
      { key: "Lead", label: "Open Leads" },
      { key: "Qualified", label: "In Discussion" },
      { key: "Proposal", label: "Proposal Sent" },
      { key: "Negotiation", label: "Negotiation" },
      { key: "Won", label: "Won" },
    ];

    const getStage = (record: CustomerOpportunity) => {
      if (record.status === "Won") return "Won";
      if (record.deal_stage === "Negotiation") return "Negotiation";
      if (record.deal_stage === "Proposal") return "Proposal";
      if (record.deal_stage === "Qualified") return "Qualified";
      return "Lead";
    };

    return stages.map((stage) => {
      const records = dealFlowRecords.filter((record) => getStage(record) === stage.key);
      return {
        ...stage,
        count: records.length,
        volume: records.reduce(
          (total, record) => total + getOpportunityValueInGBP(record),
          0,
        ),
      };
    });
  }, [dealFlowRecords]);

  const dealFlowTotals = useMemo(
    () => ({
      referrals: dealFlowRecords.filter((record) => record.referral_source).length,
      commission: dealFlowRecords.reduce(
        (total, record) => total + parseMoney(record.lbc_commission_amount),
        0,
      ),
      active: dealFlowRecords.filter((record) => record.status === "Active").length,
    }),
    [dealFlowRecords],
  );

  const applyAutomaticCommission = (next: SubmissionForm) => {
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

  const handleSubmissionInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setSubmissionForm((prev) => {
      let next: SubmissionForm = { ...prev, [name]: value };

      if (name === "customer_id") {
        const selectedCustomer = customers.find(
          (customer) => customer.id.toString() === value,
        );
        if (selectedCustomer) {
          next = {
            ...next,
            customer_name: selectedCustomer.name,
            company_name: selectedCustomer.company_name || next.company_name,
            contact_person:
              selectedCustomer.contact_person || next.contact_person,
            reference_person:
              selectedCustomer.reference_person || next.reference_person,
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

  const resetSubmissionForm = () => {
    setSubmissionForm({
      customer_id: "",
      partner_id: "",
      record_type: "lead",
      customer_name: "",
      company_name: "",
      contact_person: "",
      reference_person: "",
      opportunity_title: "",
      estimated_deal_size: "",
      estimated_deal_value: "",
      currency_code: DEFAULT_CURRENCY,
      commission_rate: "",
      commission_rate_percent: "",
      lbc_commission: "",
      lbc_commission_amount: "",
      opportunity_description: "",
    });
    setShowSubmitForm(false);
  };

  const handleSubmitLead = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmittingLead(true);

    try {
      const token = localStorage.getItem("authToken") || Cookies.get("authToken");
      const response = await fetch("/api/customer-opportunities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...submissionForm,
          referral_source: submissionForm.reference_person,
          deal_stage:
            submissionForm.record_type === "opportunity" ? "Qualified" : "Lead",
          status: "Active",
        }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("Opportunity submitted successfully");
        resetSubmissionForm();
        fetchLeadFormOptions();
        fetchDealFlow();
      } else {
        toast.error(data.error || "Submission failed");
      }
    } catch {
      toast.error("Submission failed");
    } finally {
      setIsSubmittingLead(false);
    }
  };

  return (
    <DashboardContainer user={user} showRightSidebar={false}>
      <div className="max-w-5xl mx-auto py-8">
        <div className="bg-white rounded-sm border border-gray-200 shadow-lg p-6 mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h1 className="text-2xl font-bold">Opportunities</h1>
          <button
            type="button"
            onClick={() => setShowSubmitForm((value) => !value)}
            className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-amber-700"
          >
            Submit Lead
          </button>
        </div>
        {showSubmitForm && (
          <form
            onSubmit={handleSubmitLead}
            className="mb-8 grid grid-cols-1 gap-4 rounded-sm border border-gray-200 bg-white p-6 shadow-lg md:grid-cols-2"
          >
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Customer Account</label>
              <select
                name="customer_id"
                value={submissionForm.customer_id}
                onChange={handleSubmissionInputChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500"
              >
                <option value="">Create from details</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    #{customer.id} - {customer.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Business Partner</label>
              <select
                name="partner_id"
                value={submissionForm.partner_id}
                onChange={handleSubmissionInputChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500"
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
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Type</label>
              <select
                name="record_type"
                value={submissionForm.record_type}
                onChange={handleSubmissionInputChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500"
              >
                <option value="lead">Lead</option>
                <option value="opportunity">Opportunity</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Currency</label>
              <select
                name="currency_code"
                value={submissionForm.currency_code}
                onChange={handleSubmissionInputChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500"
              >
                <option value="GBP">GBP</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="TRY">TRY</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Customer Name</label>
              <input
                name="customer_name"
                value={submissionForm.customer_name}
                onChange={handleSubmissionInputChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Company</label>
              <input
                name="company_name"
                value={submissionForm.company_name}
                onChange={handleSubmissionInputChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Primary Contact</label>
              <input
                name="contact_person"
                value={submissionForm.contact_person}
                onChange={handleSubmissionInputChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Reference Person</label>
              <input
                name="reference_person"
                value={submissionForm.reference_person}
                onChange={handleSubmissionInputChange}
                placeholder="Who referred this customer?"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Opportunity Title</label>
              <input
                name="opportunity_title"
                value={submissionForm.opportunity_title}
                onChange={handleSubmissionInputChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Estimated Deal Size</label>
              <input
                name="estimated_deal_size"
                value={submissionForm.estimated_deal_size}
                onChange={handleSubmissionInputChange}
                placeholder="E.g. 50000"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">LBC Commission</label>
              <input
                name="lbc_commission"
                value={submissionForm.lbc_commission}
                readOnly
                className="w-full rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-sm outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-semibold text-gray-700">Description</label>
              <textarea
                name="opportunity_description"
                value={submissionForm.opportunity_description}
                onChange={handleSubmissionInputChange}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500"
              />
            </div>
            <div className="flex gap-3 md:col-span-2">
              <button
                type="submit"
                disabled={isSubmittingLead}
                className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-amber-700 disabled:opacity-60"
              >
                {isSubmittingLead ? "Submitting..." : "Submit"}
              </button>
              <button
                type="button"
                onClick={resetSubmissionForm}
                className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="mb-8 rounded-sm border border-gray-200 bg-white p-6 shadow-lg">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.16em] text-amber-600">
                Deal Flow
              </div>
              <h2 className="mt-1 text-xl font-black text-gray-950">
                Referral based opportunity pipeline
              </h2>
            </div>
            <div className="grid grid-cols-3 gap-2 text-right">
              <div className="rounded-sm bg-gray-50 px-3 py-2">
                <div className="text-[10px] font-black uppercase tracking-[0.12em] text-gray-400">
                  Active
                </div>
                <div className="text-sm font-black text-gray-950">
                  {dealFlowTotals.active}
                </div>
              </div>
              <div className="rounded-sm bg-gray-50 px-3 py-2">
                <div className="text-[10px] font-black uppercase tracking-[0.12em] text-gray-400">
                  Referrals
                </div>
                <div className="text-sm font-black text-gray-950">
                  {dealFlowTotals.referrals}
                </div>
              </div>
              <div className="rounded-sm bg-gray-50 px-3 py-2">
                <div className="text-[10px] font-black uppercase tracking-[0.12em] text-gray-400">
                  LBC Fee
                </div>
                <div className="text-sm font-black text-gray-950">
                  {formatCurrency(dealFlowTotals.commission)}
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            {dealFlowSummary.map((stage) => (
              <div
                key={stage.key}
                className="rounded-sm border border-gray-200 bg-gray-50 p-4"
              >
                <div className="text-xs font-black uppercase tracking-[0.12em] text-gray-500">
                  {stage.label}
                </div>
                <div className="mt-3 text-2xl font-black text-gray-950">
                  {stage.count}
                </div>
                <div className="mt-1 text-xs font-bold text-gray-500">
                  {formatCurrency(stage.volume)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-sm border border-gray-200 shadow-lg p-6">
          {isLoading ? (
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading opportunities...</p>
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <svg
                className="w-16 h-16 mx-auto text-red-400 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Error loading opportunities
              </h3>
              <p className="text-gray-600">{error}</p>
            </div>
          ) : opportunities.length === 0 ? (
            <div className="text-center py-20">
              <svg
                className="w-16 h-16 mx-auto text-gray-400 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No opportunities found
              </h3>
              <p className="text-gray-600">
                No active opportunities at the moment.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {opportunities.map((opp) => {
                const tokens = extractTextTokens(opp.description);

                return (
                <div
                  key={opp.id}
                  onClick={() =>
                    router.push(`/dashboard/opportunities/${opp.id}`)
                  }
                  className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 hover:border-amber-200 block cursor-pointer"
                  role="button"
                  tabIndex={0}
                >
                  <div className="relative h-48 w-full bg-gray-100 flex items-center justify-center p-4">
                    {opp.image_key ? (
                      <Image
                        src={getS3PublicUrl(opp.image_key)}
                        alt={opp.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-contain p-4"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gray-950 text-white">
                        <BriefcaseBusiness className="h-10 w-10 text-amber-400" />
                        <span className="text-xs font-black uppercase tracking-[0.16em] text-gray-300">
                          LBC Opportunity
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-white text-xl font-bold line-clamp-2">
                        {opp.title}
                      </h3>
                      <p className="text-gray-200 text-sm flex items-center mt-1">
                        {opp.company}
                      </p>
                    </div>
                  </div>
                  <div className="p-6">
                    <p className="text-gray-600 text-sm mb-2">
                      <span className="font-semibold">Service:</span>{" "}
                      {opp.service_detail}
                    </p>
                    <p className="text-gray-600 text-sm mb-2">
                      <span className="font-semibold">Category:</span>{" "}
                      {opp.category}
                    </p>
                    <p className="text-gray-600 text-sm mb-2">
                      <span className="font-semibold">Budget:</span>{" "}
                      {opp.estimated_budget}
                    </p>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                      <RichTextTokens text={opp.description} fallback="No description provided." />
                    </p>
                    {tokens.length > 0 && (
                      <div className="mb-4 flex flex-wrap gap-2">
                        {tokens.map((token) => (
                          <span
                            key={`${opp.id}-${token.type}-${token.value}`}
                            className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                              token.type === "mention"
                                ? "bg-blue-50 text-blue-600"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {token.value}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center text-gray-500 text-sm">
                      <svg
                        className="h-4 w-4 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      {new Date(opp.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardContainer>
  );
}
