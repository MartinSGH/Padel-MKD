-- ============================================================================
-- Tournament registrations + partner selection
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
-- Idempotent: safe to run again. Requires the tournaments + profiles tables.
--
-- Creates:
--   1. public.registrations   one row = a pair (player + partner) in a tournament
--   2. Row Level Security     public read, players register themselves
--   3. public.player_directory  a safe (names-only) view of players, used to
--                               populate the partner picker
-- ============================================================================

-- 1. ----------------------------------------------------------------- TABLE --
create table if not exists public.registrations (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  player_id     uuid not null references public.profiles(id)    on delete cascade,
  partner_id    uuid references public.profiles(id)             on delete set null,
  category      text,
  status        text not null default 'registered', -- registered | withdrawn
  created_at    timestamptz not null default now(),
  -- a player can register only once per tournament
  unique (tournament_id, player_id)
);

create index if not exists registrations_tournament_idx
  on public.registrations (tournament_id);
create index if not exists registrations_partner_idx
  on public.registrations (partner_id);

-- 2. ------------------------------------------------------------------- RLS --
alter table public.registrations enable row level security;

-- Anyone can see who is registered (the participant list is public).
drop policy if exists "Registrations are viewable by everyone" on public.registrations;
create policy "Registrations are viewable by everyone"
  on public.registrations
  for select
  using (true);

-- A logged-in user registers themselves (player_id must be their own id).
drop policy if exists "Users can register themselves" on public.registrations;
create policy "Users can register themselves"
  on public.registrations
  for insert
  to authenticated
  with check (auth.uid() = player_id);

-- The registrant (or an admin) can update their registration.
drop policy if exists "Users or admins can update registration" on public.registrations;
create policy "Users or admins can update registration"
  on public.registrations
  for update
  to authenticated
  using (
    auth.uid() = player_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- The registrant (or an admin) can withdraw / delete the registration.
drop policy if exists "Users or admins can delete registration" on public.registrations;
create policy "Users or admins can delete registration"
  on public.registrations
  for delete
  to authenticated
  using (
    auth.uid() = player_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- 3. -------------------------------------------------- PLAYER DIRECTORY ------
-- A names-only view so the partner picker (and participant list) can read the
-- list of players without exposing private profile data (email, birth date…).
create or replace view public.player_directory as
  select id, full_name, sex, avatar_url
  from public.profiles;

grant select on public.player_directory to anon, authenticated;
