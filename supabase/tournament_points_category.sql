-- ============================================================================
-- Separate Men's and Women's Rank Lists (tournament_points.category)
-- Run once in Supabase Dashboard -> SQL -> New query. Idempotent, safe to re-run.
-- Run after tournament_points_setup.sql.
--
-- Each ranking-points row now records the category it was earned in
-- ("Men's pairs" / "Women's pairs" / "Mixed pairs"). The Rank List shows a
-- Men's list and a Women's list from it. A player who plays two categories in
-- one tournament gets one row per category. profiles.total_points is still the
-- sum of all of a player's rows (profile_points_sync.sql trigger, unchanged).
-- ============================================================================

begin;

-- 1. -------------------------------------------------------------- COLUMN ---
alter table public.tournament_points
  add column if not exists category text not null default '';

-- 2. --------------------------------------------------------- PRIMARY KEY ---
-- One row per (tournament, player, category) instead of per (tournament, player).
alter table public.tournament_points
  drop constraint if exists tournament_points_pkey;
alter table public.tournament_points
  add primary key (tournament_id, player_id, category);

-- 3. ------------------------------------------------------------ BACKFILL ---
-- Existing rows: take the category from the player's registration in that
-- tournament (as the registering player or as the partner).
update public.tournament_points tp
set category = r.category
from public.registrations r
where tp.category = ''
  and r.tournament_id = tp.tournament_id
  and (r.player_id = tp.player_id or r.partner_id = tp.player_id)
  and coalesce(r.category, '') <> '';

-- Anything still without a category (registrations from before categories
-- existed) was played in the men's draw.
update public.tournament_points
set category = 'Men''s pairs'
where category = '';

commit;

-- Verify: rows and points per tournament and category
-- select t.name, tp.category, count(*), sum(tp.points)
-- from public.tournament_points tp
-- join public.tournaments t on t.id = tp.tournament_id
-- group by t.name, tp.category
-- order by t.name, tp.category;
