-- ============================================================================
-- Ranking points
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
-- Idempotent: safe to run again. Requires tournaments + profiles.
--
-- Every finished match awards ranking points to BOTH players of the winning
-- pair (and, for the final / 3rd-place match, to both sides). The app recomputes
-- a tournament's whole points table from its finished matches whenever a result
-- changes, then writes the rows here. player_name is denormalised so the public
-- Rank List can be read without exposing the profiles table.
--
--   Points per win (cumulative):
--     First stage 5 · Round of 16 15 · Quarterfinal 30
--     Semifinal 0 (no direct points) · 3rd-place match 50
--     Final: winner 100, runner-up 70
-- ============================================================================

create table if not exists public.tournament_points (
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  player_id     uuid not null references public.profiles(id)    on delete cascade,
  player_name   text,
  points        int  not null default 0,
  updated_at    timestamptz not null default now(),
  primary key (tournament_id, player_id)
);

create index if not exists tournament_points_player_idx
  on public.tournament_points (player_id);

alter table public.tournament_points enable row level security;

-- Everyone can read the ranking (public list).
drop policy if exists "Ranking points are viewable by everyone" on public.tournament_points;
create policy "Ranking points are viewable by everyone"
  on public.tournament_points
  for select
  using (true);

-- Only admins can write them (the app recomputes + upserts).
drop policy if exists "Admins manage ranking points" on public.tournament_points;
create policy "Admins manage ranking points"
  on public.tournament_points
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
