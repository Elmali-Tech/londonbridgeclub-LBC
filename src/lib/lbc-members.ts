import { LbcMember } from "@/lib/lbc-api";

export type MemberStatus = "personal" | "corporate";

export type MemberTagGroups = {
  job_title: string[];
  goals: string[];
  interests: string[];
};

export type MemberPlanSummary = {
  name?: string | null;
  slug?: string | null;
} | null;

export type DashboardMember = {
  id: number | string;
  internal_user_id: number | null;
  full_name: string;
  email: string;
  headline?: string | null;
  profile_image_key?: string | null;
  created_at: string;
  status: MemberStatus;
  location?: string | null;
  industry?: string | null;
  subscription_status?: string | null;
  isFollowing?: boolean;
  tags?: MemberTagGroups;
  membership_plan?: MemberPlanSummary;
  source: "lbc-api";
  can_interact: boolean;
  is_lbc_only: boolean;
  lbc_record_id?: string | null;
  lbc_member_id?: string | null;
  lbc_type?: string | null;
  lbc_tier?: string | null;
  lbc_is_anchor?: boolean | null;
};

const KNOWN_PLAN_SLUGS = new Set([
  "bronze",
  "silver",
  "gold",
  "platinum",
  "emerald",
  "diamond",
]);

export function normalizeMemberEmail(email?: string | null) {
  return (email || "").trim().toLowerCase();
}

export function mapLbcTypeToStatus(type?: string | null): MemberStatus {
  const normalizedType = (type || "").toLocaleLowerCase("tr-TR");
  return normalizedType.includes("kurumsal") ||
    normalizedType.includes("corporate")
    ? "corporate"
    : "personal";
}

export function getLbcPlan(member: LbcMember): MemberPlanSummary {
  const rawTier = (
    member.active_subscription?.tier ||
    member.active_subscription?.plan ||
    member.tier ||
    ""
  ).trim();
  if (!rawTier) return null;

  const slug = rawTier.toLowerCase();
  return {
    name: rawTier,
    slug: KNOWN_PLAN_SLUGS.has(slug) ? slug : null,
  };
}

export function getLbcDisplayName(member: LbcMember) {
  const name = (member.name || "").trim();
  if (name) return name;

  const representativeName = (member.representative_name || "").trim();
  if (representativeName) return representativeName;

  const email = normalizeMemberEmail(member.email);
  if (email) {
    const localPart = email.split("@")[0]?.replace(/[._-]+/g, " ").trim();
    if (localPart) {
      return localPart.replace(/\b\w/g, (char) => char.toUpperCase());
    }
  }

  return member.member_id || "LBC Member";
}

export function getLbcCreatedAt(member: LbcMember) {
  return (
    member.membership_start ||
    member.created_at ||
    new Date(0).toISOString()
  );
}

function getLbcInterests(member: LbcMember) {
  if (Array.isArray(member.interests)) {
    return member.interests
      .map((interest) => interest.trim())
      .filter(Boolean)
      .slice(0, 4);
  }

  if (typeof member.interests === "string" && member.interests.trim()) {
    return member.interests
      .split(",")
      .map((interest) => interest.trim())
      .filter(Boolean)
      .slice(0, 4);
  }

  return member.sector ? [member.sector] : [];
}

export function mapLbcMemberToDashboardMember(
  member: LbcMember,
): DashboardMember {
  const plan = getLbcPlan(member);

  return {
    id: `lbc:${member.id}`,
    internal_user_id: null,
    full_name: getLbcDisplayName(member),
    email: normalizeMemberEmail(member.email),
    headline:
      member.title ||
      member.representative_name ||
      member.type ||
      "London Bridge Club Member",
    profile_image_key: null,
    created_at: getLbcCreatedAt(member),
    status: mapLbcTypeToStatus(member.type),
    location: "London, United Kingdom",
    industry: member.sector || member.category || null,
    subscription_status: plan ? "active" : null,
    isFollowing: false,
    tags: {
      job_title: member.title ? [member.title] : [],
      goals: [],
      interests: getLbcInterests(member),
    },
    membership_plan: plan,
    source: "lbc-api",
    can_interact: false,
    is_lbc_only: true,
    lbc_record_id: member.id,
    lbc_member_id: member.member_id || null,
    lbc_type: member.type || null,
    lbc_tier: member.tier || null,
    lbc_is_anchor: member.is_anchor ?? null,
  };
}
