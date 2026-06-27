-- ============================================================================
-- Allow players to edit their own profile
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
-- Idempotent: safe to run again. Run profiles_auth_setup.sql first.
-- ============================================================================

-- 1. ----------------------------------------------- UPDATE POLICY -----------
-- A logged-in user may update only their own profile row.
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 2. -------------------------------------- PROTECT PRIVILEGED FIELDS ---------
-- Stops a normal user from editing their own role / total_points (e.g. making
-- themselves admin or giving themselves points). Admins are unaffected, and the
-- admin points RPC keeps working.
create or replace function public.protect_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  ) then
    new.role := old.role;
    new.total_points := old.total_points;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_fields on public.profiles;
create trigger protect_profile_fields
  before update on public.profiles
  for each row execute function public.protect_profile_privileged_fields();

-- 3. ------------------------------------------- KEEP EMAIL IN SYNC -----------
-- When a user changes their email (and confirms it), auth.users.email updates;
-- mirror that into profiles.email so the displayed email stays correct.
create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_email_change on auth.users;
create trigger on_auth_email_change
  after update of email on auth.users
  for each row execute function public.sync_profile_email();
