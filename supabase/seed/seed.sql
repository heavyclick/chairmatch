-- ChairMatch seed data
-- Run AFTER 0001_initial_schema.sql, via the Supabase SQL Editor.
--
-- IMPORTANT: candidate_profiles.id and practice_profiles.id are foreign
-- keys into auth.users -- you can't insert a candidate/practice profile
-- for a user that doesn't exist in Supabase Auth yet. This seed file
-- works around that by inserting directly into auth.users with
-- hand-picked UUIDs (safe for a dev/staging project; NEVER do this
-- against a production project with real users).
--
-- These seeded accounts use the password "ChairMatchSeed!2026" if you
-- ever want to log in as one of them to poke around -- though for
-- normal browsing/testing you don't need to log in as a candidate at
-- all, since /owner/browse reads candidate_profiles directly.

-- ============================================================
-- Helper: insert a fake auth user + matching profiles row
-- ============================================================
do $$
declare
  v_id uuid;
begin
  -- 36 candidate seed users
  for i in 1..36 loop
    v_id := ('00000000-0000-0000-0000-' || lpad(i::text, 12, '0'))::uuid;
    insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, instance_id, aud, role)
    values (
      v_id,
      'candidate_seed_' || i || '@chairmatch.test',
      crypt('ChairMatchSeed!2026', gen_salt('bf')),
      now(), now(), now(),
      '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'
    )
    on conflict (id) do nothing;

    insert into public.profiles (id, email, account_type)
    values (v_id, 'candidate_seed_' || i || '@chairmatch.test', 'candidate')
    on conflict (id) do nothing;
  end loop;

  -- 5 practice seed users
  for i in 101..105 loop
    v_id := ('00000000-0000-0000-0000-' || lpad(i::text, 12, '0'))::uuid;
    insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, instance_id, aud, role)
    values (
      v_id,
      'practice_seed_' || i || '@chairmatch.test',
      crypt('ChairMatchSeed!2026', gen_salt('bf')),
      now(), now(), now(),
      '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'
    )
    on conflict (id) do nothing;

    insert into public.profiles (id, email, account_type)
    values (v_id, 'practice_seed_' || i || '@chairmatch.test', 'owner')
    on conflict (id) do nothing;
  end loop;
end $$;

-- ============================================================
-- Candidate profiles -- 36 across roles, Houston-area, realistic spread
-- ============================================================
-- Role id reference (from 0001_initial_schema.sql insert order):
-- 1 dentist_owner, 2 associate_dentist, 3 hygienist, 4 dental_assistant,
-- 5 office_manager, 6 front_desk, 7 treatment_coordinator,
-- 8 billing_coordinator, 9 lab_tech, 10 sterilization_tech, 11 sales_rep

