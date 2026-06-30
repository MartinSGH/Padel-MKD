-- ============================================================================
-- Hide admin accounts from the player directory / partner picker
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
-- Idempotent: safe to run again. Requires registrations_redesign_setup.sql.
--
-- Admins can still see everything and register themselves, but they must not
-- appear in the "choose partner" dropdown or any public list of players. The
-- partner picker is populated by get_players(), so we filter admins out here.
-- Registration rows store player_name / partner_name directly, so an admin who
-- does register still shows up correctly on the participant list.
-- ============================================================================

create or replace function public.get_players()
returns table (id uuid, full_name text, sex text, avatar_url text)
language sql
security definer
set search_path = public
stable
as $$
  select id, full_name, sex, avatar_url
  from public.profiles
  where coalesce(role, '') <> 'admin'
  order by full_name nulls last;
$$;

grant execute on function public.get_players() to anon, authenticated;
