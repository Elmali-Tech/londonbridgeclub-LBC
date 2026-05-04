export type UserRole =
  | "admin"
  | "opportunity_manager"
  | "sales_member"
  | "viewer";

export interface User {
  id: number;
  email: string;
  password_hash: string;
  full_name: string;
  username?: string;
  headline?: string;
  bio?: string;
  profile_image_key?: string;
  banner_image_key?: string;
  location?: string;
  industry?: string;
  status: "personal" | "corporate";
  linkedin_url?: string;
  website_url?: string;
  date_of_birth?: string;
  created_at: string;
  updated_at: string;
  stripe_customer_id?: string;
  subscription_status?: string;
  is_approved: boolean;
  approved_at?: string;
  is_admin: boolean;
  role: UserRole;
  can_create_opportunities?: boolean;
}

// ── Membership Plan Types ────────────────────────────────────────

export type PlanCategory = 'individual' | 'corporate';
export type BillingCycle = 'monthly' | 'yearly';
export type PlanSlug = 'bronze' | 'silver' | 'gold' | 'platinum' | 'emerald' | 'diamond';

export interface PlanFeature {
  id: number;
  key: string;
  label: string;
  description?: string;
  value_type: 'boolean' | 'text';
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface PlanFeatureValue {
  id?: number;
  plan_id: number;
  feature_id: number;
  is_included: boolean;
  text_value?: string | null;
  plan_features?: PlanFeature;
}

export interface MembershipPlan {
  id: number;
  name: string;
  slug: PlanSlug;
  category: PlanCategory;
  description?: string;
  monthly_price: number;
  yearly_price: number;
  stripe_monthly_price_id?: string | null;
  stripe_yearly_price_id?: string | null;
  entry_fee_early: number;
  entry_fee_standard: number;
  is_active: boolean;
  highlighted: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  plan_feature_values?: PlanFeatureValue[];
}

export interface EntryFeeSettings {
  id: 1;
  is_active: boolean;
  threshold: number;
  updated_at: string;
}

// ── Subscription ─────────────────────────────────────────────────

export interface Subscription {
  id: number;
  user_id: number;
  plan_id?: number | null;
  billing_cycle?: BillingCycle | null;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  plan_type: string; // legacy — yeni kayıtlarda plan_id kullanılır
  status: "active" | "canceled" | "past_due" | "trialing" | "incomplete";
  current_period_end: string;
  entry_fee_paid?: number;
  created_at: string;
  updated_at: string;
  membership_plans?: MembershipPlan;
}

// ── Other Domain Types ────────────────────────────────────────────

export interface CustomerOpportunity {
  id: number;
  customer_name: string;
  company_name: string;
  contact_person?: string;
  opportunity_title: string;
  opportunity_description?: string;
  estimated_deal_size?: string;
  deal_stage?: string;
  responsible_person?: string;
  expected_closing_date?: string;
  status: "Active" | "Won" | "Lost";
  created_at: string;
  updated_at: string;
  created_by?: number;
  created_by_user?: {
    full_name: string;
    email: string;
  };
}

export interface Partner {
  id: number;
  name: string;
  description: string;
  logo_key?: string;
  website_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Benefit {
  id: number;
  title: string;
  description: string;
  image_key?: string;
  category: "discount" | "service" | "event" | "exclusive";
  partner_name?: string;
  partner_website?: string;
  discount_percentage?: number;
  discount_code?: string;
  valid_until?: string;
  terms_conditions?: string;
  is_active: boolean;
  premium?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: number;
  user_id: number;
  token: string;
  expires_at: string;
  created_at: string;
}

export interface Database {
  users: User[];
  sessions: Session[];
  subscriptions: Subscription[];
  membership_plans: MembershipPlan[];
  plan_features: PlanFeature[];
  plan_feature_values: PlanFeatureValue[];
  entry_fee_settings: EntryFeeSettings[];
  partners: Partner[];
  benefits: Benefit[];
  customer_opportunities: CustomerOpportunity[];
}
