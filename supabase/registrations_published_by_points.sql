-- ============================================================================
-- Published list of pairs ordered by ranking points
-- Run once in Supabase Dashboard -> SQL -> New query. Idempotent, safe to re-run.
-- Run after tournament_pairs_publish.sql and tournament_points_category.sql.
--
-- get_published_pairs() now also returns each pair's combined ranking points
-- (pair_points) and lists the pairs highest points first within a category
-- (ties keep registration order). A player's points count the category the
-- pair entered for Men's / Women's pairs (the two Rank Lists); any other
-- category counts the player's total points. Guests without an account have 0.
-- The return type changes, so the old function is dropped first.
-- ============================================================================

drop function if exists public.get_published_pairs(uuid);

create or replace function public.get_published_pairs(p_tournament_id uuid)
returns table (player_name text, partner_name text, category text, pair_points int)
language sql
security definer
set search_path = public
stable
as $$
  select r.player_name, r.partner_name, r.category, pts.pair_points
  from public.registrations r
  join public.tournaments t on t.id = r.tournament_id
  cross join lateral (
    select coalesce(sum(tp.points), 0)::int as pair_points
    from public.tournament_points tp
    where tp.player_id in (r.player_id, r.partner_id)
      and (
        coalesce(r.category, '') not in ('Men''s pairs', 'Women''s pairs')
        or tp.category = r.category
      )
  ) pts
  where r.tournament_id = p_tournament_id
    and t.pairs_published = true
    and r.partner_status = 'accepted'
    and (r.partner_id is not null or r.partner_name is not null)
  order by r.category nulls last, pts.pair_points desc, r.created_at;
$$;

grant execute on function public.get_published_pairs(uuid) to anon, authenticated;
