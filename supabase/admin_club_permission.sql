-- ============================================================================
-- Admins without club management
-- Run once in Supabase Dashboard -> SQL -> New query. Idempotent, safe to re-run.
-- Run after clubs_setup.sql, profiles_edit_setup.sql and profile_points_sync.sql.
--
-- Adds profiles.can_manage_clubs (default true). An admin with it set to false
-- keeps every other admin power but can no longer add, edit or remove clubs
-- (or their logos). Enforced here at the database level; the admin panel also
-- hides the club controls for them.
-- ============================================================================

-- 1. --------------------------------------------------------------- COLUMN --
alter table public.profiles
  add column if not exists can_manage_clubs boolean not null default true;

-- 2. --------------------------------------------------------------- HELPER --
-- True when the current user is an admin who may manage clubs.
create or replace function public.can_manage_clubs()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin' and p.can_manage_clubs
  );
$$;

-- 3. ----------------------------------------------------------- CLUBS RLS ---
drop policy if exists "Admins can insert clubs" on public.clubs;
create policy "Admins can insert clubs"
  on public.clubs
  for insert
  to authenticated
  with check (public.can_manage_clubs());

drop policy if exists "Admins can update clubs" on public.clubs;
create policy "Admins can update clubs"
  on public.clubs
  for update
  to authenticated
  using (public.can_manage_clubs());

drop policy if exists "Admins can delete clubs" on public.clubs;
create policy "Admins can delete clubs"
  on public.clubs
  for delete
  to authenticated
  using (public.can_manage_clubs());

-- 4. ---------------------------------------------------- CLUB LOGO STORAGE ---
drop policy if exists "Admins can upload club logos" on storage.objects;
create policy "Admins can upload club logos"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'club-logos' and public.can_manage_clubs());

drop policy if exists "Admins can update club logos" on storage.objects;
create policy "Admins can update club logos"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'club-logos' and public.can_manage_clubs());

drop policy if exists "Admins can delete club logos" on storage.objects;
create policy "Admins can delete club logos"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'club-logos' and public.can_manage_clubs());

-- 5. ---------------------------------------------------------------- GUARD ---
-- Same guard as profile_points_sync.sql, plus: only a full admin (one who can
-- manage clubs) may change can_manage_clubs, so a restricted admin can't give
-- the permission back to themselves. The SQL editor / dashboard (auth.uid() is
-- null) can always change it.
create or replace function public.protect_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
     and coalesce(current_setting('app.sync_points', true), '0') <> '1'
     and not exists (
       select 1 from public.profiles p
       where p.id = auth.uid() and p.role = 'admin'
     )
  then
    new.role := old.role;
    new.total_points := old.total_points;
  end if;

  if auth.uid() is not null and not public.can_manage_clubs() then
    new.can_manage_clubs := old.can_manage_clubs;
  end if;

  return new;
end;
$$;

-- 6. ------------------------------------------------------ SET THE PERSON ---
-- Make the person an admin WITHOUT club management. Replace the email with
-- theirs (as shown in the admin Player List), then run this statement.
-- update public.profiles
--   set role = 'admin', can_manage_clubs = false
--   where email = 'person@example.com';
