-- ============================================================================
-- Registration redesign: readable player list + partner can be added later
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
-- Idempotent: safe to run again. Requires the earlier registrations migrations.
-- ============================================================================

-- 1. ------------------------------------------------ PLAYER LIST (RPC) -------
-- A SECURITY DEFINER function so EVERY logged-in user (not just admins) can
-- read the list of players for the partner picker. It bypasses the profiles
-- row-level security but only returns safe, names-only columns.
create or replace function public.get_players()
returns table (id uuid, full_name text, sex text, avatar_url text)
language sql
security definer
set search_path = public
stable
as $$
  select id, full_name, sex, avatar_url
  from public.profiles
  order by full_name nulls last;
$$;

grant execute on function public.get_players() to anon, authenticated;

-- 2. ------------------------------- NAME TRIGGER (INSERT *and* UPDATE) -------
-- Keeps player_name / partner_name in sync, including when a partner is added,
-- changed or removed after the initial (solo) registration.
create or replace function public.set_registration_names()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Player name (set once, on insert).
  if new.player_name is null then
    select full_name into new.player_name
    from public.profiles where id = new.player_id;
  end if;

  -- When the partner changes, force the name to be re-resolved below.
  if tg_op = 'UPDATE' and new.partner_id is distinct from old.partner_id then
    new.partner_name := null;
  end if;

  if new.partner_id is null then
    new.partner_name := null;
  elsif new.partner_name is null then
    select full_name into new.partner_name
    from public.profiles where id = new.partner_id;
  end if;

  return new;
end;
$$;

drop trigger if exists registrations_set_names on public.registrations;
create trigger registrations_set_names
  before insert or update on public.registrations
  for each row execute function public.set_registration_names();
