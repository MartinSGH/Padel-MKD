-- ============================================================================
-- Store player + partner names directly on each registration
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
-- Idempotent: safe to run again. Requires registrations_setup.sql first.
--
-- Why: registrations only held player_id / partner_id (UUIDs), so the names
-- couldn't be shown to logged-out visitors and were invisible in the Supabase
-- table editor. This denormalizes the names so they appear everywhere.
-- ============================================================================

-- 1. ------------------------------------------------------- NAME COLUMNS -----
alter table public.registrations
  add column if not exists player_name  text,
  add column if not exists partner_name text;

-- 2. ----------------------------------------------- AUTO-FILL ON INSERT ------
-- Every new registration copies the current names from the profiles table.
create or replace function public.set_registration_names()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.player_name is null then
    select full_name into new.player_name
    from public.profiles where id = new.player_id;
  end if;

  if new.partner_id is not null and new.partner_name is null then
    select full_name into new.partner_name
    from public.profiles where id = new.partner_id;
  end if;

  return new;
end;
$$;

drop trigger if exists registrations_set_names on public.registrations;
create trigger registrations_set_names
  before insert on public.registrations
  for each row execute function public.set_registration_names();

-- 3. ------------------------------------------------------- BACKFILL ---------
-- Fill names for registrations that already exist.
update public.registrations r
set player_name = p.full_name
from public.profiles p
where r.player_id = p.id and r.player_name is null;

update public.registrations r
set partner_name = p.full_name
from public.profiles p
where r.partner_id = p.id and r.partner_name is null;
