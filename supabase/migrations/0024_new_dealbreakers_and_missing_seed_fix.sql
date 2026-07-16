-- Hdenta migration 0024
-- Run AFTER 0023_fix_trigger_search_path.sql.
--
-- Two things happening here:
--
-- 1. CONFIRMED BUG FOUND WHILE ADDING THE NEW OPTIONS: `no_weekend_work`
--    and `no_solo_coverage` have been present in src/lib/constants.ts's
--    DEALBREAKER_OPTIONS (and therefore selectable during candidate
--    onboarding) since some point after 0001_initial_schema.sql, but
--    were never actually inserted into public.dealbreaker_tags in any
--    migration. candidate_dealbreakers.tag_id has a real foreign key
--    against dealbreaker_tags(id) -- any candidate selecting either of
--    these two would have hit a foreign key violation trying to save,
--    silently (or with a raw DB error surfacing, depending on how the
--    onboarding save call handles it).
--
-- 2. Four new dealbreaker options, matching the updated
--    DEALBREAKER_OPTIONS list in src/lib/constants.ts.
insert into public.dealbreaker_tags (slug, label) values
  ('no_weekend_work', 'No weekend availability required'),
  ('no_solo_coverage', 'Won''t work solo without backup support'),
  ('no_underinvestment', 'Practice that skimps on supplies or tools you need to do the job'),
  ('no_guilt_tripping', 'Guilt-trips staff for being sick or facing unplanned issues'),
  ('no_benefits_offered', 'Offers no benefits at all'),
  ('no_personal_life_intrusion', 'Expects too much of your time outside work')
on conflict (slug) do nothing;

-- ============================================================
-- Role-specific clinical/lab "skills" question replacing the
-- universal "practice software" question for hygienists, assistants,
-- lab techs, and sterilization techs (see src/lib/constants.ts's
-- CLINICAL_SKILLS_BY_ROLE) -- reuses software_tags/candidate_software
-- rather than new tables, since it's functionally the identical
-- pattern (multi-select tags + custom "other" entries) just presented
-- with a different, role-appropriate option list. The table name
-- staying "software_tags" is a little imprecise for "local anesthesia
-- administration," but reusing proven, already-RLS'd infrastructure
-- outweighs a purely cosmetic rename.
-- ============================================================
insert into public.software_tags (slug, label) values
  ('local_anesthesia', 'Local anesthesia administration'),
  ('nitrous_monitoring', 'Nitrous oxide monitoring'),
  ('soft_tissue_laser', 'Soft-tissue laser'),
  ('digital_xray', 'Digital X-ray / sensors'),
  ('intraoral_scanner', 'Intraoral scanners (iTero, 3Shape, etc.)'),
  ('sealants', 'Sealants'),
  ('fluoride_varnish', 'Fluoride varnish'),
  ('silver_diamine_fluoride', 'Silver diamine fluoride (SDF)'),
  ('perio_charting_software', 'Perio charting software'),
  ('coronal_polishing', 'Coronal polishing'),
  ('temp_crown_fabrication', 'Temporary crown fabrication'),
  ('four_handed_dentistry', 'Four-handed dentistry'),
  ('cad_cam', 'CAD/CAM (CEREC, etc.)'),
  ('sterilization_osha', 'Sterilization / OSHA compliance'),
  ('cad_cam_design', 'CAD/CAM design'),
  ('three_d_printing', '3D printing'),
  ('crown_bridge', 'Crown & bridge fabrication'),
  ('denture_fabrication', 'Denture fabrication'),
  ('digital_scanning', 'Digital scanning software'),
  ('wax_ups', 'Wax-ups & diagnostic models'),
  ('autoclave', 'Autoclave operation & monitoring'),
  ('instrument_tracking', 'Instrument tracking systems'),
  ('biological_monitoring', 'Biological spore testing')
on conflict (slug) do nothing;