insert into public.candidate_profiles (
  id, full_name, primary_role_id, city, state, zip, location,
  employment_types, open_to_relocation, pay_range_min, pay_range_max, pay_unit,
  years_experience, value_add_text, future_goals_text, recovery_scenario_text,
  visibility_status, profile_completeness_score
) values
('00000000-0000-0000-0000-000000000001', 'Jasmine Marsh', 3, 'Houston', 'TX', '77001', st_setsrid(st_makepoint(-95.3698, 29.7604), 4326)::geography, '{full_time}', false, 48, 52, 'hourly', 6, 'I track unscheduled treatment weekly and follow up personally -- it helped my last office recover six lost patients in a month.', 'I want to keep growing clinically, maybe pick up laser certification in the next year.', 'I''d start by pulling the unscheduled treatment report and personally calling patients who fell off -- that''s where I''ve seen the fastest recovery before.', 'actively_looking', 92),
('00000000-0000-0000-0000-000000000002', 'Renee Castillo', 3, 'Houston', 'TX', '77002', st_setsrid(st_makepoint(-95.3580, 29.7530), 4326)::geography, '{full_time}', true, 50, 58, 'hourly', 9, 'I see myself eventually mentoring newer hygienists -- I love the teaching side almost as much as the clinical side.', 'Mentoring or a lead hygienist role within 2 years.', 'I''d look at the recall system first -- most volume drops trace back to a broken recall process, not a marketing problem.', 'actively_looking', 88),
('00000000-0000-0000-0000-000000000003', 'Keisha Porter', 3, 'Sugar Land', 'TX', '77478', st_setsrid(st_makepoint(-95.6349, 29.6196), 4326)::geography, '{part_time}', false, 55, 60, 'hourly', 12, 'Patient anxiety management is my strength -- I trained under a sedation specialist for 3 years before going back to general practice.', 'Staying clinical, possibly specializing further in anxious-patient care.', 'I''d audit no-show rates by time slot -- usually there''s a scheduling pattern causing it that''s fixable without spending a dollar on ads.', 'actively_looking', 85),
('00000000-0000-0000-0000-000000000004', 'Monica Diaz', 3, 'Pearland', 'TX', '77584', st_setsrid(st_makepoint(-95.2861, 29.5636), 4326)::geography, '{full_time,part_time}', false, 45, 49, 'hourly', 4, 'I''m looking for a long-term home -- not interested in hopping between offices every year.', 'Building real tenure somewhere and growing with one practice.', 'I''d start with patient reactivation calls -- a personal touch usually brings people back faster than a postcard.', 'actively_looking', 78),
('00000000-0000-0000-0000-000000000005', 'Angela Tran', 3, 'Katy', 'TX', '77449', st_setsrid(st_makepoint(-95.8244, 29.7858), 4326)::geography, '{full_time}', false, 47, 53, 'hourly', 7, 'I''m fast but thorough -- I can run a full schedule without making patients feel rushed.', 'Open to office manager track eventually if the right practice needs it.', 'I''d check if the schedule has enough buffer for same-day add-ons -- those are easy revenue most practices leave on the table.', 'actively_looking', 81),
('00000000-0000-0000-0000-000000000006', 'Brittany Okafor', 3, 'Houston', 'TX', '77043', st_setsrid(st_makepoint(-95.5552, 29.8044), 4326)::geography, '{temp,full_time}', true, 44, 50, 'hourly', 3, 'I adapt fast to new software and new teams -- I''ve floated between 4 different offices and never missed a beat.', 'Finding the right full-time fit after some temp work to feel out culture.', 'I''d look at whether hygiene and doctor schedules are actually in sync -- gaps there quietly bleed production.', 'actively_looking', 70),
('00000000-0000-0000-0000-000000000007', 'Dana Whitfield', 4, 'Houston', 'TX', '77004', st_setsrid(st_makepoint(-95.3633, 29.7307), 4326)::geography, '{full_time}', false, 22, 26, 'hourly', 5, 'EFDA certified and actively looking to take on more chairside responsibility, not just assist.', 'Moving toward expanded duties, maybe eventually treatment coordination.', 'I''d look at chair turnover time first -- shaving a few minutes per patient adds up to real extra capacity over a week.', 'actively_looking', 84),
('00000000-0000-0000-0000-000000000008', 'Priya Nair', 4, 'Houston', 'TX', '77019', st_setsrid(st_makepoint(-95.4019, 29.7558), 4326)::geography, '{full_time}', false, 20, 24, 'hourly', 2, 'I''m organized and proactive -- I prep rooms before I''m asked and double-check sterilization logs without being told.', 'Becoming an EFDA within the next year.', 'I''d make sure new patient intake paperwork is airtight -- a smooth first visit brings people back for treatment.', 'actively_looking', 65),
('00000000-0000-0000-0000-000000000009', 'Latoya Simmons', 4, 'Missouri City', 'TX', '77459', st_setsrid(st_makepoint(-95.5377, 29.6188), 4326)::geography, '{part_time}', false, 21, 25, 'hourly', 4, 'I''m great with anxious kids -- I worked in pediatric dentistry for two years and it shaped how I talk patients through procedures.', 'Open to pediatric-focused offices long-term.', 'I''d focus on making the patient experience calmer -- word of mouth from happy parents brings more new patients than any ad.', 'actively_looking', 76),
('00000000-0000-0000-0000-000000000010', 'Christina Reyes', 4, 'Houston', 'TX', '77036', st_setsrid(st_makepoint(-95.5169, 29.7158), 4326)::geography, '{full_time,temp}', true, 23, 27, 'hourly', 6, 'Bilingual (English/Spanish) -- I''ve helped offices retain Spanish-speaking patients who felt unheard elsewhere.', 'Growing into a lead assistant or training role.', 'I''d check if language is actually a barrier in patient communication -- that alone has saved patients from leaving in past offices.', 'actively_looking', 80),
('00000000-0000-0000-0000-000000000011', 'Samantha Cole', 5, 'Houston', 'TX', '77027', st_setsrid(st_makepoint(-95.4509, 29.7406), 4326)::geography, '{full_time}', false, 60000, 70000, 'annual', 8, 'If production is slipping, I start with the schedule -- gaps usually mean a confirmation or recall problem, not a marketing one.', 'Growing into a multi-location operations role eventually.', 'I''d pull a full schedule analysis going back 90 days before touching anything else -- the answer is almost always already in the data.', 'actively_looking', 90),
('00000000-0000-0000-0000-000000000012', 'Renata Torres', 5, 'Houston', 'TX', '77098', st_setsrid(st_makepoint(-95.4280, 29.7378), 4326)::geography, '{full_time}', true, 62000, 72000, 'annual', 9, 'I rebuilt a collections process at my last office that cut AR over 90 days by 40% in six months.', 'Staying in practice management long-term, ideally somewhere I can own real process improvements.', 'I''d audit the insurance aging report first -- unpaid claims are invisible lost revenue most owners don''t realize is sitting there.', 'actively_looking', 91),
('00000000-0000-0000-0000-000000000013', 'Vanessa Holt', 5, 'Spring', 'TX', '77373', st_setsrid(st_makepoint(-95.4172, 30.0799), 4326)::geography, '{full_time}', false, 55000, 65000, 'annual', 5, 'I''m hands-on with the team -- I believe culture problems show up as production problems before anyone notices.', 'Eventually opening my own consulting practice for small dental offices.', 'I''d talk to the team before the data -- usually staff already know exactly why patients aren''t coming back.', 'open', 73),
('00000000-0000-0000-0000-000000000014', 'Tiffany Brooks', 6, 'Houston', 'TX', '77008', st_setsrid(st_makepoint(-95.4147, 29.8019), 4326)::geography, '{full_time}', false, 18, 21, 'hourly', 3, 'I never let the phone ring more than twice -- missed calls are missed patients and I take that personally.', 'Moving toward treatment coordination.', 'I''d check the call log for missed/unanswered calls first -- that''s usually the cheapest fix with the fastest payoff.', 'actively_looking', 75),
('00000000-0000-0000-0000-000000000015', 'Ashley Mendez', 6, 'Houston', 'TX', '77030', st_setsrid(st_makepoint(-95.3990, 29.7079), 4326)::geography, '{part_time,temp}', false, 17, 20, 'hourly', 2, 'I''m calm under pressure -- a packed waiting room doesn''t throw me off the schedule.', 'Full-time front desk somewhere stable, then growth from there.', 'I''d look at how confirmations are being sent -- texts convert way better than calls for most patients now.', 'actively_looking', 60),
('00000000-0000-0000-0000-000000000016', 'Crystal Nguyen', 6, 'Bellaire', 'TX', '77401', st_setsrid(st_makepoint(-95.4588, 29.7058), 4326)::geography, '{full_time}', false, 19, 23, 'hourly', 5, 'I''m the one who remembers regulars'' names and kids'' names -- patients notice and it keeps them coming back.', 'Office manager track within the next couple years.', 'I''d start with a same-day cancellation policy -- last-minute holes in the schedule are pure lost revenue.', 'actively_looking', 79),
('00000000-0000-0000-0000-000000000017', 'Megan Pierce', 7, 'Houston', 'TX', '77056', st_setsrid(st_makepoint(-95.4691, 29.7461), 4326)::geography, '{full_time}', false, 22, 27, 'hourly', 4, 'I''m the bridge between clinical and financial -- patients trust treatment plans more when I walk them through cost clearly.', 'Becoming a top treatment coordinator known for high case acceptance.', 'I''d revisit how treatment plans are presented -- most acceptance problems are a communication issue, not a price issue.', 'actively_looking', 83),
('00000000-0000-0000-0000-000000000018', 'Olivia Grant', 8, 'Houston', 'TX', '77024', st_setsrid(st_makepoint(-95.4869, 29.7689), 4326)::geography, '{full_time}', false, 24, 29, 'hourly', 6, 'I''ve cut claim denial rates in half at two practices by tightening up coding accuracy before submission.', 'Specializing further in insurance strategy and PPO negotiation.', 'I''d audit recent denials for patterns first -- usually 2-3 fixable coding habits are causing most of the lost revenue.', 'actively_looking', 87),
('00000000-0000-0000-0000-000000000019', 'Heather Lin', 8, 'Stafford', 'TX', '77477', st_setsrid(st_makepoint(-95.5577, 29.6160), 4326)::geography, '{part_time}', false, 22, 26, 'hourly', 3, 'I''m detail-obsessed with claim documentation -- it''s saved offices from denials before they even happen.', 'Growing into a billing lead role.', 'I''d check the resubmission turnaround time -- slow follow-up on denials is money sitting on the table for months.', 'actively_looking', 71),
('00000000-0000-0000-0000-000000000020', 'Natalie Brewer', 9, 'Houston', 'TX', '77093', st_setsrid(st_makepoint(-95.3582, 29.8553), 4326)::geography, '{full_time}', true, 20, 25, 'hourly', 8, 'I have a fast turnaround on crown and bridge work without sacrificing fit quality -- doctors trust my cases on the first try.', 'Possibly running my own lab eventually.', 'Not really my lane operationally, but faster turnaround on cases means doctors can book more same-week restorative work.', 'actively_looking', 68),
('00000000-0000-0000-0000-000000000021', 'Derek Sanchez', 2, 'Houston', 'TX', '77005', st_setsrid(st_makepoint(-95.4264, 29.7180), 4326)::geography, '{part_time,full_time}', true, 600, 800, 'hourly', 4, 'I''m comfortable with full-mouth restorative cases, not just the basics -- I want to actually contribute clinically, not just fill a chair.', 'Open to partnership track in 3-5 years with the right practice.', 'I''d review case acceptance on larger treatment plans -- often it''s presentation and trust-building, not price, holding people back.', 'open', 82),
('00000000-0000-0000-0000-000000000022', 'Brandon Wells', 2, 'Sugar Land', 'TX', '77479', st_setsrid(st_makepoint(-95.6217, 29.5994), 4326)::geography, '{full_time}', false, 550, 750, 'hourly', 2, 'I''m fast to build patient trust -- my chair-side manner gets repeat referrals even as a newer associate.', 'Building toward ownership eventually, but want strong mentorship first.', 'I''d focus on Saturday availability -- a lot of practices leave real demand on the table by not offering weekend slots.', 'actively_looking', 74),
('00000000-0000-0000-0000-000000000023', 'Sarah Kim', 1, 'Houston', 'TX', '77007', st_setsrid(st_makepoint(-95.4010, 29.7733), 4326)::geography, '{full_time}', false, 800, 1200, 'hourly', 11, 'I''ve grown a single-chair practice into a 4-operatory office -- I know what actually moves production, not just theory.', 'Looking for an associate-to-partner track to bring someone up the way I was brought up.', 'I''d look hard at hygiene re-care numbers -- most "slow practice" problems are really a hygiene department that''s under-booked.', 'open', 95),
('00000000-0000-0000-0000-000000000024', 'James Holloway', 10, 'Houston', 'TX', '77017', st_setsrid(st_makepoint(-95.3056, 29.6783), 4326)::geography, '{full_time,part_time}', false, 17, 19, 'hourly', 2, 'I take infection control seriously -- I''ve never had a sterilization audit flag in two years.', 'Cross-training into chairside assisting eventually.', 'Outside my lane on revenue, but a clean, fast-turnaround sterile area keeps the whole schedule from backing up.', 'actively_looking', 58),
('00000000-0000-0000-0000-000000000025', 'Courtney Adams', 11, 'Houston', 'TX', '77046', st_setsrid(st_makepoint(-95.4435, 29.7421), 4326)::geography, '{full_time}', true, 50000, 75000, 'annual', 6, 'I understand both sides of the table -- I worked front desk for 3 years before moving into dental sales.', 'Growing a territory and eventually managing a sales team.', 'Not a clinical answer, but I''d look at whether the practice is using all the equipment they already bought -- under-utilized tech is wasted spend.', 'open', 69),
('00000000-0000-0000-0000-000000000026', 'Lauren Foster', 3, 'Cypress', 'TX', '77433', st_setsrid(st_makepoint(-95.6972, 29.9691), 4326)::geography, '{full_time}', false, 49, 54, 'hourly', 5, 'I''m thorough with perio charting -- I catch things other hygienists rush past, which has caught real issues early.', 'Possibly specializing in periodontal therapy.', 'I''d look at perio program consistency -- it''s recurring revenue most practices under-deliver on.', 'actively_looking', 77),
('00000000-0000-0000-0000-000000000027', 'Nicole Park', 4, 'Houston', 'TX', '77025', st_setsrid(st_makepoint(-95.4434, 29.6989), 4326)::geography, '{temp}', false, 22, 26, 'hourly', 3, 'I pick up new offices'' workflows within a day -- temp work made me adaptable in a way permanent roles rarely demand.', 'Settling into one great practice once I find the right culture fit.', 'I''d make sure new-patient paperwork doesn''t create a bottleneck at check-in -- first impressions affect retention more than people think.', 'actively_looking', 62),
('00000000-0000-0000-0000-000000000028', 'Erica Sanders', 6, 'Houston', 'TX', '77015', st_setsrid(st_makepoint(-95.2459, 29.7466), 4326)::geography, '{full_time}', false, 18, 22, 'hourly', 4, 'I''m good on the phone closing same-day appointment requests -- I don''t let urgency slip to "we''ll call you back."', 'Front desk lead or scheduling coordinator role.', 'I''d audit how same-day requests are being handled -- those callers are ready to book right now if you don''t make them wait.', 'actively_looking', 72),
('00000000-0000-0000-0000-000000000029', 'Whitney Cole', 5, 'Pasadena', 'TX', '77506', st_setsrid(st_makepoint(-95.2091, 29.6911), 4326)::geography, '{full_time}', false, 58000, 68000, 'annual', 7, 'I run tight morning huddles -- the whole team knows the day''s goals before the first patient walks in.', 'Staying in management, ideally somewhere I can build a real team culture.', 'I''d start with morning huddle structure -- a team that knows the day''s numbers performs differently than one that doesn''t.', 'actively_looking', 80),
('00000000-0000-0000-0000-000000000030', 'Diana Ruiz', 8, 'Houston', 'TX', '77072', st_setsrid(st_makepoint(-95.5984, 29.7100), 4326)::geography, '{part_time,full_time}', false, 21, 25, 'hourly', 4, 'I cross-check every claim against the fee schedule before it goes out -- catches errors before they become denials.', 'Becoming a billing specialist focused entirely on PPO contracts.', 'I''d check the fee schedule against actual reimbursements -- mismatches there quietly cost practices thousands a year.', 'actively_looking', 75),
('00000000-0000-0000-0000-000000000031', 'Felicia Owens', 7, 'Houston', 'TX', '77042', st_setsrid(st_makepoint(-95.5535, 29.7472), 4326)::geography, '{full_time}', false, 20, 24, 'hourly', 3, 'I follow up on every unscheduled treatment plan within 48 hours -- most offices let those go cold.', 'Growing into a senior treatment coordinator role.', 'I''d look at follow-up timing on big treatment plans -- waiting more than a few days drops acceptance noticeably.', 'actively_looking', 73),
('00000000-0000-0000-0000-000000000032', 'Bianca Foster', 4, 'League City', 'TX', '77573', st_setsrid(st_makepoint(-95.0949, 29.5074), 4326)::geography, '{full_time}', true, 21, 25, 'hourly', 5, 'I''m fast at four-handed dentistry -- doctors I''ve worked with say I cut their procedure time noticeably.', 'EFDA certification within the year.', 'Outside my lane on the business side, but efficient chairside work means doctors can fit more patients into the same day.', 'actively_looking', 76),
('00000000-0000-0000-0000-000000000033', 'Patricia Moss', 3, 'Friendswood', 'TX', '77546', st_setsrid(st_makepoint(-95.2010, 29.5294), 4326)::geography, '{part_time}', false, 52, 57, 'hourly', 10, 'I''m great with nervous kids and elderly patients alike -- I adjust my approach based on who''s in the chair.', 'Staying clinical, no interest in management.', 'I''d look at recall scheduling for older patients specifically -- they''re often the most loyal but most easily lost to a scheduling gap.', 'actively_looking', 86),
('00000000-0000-0000-0000-000000000034', 'Gabriela Santos', 6, 'Houston', 'TX', '77011', st_setsrid(st_makepoint(-95.3309, 29.7372), 4326)::geography, '{full_time,temp}', false, 18, 22, 'hourly', 2, 'Bilingual front desk -- I''ve directly helped retain Spanish-speaking patients who felt unheard at the front desk before.', 'Growing into treatment coordination, bilingual specialty.', 'I''d check if language support is actually offered at check-in -- patients leave quietly when they don''t feel understood.', 'actively_looking', 64),
('00000000-0000-0000-0000-000000000035', 'Kristen Abara', 5, 'Houston', 'TX', '77063', st_setsrid(st_makepoint(-95.5290, 29.7488), 4326)::geography, '{full_time}', false, 59000, 69000, 'annual', 6, 'I''m the one who actually reads the P&L every month -- most managers skip it, I build the plan around it.', 'Multi-location operations management eventually.', 'I''d start with overhead vs. production ratio -- most owners haven''t looked at theirs in over a year.', 'actively_looking', 84),
('00000000-0000-0000-0000-000000000036', 'Yolanda Reed', 3, 'Houston', 'TX', '77074', st_setsrid(st_makepoint(-95.5111, 29.6953), 4326)::geography, '{full_time}', false, 46, 51, 'hourly', 5, 'I''m efficient without cutting corners -- I can run a full schedule and still spend real time on patient education.', 'Open to a lead hygienist role in a couple years.', 'I''d check same-day fluoride/sealant acceptance rates -- small recurring revenue most hygiene departments leave unsold.', 'actively_looking', 79)
on conflict (id) do nothing;

