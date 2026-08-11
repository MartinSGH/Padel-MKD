-- ============================================================================
-- Publish the list of pairs to everyone (admin-controlled)
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
-- Idempotent: safe to run again. Requires the earlier registrations migrations.
--
-- The full pairings list is normally admin-only (see
-- registrations_partner_merge.sql). This lets an admin flip a switch so ALL
-- visitors can see the confirmed pairs of a tournament — names + category only,
-- and only the confirmed pairs (solo / pending entries stay hidden). The admin
-- can turn it back off at any time and the list goes private again.
--
-- Changes:
--   1. tournaments.pairs_published  — the public on/off switch (default off).
--   2. get_published_pairs()        — SECURITY DEFINER RPC returning the
--      confirmed pairs (names only) ONLY while pairs_published is true.
-- ============================================================================

-- 1. --------------------------------------------- PUBLISH FLAG ---------------
alter table public.tournaments
  add column if not exists pairs_published boolean not null default false;

-- 2. ------------------------------------------ PUBLIC PAIRS (RPC) ------------
-- Names-only, confirmed pairs only, and only when the tournament's list has
-- been published. Readable by everyone (anon + authenticated). Bypasses the
-- registrations row-level security via SECURITY DEFINER but never exposes more
-- than the two names + the category.
create or replace function public.get_published_pairs(p_tournament_id uuid)
returns table (player_name text, partner_name text, category text)
language sql
security definer
set search_path = public
stable
as $$
  select r.player_name, r.partner_name, r.category
  from public.registrations r
  join public.tournaments t on t.id = r.tournament_id
  where r.tournament_id = p_tournament_id
    and t.pairs_published = true
    and r.partner_status = 'accepted'
    and (r.partner_id is not null or r.partner_name is not null)
  order by r.category nulls last, r.created_at;
$$;

grant execute on function public.get_published_pairs(uuid) to anon, authenticated;
