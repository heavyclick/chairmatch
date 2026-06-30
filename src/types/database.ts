/**
 * Domain types mirroring supabase/migrations/0001_initial_schema.sql.
 *
 * These are hand-written for now. Once the schema stabilizes, generate
 * the authoritative version with:
 *   npx supabase gen types typescript --project-id <project-id> > src/types/database.ts
 * and migrate these domain types to wrap/derive from the generated Database type.
 */

export type AccountType = "owner" | "candidate";

export type EmploymentType = "full_time" | "part_time" | "temp";

export type PayUnit = "hourly" | "annual";

export type VisibilityStatus = "actively_looking" | "open" | "off_market";

export type SubscriptionTier = "free" | "standard" | "pro";

export type PracticeType = "solo" | "group" | "dso";

export type ScreeningStatus =
  | "invited"
  | "declined"
  | "in_progress"
  | "completed";

export interface Role {
  id: number;
  slug: string;
  label: string;
}

export interface RoleAlias {
  id: number;
  role_id: number;
  slug: string;
  label: string;
}

export interface DealbreakerTag {
  id: number;
  slug: string;
  label: string;
}

export interface SoftwareTag {
  id: number;
  slug: string;
  label: string;
}

export interface Profile {
  id: string;
  email: string;
  phone: string | null;
  account_type: AccountType;
  notification_sms_messages: boolean;
  notification_sms_invites: boolean;
  notification_sms_temp_jobs: boolean;
  notification_email_digest: boolean;
  created_at: string;
  last_active_at: string;
}

export interface WorkHistoryEntry {
  id: string;
  candidate_id: string;
  employer_name: string;
  role_title: string | null;
  start_date: string | null;
  end_date: string | null; // null = current role
  sort_order: number;
}

export interface AvailabilitySlot {
  candidate_id: string;
  day_of_week: number; // 0 = Sunday .. 6 = Saturday
  start_time: string | null;
  end_time: string | null;
}

export interface CandidateProfile {
  id: string;
  full_name: string;
  photo_url: string | null;
  primary_role_id: number;

  city: string | null;
  state: string | null;
  zip: string | null;
  employment_types: EmploymentType[];
  open_to_relocation: boolean;

  pay_range_min: number | null;
  pay_range_max: number | null;
  pay_unit: PayUnit | null;

  university: string | null;
  certifications: string[];
  ce_courses: string[];
  years_experience: number | null;

  value_add_text: string | null;
  future_goals_text: string | null;
  recovery_scenario_text: string | null;

  visibility_status: VisibilityStatus;
  profile_completeness_score: number;

  created_at: string;
  updated_at: string;

  // Joined/derived, not raw columns -- populated by the API layer
  role?: Role;
  alias_tags?: RoleAlias[];
  dealbreakers?: DealbreakerTag[];
  software?: SoftwareTag[];
  work_history?: WorkHistoryEntry[];
  availability?: AvailabilitySlot[];
}

/**
 * What an owner on the FREE tier receives from the API for a given
 * candidate. Note this is a *separate type*, not the same CandidateProfile
 * with fields blanked out client-side -- the blur/redaction must happen
 * server-side in the API response shaping. Never ship full_name or
 * photo_url to the client and rely on CSS blur alone; a free-tier owner
 * could read it from the network tab.
 */
export type BlurredCandidateProfile = Omit<
  CandidateProfile,
  "full_name" | "photo_url"
> & {
  full_name: null;
  photo_url: null;
  is_locked: true;
};

export interface PracticeProfile {
  id: string;
  practice_name: string;
  practice_type: PracticeType | null;

  culture_text: string | null;
  thrive_text: string | null;
  honest_challenges_text: string | null;

  subscription_tier: SubscriptionTier;
  subscription_renews_at: string | null;
  screening_credit_balance: number;
  dodo_customer_id: string | null;

  created_at: string;

  locations?: PracticeLocation[];
  software?: SoftwareTag[];
}

export interface PracticeLocation {
  id: string;
  practice_id: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  radius_miles: number;
  is_primary: boolean;
}

export interface SavedSearch {
  id: string;
  owner_id: string;
  label: string | null;
  role_id: number | null;
  employment_type: EmploymentType | null;
  pay_min: number | null;
  pay_max: number | null;
  distance_miles: number | null;
  min_years_experience: number | null;
  excluded_dealbreaker_ids: number[];
  open_to_relocation_only: boolean;
  last_viewed_at: string;
  created_at: string;
  // derived client-side by diffing against last_viewed_at
  new_match_count?: number;
}

export interface MessageThread {
  id: string;
  owner_id: string;
  candidate_id: string;
  created_at: string;
}

export interface Message {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  ai_drafted: boolean;
  ai_approved_by_sender: boolean;
  sent_at: string;
}

export interface ScreeningScorecard {
  pass_flags: string[];
  concern_flags: string[];
  summary_text: string;
}

export interface ScreeningSession {
  id: string;
  owner_id: string;
  candidate_id: string;
  credits_spent: number;
  status: ScreeningStatus;
  consent_given_at: string | null;
  transcript: { role: "ai" | "candidate"; text: string; at: string }[];
  scorecard: ScreeningScorecard | null;
  candidate_reviewed_summary: boolean;
  created_at: string;
  completed_at: string | null;
}

// Placeholder until `supabase gen types` produces the real Database type.
// Keeping the name stable now means lib/supabase/client.ts and server.ts
// don't need to change when the generated type is dropped in later.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
