-- ============================================================================
-- Mirror each player's Rank List total onto their profile (profiles.total_points)
-- Run once in Supabase Dashboard -> SQL -> New query. Idempotent, safe to re-run.
-- Run after profiles_edit_setup.sql and tournament_points_setup.sql.
--
-- profiles.total_points is kept equal to SUM(tournament_points.points) for that
-- player, automatically, whenever ranking points change (admin OR referee). It
-- is shown on the profile page and drives the Admin players list ordering.
-- ============================================================================

-- 1. ---------------------------------------------------------------- GUARD ---
-- Re-define the privileged-field guard so it still blocks a normal user from
-- editing role / total_points by hand, but LETS the automatic points sync below
-- through (it sets app.sync_points = '1' for the duration of its own UPDATE).
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
  return new;
end;
$$;

-- 2. ------------------------------------------------------ SYNC FUNCTION -----
-- Recompute one player's stored total from tournament_points and write it to
-- their profile. Runs as owner (bypasses RLS) and flags the update as a sync so
-- the guard above allows the total_points change no matter who triggered it.
create or replace function public.sync_player_total_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pid   uuid := coalesce(new.player_id, old.player_id);
  total int;
begin
  select coalesce(sum(points), 0) into total
    from public.tournament_points
    where player_id = pid;

  perform set_config('app.sync_points', '1', true);
  update public.profiles set total_points = total where id = pid;
  perform set_config('app.sync_points', '0', true);

  return null;
end;
$$;

drop trigger if exists sync_total_points on public.tournament_points;
create trigger sync_total_points
  after insert or update or delete on public.tournament_points
  for each row execute function public.sync_player_total_points();

-- 3. ---------------------------------------------------------- BACKFILL ------
-- Set every profile's total_points from the current ranking (0 when a player
-- has no points yet). This runs in the SQL editor (auth.uid() is null), so the
-- guard allows it.
update public.profiles p
set total_points = coalesce(
  (select sum(tp.points) from public.tournament_points tp where tp.player_id = p.id),
  0
);
