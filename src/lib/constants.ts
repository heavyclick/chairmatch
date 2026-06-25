/**
 * Mirrors the seed data in supabase/migrations/0001_initial_schema.sql.
 * Kept as a static frontend constant (rather than fetched from the DB on
 * every page load) because this vocabulary changes rarely and is needed
 * synchronously for filter UI, onboarding chip selection, etc.
 *
 * If these ever drift from the DB seed data, the DB is the source of
 * truth -- update this file to match, not the other way around.
 */

export interface RoleOption {
  slug: string;
  label: string;
  aliases: { slug: string; label: string }[];
}

export const ROLES: RoleOption[] = [
  { slug: "dentist_owner", label: "Dentist / Practice Owner (DDS, DMD)", aliases: [] },
  { slug: "associate_dentist", label: "Associate Dentist", aliases: [] },
  { slug: "hygienist", label: "Dental Hygienist (RDH)", aliases: [] },
  {
    slug: "dental_assistant",
    label: "Dental Assistant (DA, RDA, EFDA)",
    aliases: [
      { slug: "expanded_function_assistant", label: "Expanded Function Dental Assistant" },
      { slug: "orthodontic_assistant", label: "Orthodontic Assistant" },
    ],
  },
  {
    slug: "office_manager",
    label: "Office / Practice Manager",
    aliases: [
      { slug: "practice_manager", label: "Practice Manager" },
      { slug: "operations_manager", label: "Operations Manager" },
      { slug: "business_manager", label: "Business Manager" },
      { slug: "general_manager", label: "General Manager" },
    ],
  },
  {
    slug: "front_desk",
    label: "Front Desk",
    aliases: [
      { slug: "receptionist", label: "Receptionist" },
      { slug: "scheduling_coordinator", label: "Scheduling Coordinator" },
    ],
  },
  {
    slug: "treatment_coordinator",
    label: "Treatment Coordinator",
    aliases: [
      { slug: "patient_coordinator", label: "Patient Coordinator" },
      { slug: "new_patient_coordinator", label: "New Patient Coordinator" },
    ],
  },
  {
    slug: "billing_coordinator",
    label: "Billing / Insurance Coordinator",
    aliases: [
      { slug: "insurance_coordinator", label: "Insurance Coordinator" },
      { slug: "insurance_biller", label: "Insurance Biller" },
    ],
  },
  { slug: "lab_tech", label: "Dental Lab Technician", aliases: [] },
  { slug: "sterilization_tech", label: "Sterilization Technician", aliases: [] },
  { slug: "sales_rep", label: "Dental Sales Representative", aliases: [] },
];

export const SOFTWARE_OPTIONS = [
  { slug: "dentrix", label: "Dentrix" },
  { slug: "eaglesoft", label: "Eaglesoft" },
  { slug: "open_dental", label: "Open Dental" },
  { slug: "curve_dental", label: "Curve Dental" },
  { slug: "dovetail", label: "Dovetail" },
  { slug: "denticon", label: "Denticon" },
  { slug: "practice_web", label: "PracticeWeb" },
  { slug: "cloud_9", label: "Cloud 9 Ortho" },
  { slug: "carestack", label: "CareStack" },
  { slug: "dentimax", label: "DentiMax" },
];

export const DEALBREAKER_OPTIONS = [
  { slug: "no_dso", label: "No DSO / corporate offices" },
  { slug: "no_spousal_management", label: "No husband-and-wife co-managed practices" },
  { slug: "no_multi_doctor_high_volume", label: "No multi-doctor high-volume clinics" },
  { slug: "no_weekend_work", label: "No weekend availability required" },
  { slug: "no_solo_coverage", label: "Won't work solo without backup support" },
];

export const EMPLOYMENT_TYPES = [
  { slug: "full_time", label: "Full-Time" },
  { slug: "part_time", label: "Part-Time" },
  { slug: "temp", label: "Temp" },
] as const;
