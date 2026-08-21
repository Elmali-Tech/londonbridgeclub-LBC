"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Cookies from "js-cookie";
import { useAuth } from "@/context/AuthContext";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  CircleDollarSign,
  Handshake,
  Network,
  TrendingUp,
  Users,
} from "lucide-react";
import { getAssetPublicUrl } from "@/lib/storage";

type DashboardMetrics = {
  totalMembers: number;
  totalCompanies: number;
  totalPartners: number;
  activeOpportunities: number;
  opportunityVolume: number;
  monthlyOpportunityVolume: number;
  commissionForecast: number;
  referralsCount: number;
  monthlyMembers: number;
  monthlyPartners: number;
  monthlyOpportunities: number;
  commissionPartners: number;
};

type DealFlowMetric = {
  key: string;
  label: string;
  count: number;
  volume: number;
};

type ReferrerMetric = {
  name: string;
  count: number;
  volume: number;
};

type MemberTags = {
  job_title?: string[];
  goals?: string[];
  interests?: string[];
};

type SuggestedMember = {
  id: number;
  full_name: string;
  headline?: string;
  profile_image_key?: string;
  location?: string;
  industry?: string;
  status?: "personal" | "corporate";
  tags?: MemberTags;
  membership_plan?: {
    name?: string;
    slug?: string;
  } | null;
};

type ScoredMatch = SuggestedMember & {
  score: number;
  reasons: string[];
};

const emptyMetrics: DashboardMetrics = {
  totalMembers: 0,
  totalCompanies: 0,
  totalPartners: 0,
  activeOpportunities: 0,
  opportunityVolume: 0,
  monthlyOpportunityVolume: 0,
  commissionForecast: 0,
  referralsCount: 0,
  monthlyMembers: 0,
  monthlyPartners: 0,
  monthlyOpportunities: 0,
  commissionPartners: 0,
};

const formatCompactNumber = (value: number) =>
  new Intl.NumberFormat("en-GB", {
    notation: value >= 10000 ? "compact" : "standard",
    maximumFractionDigits: value >= 10000 ? 1 : 0,
  }).format(value);

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    notation: value >= 1000000 ? "compact" : "standard",
    maximumFractionDigits: value >= 1000000 ? 1 : 0,
  }).format(value || 0);

const normalizeWords = (values: Array<string | undefined | null>) =>
  values
    .flatMap((value) => (value || "").toLowerCase().split(/[^a-z0-9]+/))
    .filter((value) => value.length > 2);

const scoreMember = (
  member: SuggestedMember,
  currentUserIndustry?: string,
  currentUserStatus?: string,
): ScoredMatch => {
  const reasons: string[] = [];
  let score = 64;

  if (member.industry && currentUserIndustry) {
    const memberIndustryWords = normalizeWords([member.industry]);
    const currentIndustryWords = normalizeWords([currentUserIndustry]);
    if (memberIndustryWords.some((word) => currentIndustryWords.includes(word))) {
      score += 14;
      reasons.push("Shared sector");
    }
  }

  if (member.status && currentUserStatus && member.status !== currentUserStatus) {
    score += 7;
    reasons.push("Member type bridge");
  }

  const searchableWords = normalizeWords([
    member.headline,
    member.industry,
    ...(member.tags?.goals || []),
    ...(member.tags?.interests || []),
  ]);

  const businessSignals = [
    "invest",
    "investment",
    "growth",
    "trade",
    "digital",
    "technology",
    "energy",
    "real",
    "estate",
    "finance",
    "procurement",
    "supplier",
    "uk",
    "turkey",
  ];
  const signalCount = businessSignals.filter((signal) =>
    searchableWords.some((word) => word.includes(signal)),
  ).length;

  if (signalCount > 0) {
    score += Math.min(12, signalCount * 3);
    reasons.push("Deal-flow keywords");
  }

  if (member.membership_plan?.name) {
    score += 5;
    reasons.push(`${member.membership_plan.name} member`);
  }

  if (reasons.length === 0) {
    reasons.push(member.industry || "Network fit");
  }

  return {
    ...member,
    score: Math.min(96, score),
    reasons: reasons.slice(0, 3),
  };
};

const getToken = () => localStorage.getItem("authToken") || Cookies.get("authToken");