-- Software tags for a representative subset of candidates (Dentrix and
-- Open Dental are the two most common in this market per the build
-- document's market research, so weight toward those).
insert into public.candidate_software (candidate_id, tag_id)
select c.id, s.id from public.candidate_profiles c, public.software_tags s
where s.slug = 'dentrix' and c.id in (
  '00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000007',
  '00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000014','00000000-0000-0000-0000-000000000017',
  '00000000-0000-0000-0000-000000000023','00000000-0000-0000-0000-000000000029'
) on conflict do nothing;

insert into public.candidate_software (candidate_id, tag_id)
select c.id, s.id from public.candidate_profiles c, public.software_tags s
where s.slug = 'open_dental' and c.id in (
  '00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000016',
  '00000000-0000-0000-0000-000000000018','00000000-0000-0000-0000-000000000026',
  '00000000-0000-0000-0000-000000000033','00000000-0000-0000-0000-000000000036'
) on conflict do nothing;

-- Dealbreakers for a representative subset
insert into public.candidate_dealbreakers (candidate_id, tag_id)
select c.id, d.id from public.candidate_profiles c, public.dealbreaker_tags d
where d.slug = 'no_dso' and c.id in (
  '00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000023'
) on conflict do nothing;

insert into public.candidate_dealbreakers (candidate_id, tag_id)
select c.id, d.id from public.candidate_profiles c, public.dealbreaker_tags d
where d.slug = 'no_spousal_management' and c.id in (
  '00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000017'
) on conflict do nothing;

-- Work history for a representative subset (keeps seed file readable
-- rather than exhaustive -- add more as needed)
insert into public.candidate_work_history (candidate_id, employer_name, role_title, start_date, end_date, sort_order) values
('00000000-0000-0000-0000-000000000001', 'Houston Family Dental', 'Dental Hygienist', '2020-03-01', null, 0),
('00000000-0000-0000-0000-000000000001', 'Bright Smiles Pediatric', 'Dental Hygienist', '2018-06-01', '2020-02-15', 1),
('00000000-0000-0000-0000-000000000012', 'Gulf Coast Dental Group', 'Office Manager', '2019-01-01', null, 0),
('00000000-0000-0000-0000-000000000012', 'Memorial Dental Care', 'Front Desk Lead', '2016-04-01', '2018-12-01', 1),
('00000000-0000-0000-0000-000000000023', 'Heights Family Dentistry', 'Owner / Dentist', '2014-01-01', null, 0)
on conflict do nothing;

-- ============================================================
-- Practice profiles -- 5 seed practices around Houston
-- ============================================================
insert into public.practice_profiles (
  id, practice_name, practice_type, culture_text, thrive_text, honest_challenges_text,
  subscription_tier, screening_credit_balance
) values
('00000000-0000-0000-0000-000000000101', 'Bright Smiles Dental', 'solo',
 'Fast-paced, high patient volume, tight-knit team of 6 -- we lean on each other a lot.',
 'Someone who likes structure and doesn''t need much hand-holding once they''re trained.',
 'We''re short-staffed on Mondays and the schedule runs tight.',
 'standard', 6),
('00000000-0000-0000-0000-000000000102', 'Memorial Family Dentistry', 'group',
 'Calm, patient-first pace -- we''d rather run a little behind than rush someone out the door.',
 'Someone who genuinely enjoys patient conversation, not just clinical efficiency.',
 'Multiple doctors means schedules sometimes conflict and communication has to be tight.',
 'free', 0),
('00000000-0000-0000-0000-000000000103', 'Westside Dental Partners', 'dso',
 'Structured, metrics-driven, clear KPIs for every role.',
 'Someone comfortable with process and reporting, not just clinical work.',
 'Corporate reporting requirements add admin overhead some people find tedious.',
 'pro', 18),
('00000000-0000-0000-0000-000000000104', 'Heights Family Dentistry', 'solo',
 'Old-school, relationship-first practice -- many patients have been with us 10+ years.',
 'Someone who values long-term patient relationships over volume.',
 'We''re not the fastest-growing practice, growth has been deliberately slow.',
 'free', 0),
('00000000-0000-0000-0000-000000000105', 'Gulf Coast Dental Group', 'group',
 'High-energy, growth-focused, always testing new processes.',
 'Someone who thrives on change and doesn''t need everything to stay the same.',
 'Because we''re growing fast, processes sometimes change before everyone''s caught up.',
 'standard', 2)
on conflict (id) do nothing;

insert into public.practice_locations (practice_id, city, state, zip, location, radius_miles, is_primary) values
('00000000-0000-0000-0000-000000000101', 'Houston', 'TX', '77003', st_setsrid(st_makepoint(-95.3632, 29.7589), 4326)::geography, 15, true),
('00000000-0000-0000-0000-000000000102', 'Houston', 'TX', '77024', st_setsrid(st_makepoint(-95.4869, 29.7689), 4326)::geography, 15, true),
('00000000-0000-0000-0000-000000000103', 'Houston', 'TX', '77042', st_setsrid(st_makepoint(-95.5535, 29.7472), 4326)::geography, 20, true),
('00000000-0000-0000-0000-000000000104', 'Houston', 'TX', '77007', st_setsrid(st_makepoint(-95.4010, 29.7733), 4326)::geography, 10, true),
('00000000-0000-0000-0000-000000000105', 'Houston', 'TX', '77019', st_setsrid(st_makepoint(-95.4019, 29.7558), 4326)::geography, 25, true)
on conflict do nothing;
