-- Hdenta migration 0023
-- Run AFTER 0022_soft_email_verification.sql.
--
-- Fixes a confirmed bug: every signup was failing with Supabase's
-- generic "Database error saving new user" (500 on POST /auth/v1/signup,
-- {"code":"unexpected_failure"}), which traced back to
-- public.handle_new_user() itself failing.
--
-- Root cause: Supabase-hosted Postgres projects install several
-- extensions -- including pgcrypto, which provides gen_random_bytes()
-- -- into a dedicated `extensions` schema, not `public`. The function
-- pinned `search_path = public` (a normal, recommended security
-- practice for SECURITY DEFINER functions, to stop a caller from
-- tricking it via a same-named function in some other schema earlier
-- in their own search_path) -- but that also means it could never
-- find gen_random_bytes() in the first place if it lives in
-- `extensions` rather than `public`, which is the default location
-- for a fresh Supabase project. Every single insert this function
-- attempted threw immediately, which is why every signup failed the
-- same way, with no exceptions.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public, extensions
as $$
begin
  insert into public.profiles (id, email, account_type, terms_accepted_at, marketing_opt_in, email_verification_token)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'account_type', 'candidate'),
    coalesce((new.raw_user_meta_data->>'terms_accepted_at')::timestamptz, now()),
    coalesce((new.raw_user_meta_data->>'marketing_opt_in')::boolean, false),
    encode(gen_random_bytes(32), 'hex')
  );
  return new;
end;
$$;
