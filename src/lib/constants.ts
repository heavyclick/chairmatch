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

// Clinical/technical equipment & technique familiarity, split by role
// family -- previously every candidate, regardless of role, was asked
// about *practice management software* (Curve Dental, Eaglesoft, etc.),
// which makes sense for someone at the front desk but not for a
// hygienist or assistant, whose day-to-day tools are clinical
// equipment and chairside techniques, not scheduling software.
export const HYGIENIST_SKILLS_OPTIONS = [
  { slug: "local_anesthesia", label: "Local anesthesia administration" },
  { slug: "nitrous_monitoring", label: "Nitrous oxide monitoring" },
  { slug: "soft_tissue_laser", label: "Soft-tissue laser" },
  { slug: "digital_xray", label: "Digital X-ray / sensors" },
  { slug: "intraoral_scanner", label: "Intraoral scanners (iTero, 3Shape, etc.)" },
  { slug: "sealants", label: "Sealants" },
  { slug: "fluoride_varnish", label: "Fluoride varnish" },
  { slug: "silver_diamine_fluoride", label: "Silver diamine fluoride (SDF)" },
  { slug: "perio_charting_software", label: "Perio charting software" },
];

export const ASSISTANT_SKILLS_OPTIONS = [
  { slug: "digital_xray", label: "Digital X-ray / sensors" },
  { slug: "intraoral_scanner", label: "Intraoral scanners (iTero, 3Shape, etc.)" },
  { slug: "coronal_polishing", label: "Coronal polishing" },
  { slug: "sealants", label: "Sealants" },
  { slug: "temp_crown_fabrication", label: "Temporary crown fabrication" },
  { slug: "four_handed_dentistry", label: "Four-handed dentistry" },
  { slug: "cad_cam", label: "CAD/CAM (CEREC, etc.)" },
  { slug: "nitrous_monitoring", label: "Nitrous oxide monitoring" },
  { slug: "sterilization_osha", label: "Sterilization / OSHA compliance" },
];

export const LAB_SKILLS_OPTIONS = [
  { slug: "cad_cam_design", label: "CAD/CAM design" },
  { slug: "three_d_printing", label: "3D printing" },
  { slug: "crown_bridge", label: "Crown & bridge fabrication" },
  { slug: "denture_fabrication", label: "Denture fabrication" },
  { slug: "digital_scanning", label: "Digital scanning software" },
  { slug: "wax_ups", label: "Wax-ups & diagnostic models" },
];

export const STERILIZATION_SKILLS_OPTIONS = [
  { slug: "sterilization_osha", label: "OSHA compliance" },
  { slug: "autoclave", label: "Autoclave operation & monitoring" },
  { slug: "instrument_tracking", label: "Instrument tracking systems" },
  { slug: "biological_monitoring", label: "Biological spore testing" },
];

// Roles whose day-to-day tool really is practice management software,
// vs. roles where it's clinical/lab equipment instead. Anything not
// listed here or below falls back to SOFTWARE_OPTIONS as a reasonable
// default (dentists and admin-adjacent roles both touch the PMS).
export const CLINICAL_SKILLS_BY_ROLE: Record<string, { slug: string; label: string }[]> = {
  hygienist: HYGIENIST_SKILLS_OPTIONS,
  dental_assistant: ASSISTANT_SKILLS_OPTIONS,
  lab_tech: LAB_SKILLS_OPTIONS,
  sterilization_tech: STERILIZATION_SKILLS_OPTIONS,
};

// Role-specific certifications -- previously this was one universal
// blank free-text field ("Certifications, comma separated") for every
// role, so nobody was prompted with the certifications that actually
// exist and matter for their specific role. Chip-select with a custom
// "other" fallback (same pattern as software/skills above), not a
// replacement for free text -- still can't cover every state's rules.
export const HYGIENIST_CERTIFICATIONS = [
  { slug: "local_anesthesia_cert", label: "Local Anesthesia Certified" },
  { slug: "nitrous_cert", label: "Nitrous Oxide Certified" },
  { slug: "laser_cert", label: "Laser Certified" },
  { slug: "cpr_bls", label: "CPR / BLS Certified" },
];

