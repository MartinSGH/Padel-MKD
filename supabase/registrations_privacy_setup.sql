-- ============================================================================
-- Make the participant list admin-only
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
-- Idempotent: safe to run again. Requires the earlier registrations migrations.
--
-- After this:
--   • Only admins (and the people in a pair, for their own entry) can read the
--     registration rows / names.
--   • Everyone can still see the NUMBER of registered pairs (via an RPC).
--   • The partner picker still works (a separate RPC returns only the IDs that
--     are already taken — no names).
-- ============================================================================

-- 1. --------------------------------------- LOCK DOWN ROW VISIBILITY ---------
drop policy if exists "Registrations are viewable by everyone" on public.registrations;
drop policy if exists "Registrations are viewable by self or admin" on public.registrations;

create policy "Registrations are viewable by self or admin"
  on public.registrations
  for select
  to authenticated
  using (
    auth.uid() = player_id
    or auth.uid() = partner_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- 2. -------------------------------------- PUBLIC COUNT (no names) -----------
-- Number of registered pairs for a tournament. Updates the moment anyone
-- registers, even solo (a registration row exists with no partner yet).
create or replace function public.get_registration_count(p_tournament_id uuid)
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::int
  from public.registrations
  where tournament_id = p_tournament_id;
$$;

grant execute on function public.get_registration_count(uuid) to anon, authenticated;

-- 3. ------------------------------ TAKEN PLAYER IDS (for partner picker) -----
-- Just the UUIDs already in a pair, so the partner dropdown can exclude them
-- without exposing any names.
create or replace function public.get_taken_player_ids(p_tournament_id uuid)
returns table (player_id uuid)
language sql
security definer
set search_path = public
stable
as $$
  select player_id
  from public.registrations
  where tournament_id = p_tournament_id
  union
  select partner_id
  from public.registrations
  where tournament_id = p_tournament_id and partner_id is not null;
$$;

grant execute on function public.get_taken_player_ids(uuid) to authenticated;
