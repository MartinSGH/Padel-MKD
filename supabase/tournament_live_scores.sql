-- ============================================================================
-- Live match scoreboard
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
-- Idempotent: safe to run again. Requires the tournaments table + the draw.
--
-- One row per bracket match that has been started, keyed POSITIONALLY to the
-- draw by (tournament_id, round, match_index). The admin scores it; everyone
-- else reads it live (Supabase Realtime). When a match finishes, its winner is
-- written back into tournaments.draw by the app so the bracket auto-advances.
--
--   round        0 = first round (round of N), 1 = next, …
--   match_index  index of the match within its round (0-based)
--   state        the full padel scoring state produced by src/lib/padelScore.js
--   status       not_started | live | finished
--   winner       'a' | 'b' (once finished)
-- ============================================================================

create table if not exists public.live_scores (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  round         int  not null,
  match_index   int  not null,
  team_a        text,
  team_b        text,
  config        jsonb,
  state         jsonb,
  status        text not null default 'not_started', -- not_started | live | finished
  winner        text,                                -- 'a' | 'b'
  started_at    timestamptz,
  ended_at      timestamptz,
  updated_at    timestamptz not null default now(),
  unique (tournament_id, round, match_index)
);

create index if not exists live_scores_tournament_idx
  on public.live_scores (tournament_id);
create index if not exists live_scores_status_idx
  on public.live_scores (status);

-- ----------------------------------------------------------------- RLS --
alter table public.live_scores enable row level security;

-- Everyone can watch the scores (public, read-only).
drop policy if exists "Live scores are viewable by everyone" on public.live_scores;
create policy "Live scores are viewable by everyone"
  on public.live_scores
  for select
  using (true);

-- Only admins can create / score / delete a live match.
drop policy if exists "Admins manage live scores" on public.live_scores;
create policy "Admins manage live scores"
  on public.live_scores
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

-- Keep updated_at fresh on every write (so pollers can detect changes too).
create or replace function public.live_scores_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists live_scores_touch on public.live_scores;
create trigger live_scores_touch
  before update on public.live_scores
  for each row execute function public.live_scores_touch();

-- ------------------------------------------------------------ REALTIME --
-- Broadcast row changes to subscribed clients. Safe if already added.
do $$
begin
  begin
    alter publication supabase_realtime add table public.live_scores;
  exception
    when duplicate_object then null;
    when undefined_object then null; -- publication doesn't exist on some setups
  end;
end $$;