export const ASSISTANT_CERTIFICATIONS = [
  { slug: "rda", label: "RDA (Registered Dental Assistant)" },
  { slug: "efda", label: "EFDA (Expanded Function)" },
  { slug: "xray_cert", label: "Radiography / X-Ray Certified" },
  { slug: "coronal_polishing_cert", label: "Coronal Polishing Certified" },
  { slug: "sealant_cert", label: "Sealant Certified" },
  { slug: "cpr_bls", label: "CPR / BLS Certified" },
];

export const DENTIST_CERTIFICATIONS = [
  { slug: "sedation_permit", label: "Sedation Permit (Conscious/IV)" },
  { slug: "invisalign_cert", label: "Invisalign Certified" },
  { slug: "implant_training", label: "Implant Training Certificate" },
  { slug: "board_certified", label: "Board Certified Specialist" },
];

export const CERTIFICATIONS_BY_ROLE: Record<string, { slug: string; label: string }[]> = {
  hygienist: HYGIENIST_CERTIFICATIONS,
  dental_assistant: ASSISTANT_CERTIFICATIONS,
  dentist_owner: DENTIST_CERTIFICATIONS,
  associate_dentist: DENTIST_CERTIFICATIONS,
};

export const BENEFIT_OPTIONS = [
  { slug: "health_insurance", label: "Health insurance" },
  { slug: "dental_benefits", label: "Dental benefits" },
  { slug: "paid_vacation", label: "Paid vacation" },
  { slug: "paid_holidays", label: "Paid holidays" },
  { slug: "sick_days", label: "Paid sick days" },
  { slug: "401k", label: "401(k) / retirement plan" },
  { slug: "bonuses", label: "Performance bonuses" },
  { slug: "ce_reimbursement", label: "CE course reimbursement" },
  { slug: "uniform_allowance", label: "Uniform / scrubs allowance" },
  { slug: "employee_discount", label: "Employee discount on dental work" },
];

export const DEALBREAKER_OPTIONS = [
  { slug: "no_dso", label: "No DSO / corporate offices" },
  { slug: "no_spousal_management", label: "No husband-and-wife co-managed practices" },
  { slug: "no_multi_doctor_high_volume", label: "No multi-doctor high-volume clinics" },
  { slug: "no_weekend_work", label: "No weekend availability required" },
  { slug: "no_solo_coverage", label: "Won't work solo without backup support" },
  { slug: "no_underinvestment", label: "Practice that skimps on supplies or tools you need to do the job" },
  { slug: "no_guilt_tripping", label: "Guilt-trips staff for being sick or facing unplanned issues" },
  { slug: "no_benefits_offered", label: "Offers no benefits at all" },
  { slug: "no_personal_life_intrusion", label: "Expects too much of your time outside work" },
];

export const EMPLOYMENT_TYPES = [
  { slug: "full_time", label: "Full-Time" },
  { slug: "part_time", label: "Part-Time" },
  { slug: "temp", label: "Temp" },
] as const;

// Full state list needed because city alone is ambiguous (e.g. there
// are multiple "Houston"s, multiple "Springfield"s, etc.) -- this was a
// confirmed gap, city was collected with no state to disambiguate it.
export const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN",
  "IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV",
  "NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN",
  "TX","UT","VT","VA","WA","WV","WI","WY","DC",
];

export const SPECIALTY_OPTIONS = [
  { slug: "general", label: "General Dentistry" },
  { slug: "orthodontics", label: "Orthodontics" },
  { slug: "periodontics", label: "Periodontics" },
  { slug: "pediatric", label: "Pediatric Dentistry" },
  { slug: "oral_surgery", label: "Oral Surgery" },
  { slug: "cosmetic", label: "Cosmetic Dentistry" },
  { slug: "endodontics", label: "Endodontics" },
  { slug: "prosthodontics", label: "Prosthodontics" },
];

export const DAYS_OF_WEEK = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];
