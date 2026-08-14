-- ============================================================================
-- Referee role
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
-- Idempotent: safe to run again. Requires the live_scores, tournament_points
-- and registrations migrations.
--
-- A referee can ONLY run matches on the tournament draw — start, score and end
-- them. Nothing else. Referees are hidden from every player / user list.
--
-- After you create the two referee accounts (see the note at the bottom), mark
-- them as referees:
--   update public.profiles set role = 'referee'
--   where full_name in ('Referee 1', 'Referee 2');
-- ============================================================================

-- 1. ---------------------------------------- HIDE REFEREES FROM PLAYER LIST ---
-- The names-only player directory (partner pickers, participant lists, …) now
-- excludes admins AND referees.
create or replace function public.get_players()
returns table (id uuid, full_name text, sex text, avatar_url text)
language sql
security definer
set search_path = public
stable
as $$
  select id, full_name, sex, avatar_url
  from public.profiles
  where coalesce(role, '') not in ('admin', 'referee')
  order by full_name nulls last;
$$;

grant execute on function public.get_players() to anon, authenticated;

-- 2. ------------------------------------ LIVE SCORES: admins AND referees -----
drop policy if exists "Admins manage live scores" on public.live_scores;
drop policy if exists "Admins and referees manage live scores" on public.live_scores;
create policy "Admins and referees manage live scores"
  on public.live_scores
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'referee')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'referee')
    )
  );

-- 3. ------------------------------- RANKING POINTS: admins AND referees -------
-- (finishing a match recomputes the points, so the referee's client writes them)
drop policy if exists "Admins manage ranking points" on public.tournament_points;
drop policy if exists "Admins and referees manage ranking points" on public.tournament_points;
create policy "Admins and referees manage ranking points"
  on public.tournament_points
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'referee')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'referee')
    )
  );

-- 4. ----------------------- REGISTRATIONS: referees may read (for points) -----
-- Referees need the pairings to credit points when a match finishes. Read-only.
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
      where p.id = auth.uid() and p.role in ('admin', 'referee')
    )
  );

-- 5. ------------------- DRAW WRITE (auto-advance) FOR ADMIN OR REFEREE --------
-- Finishing a match advances the winner in tournaments.draw. Referees can't
-- update tournaments directly, so this SECURITY DEFINER function updates ONLY
-- the draw column and is the single write path the match flow uses.
create or replace function public.set_tournament_draw(
  p_tournament_id uuid,
  p_draw          jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'referee')
  ) then
    raise exception 'Admin or referee only';
  end if;
  update public.tournaments set draw = p_draw where id = p_tournament_id;
end;
$$;

grant execute on function public.set_tournament_draw(uuid, jsonb) to authenticated;
