export type UserRole =
  | "admin"
  | "opportunity_manager"
  | "sales_member"
  | "viewer";

export interface User {
  id: number;
  email: string;
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
  /** Capability layered on top of `role` — gates review-workflow approve/revision/archive actions. Admins always have it. */
  can_publish?: boolean;
}

/** Shared audit-field convention every operational table follows. */
export interface AuditFields {
  created_by?: number | null;
  created_at: string;
  updated_at: string;
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

export interface Opportunity {
  id: number;
  title: string;
  company: string;
  service_detail: string;
  category: string;
  estimated_budget: string;
  description?: string;
  image_key?: string | null;
  is_active: boolean;
  customer_opportunity_id?: number | null;
  created_at: string;
}

export interface OpportunityInterest {
  id: number;
  user_id: number;
  opportunity_id: number;
  customer_opportunity_id?: number | null;
  status: "new" | "contacted" | "converted" | "dismissed";
  notes?: string | null;
  followed_up_at?: string | null;
  created_at: string;
}

export type WorkflowStatus = "draft" | "pending_review" | "revision_requested" | "published" | "archived";

export type PartnerCategory =
  | "Loyalty"
  | "Meal Cards"
  | "Fuel"
  | "Travel"
  | "Insurance"
  | "Technology"
  | "Artificial Intelligence"
  | "Digital Marketing"
  | "PR"
  | "Media"
  | "Electricity"
  | "Logistics"
  | "Finance"
  | "Healthcare";

export interface Partner {
  id: number;
  name: string;
  description: string;
  logo_key?: string;
  website_url?: string;
  category?: PartnerCategory | null;
  subcategory?: string | null;
  responsible_person?: number | null;
  status: WorkflowStatus;
  submitted_by?: number | null;
  submitted_at?: string | null;
  reviewed_by?: number | null;
  reviewed_at?: string | null;
  revision_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export type BenefitStatus = WorkflowStatus;

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
  status: BenefitStatus;
  submitted_by?: number | null;
  submitted_at?: string | null;
  reviewed_by?: number | null;
  reviewed_at?: string | null;
  revision_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: number;
  company_name: string;
  industry?: string | null;
  website_url?: string | null;
  address?: string | null;
  solutions_used?: string | null;
  responsible_person?: number | null;
  partner_id?: number | null;
  created_by?: number | null;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: number;
  name: string;
  description?: string | null;
  partner_id: number;
  customer_id: number;
  status: string;
  created_by?: number | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerContact {
  id: number;
  customer_id: number;
  full_name: string;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  is_primary: boolean;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerNote {
  id: number;
  customer_id: number;
  note: string;
  logged_by?: number | null;
  created_at: string;
}

export type MeetingType = "In-Person" | "Call" | "Video Call";

export interface Meeting {
  id: number;
  customer_id: number;
  contact_id?: number | null;
  customer_opportunity_id?: number | null;
  title: string;
  meeting_date: string;
  meeting_time?: string | null;
  meeting_type: MeetingType;
  attendees?: string | null;
  notes?: string | null;
  created_by?: number | null;
  created_at: string;
  updated_at: string;
}

export interface MeetingNote {
  id: number;
  meeting_id: number;
  note: string;
  logged_by?: number | null;
  created_at: string;
}

export type ProposalStatus = "Draft" | "Sent" | "Accepted" | "Rejected" | "Expired";

export interface Proposal {
  id: number;
  customer_id: number;
  customer_opportunity_id?: number | null;
  title: string;
  description?: string | null;
  amount?: string | null;
  status: ProposalStatus;
  sent_date?: string | null;
  document_key?: string | null;
  responsible_person?: number | null;
  // Internal review gate, separate from the customer-facing `status` above — a proposal
  // must be reviewed (published) before it makes sense to mark it Sent.
  review_status: WorkflowStatus;
  submitted_by?: number | null;
  submitted_at?: string | null;
  reviewed_by?: number | null;
  reviewed_at?: string | null;
  revision_notes?: string | null;
  created_by?: number | null;
  created_at: string;
  updated_at: string;
}

export interface Reminder {
  id: number;
  title: string;
  due_date: string;
  customer_id?: number | null;
  meeting_id?: number | null;
  customer_opportunity_id?: number | null;
  assigned_to?: number | null;
  is_completed: boolean;
  completed_at?: string | null;
  notes?: string | null;
  created_by?: number | null;
  created_at: string;
  updated_at: string;
}

export type ProjectStatus = "Planning" | "Active" | "On Hold" | "Completed" | "Cancelled";

export interface Project {
  id: number;
  customer_id: number;
  customer_opportunity_id?: number | null;
  name: string;
  description?: string | null;
  owner_id?: number | null;
  status: ProjectStatus;
  progress_percentage: number;
  start_date?: string | null;
  end_date?: string | null;
  revenue?: number | null;
  commission_rate_id?: number | null;
  custom_commission_rate?: number | null;
  effective_rate?: number | null;
  commission_amount?: number | null;
  risks?: string | null;
  created_by?: number | null;
  created_at: string;
  updated_at: string;
}

export interface CommissionRate {
  id: number;
  name: string;
  percentage: number;
  is_active: boolean;
  created_by?: number | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectCommissionShare {
  id: number;
  project_id: number;
  user_id: number;
  share_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectTeamMember {
  id: number;
  project_id: number;
  user_id: number;
  added_at: string;
}

export type TaskPriority = "Low" | "Medium" | "High" | "Urgent";
export type TaskStatus = "To Do" | "In Progress" | "Done";
export type TaskRecurrence = "Daily" | "Weekly" | "Monthly";

export interface Task {
  id: number;
  title: string;
  description?: string | null;
  project_id?: number | null;
  customer_id?: number | null;
  customer_opportunity_id?: number | null;
  assigned_to?: number | null;
  due_date?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  recurrence?: TaskRecurrence | null;
  created_by?: number | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectKpi {
  id: number;
  project_id: number;
  name: string;
  target?: string | null;
  actual?: string | null;
  unit?: string | null;
  created_by?: number | null;
  created_at: string;
  updated_at: string;
}

export type RsvpStatus = 'attending' | 'maybe' | 'declined';

export interface EventRsvp {
  id: number;
  event_id: number;
  user_id: number;
  status: RsvpStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  users?: { full_name: string; email: string };
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
  opportunities: Opportunity[];
  opportunity_interests: OpportunityInterest[];
}