export default function BusinessPulse() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics>(emptyMetrics);
  const [dealFlow, setDealFlow] = useState<DealFlowMetric[]>([]);
  const [topReferrers, setTopReferrers] = useState<ReferrerMetric[]>([]);
  const [members, setMembers] = useState<SuggestedMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPulse = async () => {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const [metricsResponse, membersResponse] = await Promise.all([
          fetch("/api/dashboard/metrics", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/suggested-users?all=true", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const metricsPayload = await metricsResponse.json();
        if (metricsPayload.success) {
          setMetrics(metricsPayload.metrics || emptyMetrics);
          setDealFlow(metricsPayload.dealFlow || []);
          setTopReferrers(metricsPayload.topReferrers || []);
        }

        const membersPayload = await membersResponse.json();
        if (membersPayload.success) {
          setMembers(Array.isArray(membersPayload.users) ? membersPayload.users : []);
        }
      } catch (error) {
        console.error("Failed to load business pulse", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPulse();
  }, []);

  const scoredMatches = useMemo(
    () =>
      members
        .map((member) => scoreMember(member, user?.industry, user?.status))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3),
    [members, user?.industry, user?.status],
  );

  const statCards = [
    {
      label: "Members",
      value: formatCompactNumber(metrics.totalMembers),
      detail: `+${metrics.monthlyMembers} this month`,
      icon: Users,
      className: "border-gray-200 bg-white",
    },
    {
      label: "Companies",
      value: formatCompactNumber(metrics.totalCompanies),
      detail: `${metrics.totalPartners} partners`,
      icon: Building2,
      className: "border-cyan-100 bg-cyan-50/70",
    },
    {
      label: "Active Opportunities",
      value: formatCompactNumber(metrics.activeOpportunities),
      detail: `+${metrics.monthlyOpportunities} this month`,
      icon: BriefcaseBusiness,
      className: "border-amber-100 bg-amber-50/80",
    },
    {
      label: "Opportunity Volume",
      value: formatCurrency(metrics.opportunityVolume),
      detail: `${formatCurrency(metrics.monthlyOpportunityVolume)} this month`,
      icon: CircleDollarSign,
      className: "border-emerald-100 bg-emerald-50/80",
    },
  ];

  return (
    <section className="space-y-4">
      <div className="rounded-sm border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-amber-600">
              <TrendingUp className="h-4 w-4" />
              Business Pulse
            </div>
            <h1 className="text-2xl font-black text-gray-950">
              UK-Turkiye deal network
            </h1>
            <p className="mt-1 max-w-2xl text-sm font-medium text-gray-600">
              Live membership, partner, referral and opportunity movement.
            </p>
          </div>
          <Link
            href="/dashboard/opportunities"
            className="inline-flex items-center justify-center gap-2 rounded-sm bg-gray-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-gray-800"
          >
            Deal Flow
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map(({ label, value, detail, icon: Icon, className }) => (
            <div
              key={label}
              className={`rounded-sm border p-4 ${className}`}
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-gray-500">
                  {label}
                </span>
                <Icon className="h-5 w-5 text-gray-700" />
              </div>
              <div className="text-2xl font-black text-gray-950">
                {loading ? "..." : value}
              </div>
              <div className="mt-1 text-xs font-bold text-gray-500">{detail}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-sm border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black uppercase tracking-[0.16em] text-gray-950">
                Deal Flow
              </h2>
              <p className="mt-1 text-xs font-bold text-gray-500">
                Pipeline value and stage movement
              </p>
            </div>
            <div className="rounded-sm bg-gray-100 px-3 py-1.5 text-xs font-black text-gray-700">
              Forecast {formatCurrency(metrics.commissionForecast)}
            </div>
          </div>
          <div className="space-y-3">
            {dealFlow.map((stage) => {
              const maxVolume = Math.max(...dealFlow.map((item) => item.volume), 1);
              const width = Math.max(8, Math.round((stage.volume / maxVolume) * 100));

              return (
                <div key={stage.key}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                    <span className="font-black text-gray-700">{stage.label}</span>
                    <span className="font-bold text-gray-500">
                      {stage.count} deals · {formatCurrency(stage.volume)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-sm bg-gray-100">
                    <div
                      className="h-full rounded-sm bg-gray-950"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-sm border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black uppercase tracking-[0.16em] text-gray-950">
                Referral Engine
              </h2>
              <p className="mt-1 text-xs font-bold text-gray-500">
                {metrics.referralsCount} tracked referral records
              </p>
            </div>
            <Handshake className="h-5 w-5 text-amber-600" />
          </div>

          {topReferrers.length === 0 ? (
            <div className="rounded-sm border border-dashed border-gray-200 p-5 text-center text-sm font-bold text-gray-400">
              No referral records yet
            </div>
          ) : (
            <div className="space-y-3">
              {topReferrers.map((referrer, index) => (
                <div
                  key={referrer.name}
                  className="flex items-center justify-between gap-3 rounded-sm bg-gray-50 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-black text-gray-900">
                      {index + 1}. {referrer.name}
                    </div>
                    <div className="text-xs font-bold text-gray-500">
                      {referrer.count} referrals
                    </div>
                  </div>
                  <div className="text-right text-sm font-black text-gray-900">
                    {formatCurrency(referrer.volume)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-sm border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.16em] text-gray-950">
              Matchmaking Engine
            </h2>
            <p className="mt-1 text-xs font-bold text-gray-500">
              Recommended introductions from member signals
            </p>
          </div>
          <Network className="h-5 w-5 text-cyan-700" />
        </div>

        {scoredMatches.length === 0 ? (
          <div className="rounded-sm border border-dashed border-gray-200 p-5 text-center text-sm font-bold text-gray-400">
            Matches will appear as member profiles become richer
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {scoredMatches.map((match) => (
              <Link
                key={match.id}
                href={`/dashboard/users/${match.id}`}
                className="rounded-sm border border-gray-200 p-4 transition hover:border-cyan-300 hover:bg-cyan-50/40"
              >
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-gray-100">
                    {match.profile_image_key ? (
                      <img
                        src={getAssetPublicUrl(match.profile_image_key)}
                        alt={match.full_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-black text-gray-600">
                        {match.full_name
                          .split(" ")
                          .map((name) => name[0])
                          .join("")}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-black text-gray-950">
                      {match.full_name}
                    </div>
                    <div className="truncate text-xs font-bold text-gray-500">
                      {match.industry || match.headline || "LBC member"}
                    </div>
                  </div>
                  <div className="ml-auto rounded-sm bg-gray-950 px-2 py-1 text-xs font-black text-white">
                    {match.score}%
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {match.reasons.map((reason) => (
                    <span
                      key={reason}
                      className="rounded-sm bg-gray-100 px-2 py-1 text-[11px] font-bold text-gray-600"
                    >
                      {reason}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
