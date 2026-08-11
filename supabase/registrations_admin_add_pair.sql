-- ============================================================================
-- Admin: manually add a pair (with account players and/or guests)
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
-- Idempotent: safe to run again. Requires the earlier registrations migrations.
--
-- Lets an ADMIN add a confirmed pair directly to a tournament. Either side of
-- the pair may be:
--   • an existing account player (player_id set, name resolved from profile), or
--   • a "guest" with no account (id null, a typed Name Last Name kept as-is).
--
-- Changes:
--   1. registrations.player_id becomes NULLABLE so a guest can be the main
--      player too (partner_id was already nullable).
--   2. The name/status trigger is rewritten so an explicitly-typed guest name is
--      PRESERVED (the old trigger blanked partner_name whenever partner_id was
--      null). Existing account flows are unchanged.
--   3. admin_add_pair() — SECURITY DEFINER RPC that inserts the confirmed pair,
--      cleaning up any leftover solo/pending rows for the chosen account players
--      so nobody ends up listed twice.
-- ============================================================================

-- 1. --------------------------------------------- PLAYER_ID NULLABLE ---------
alter table public.registrations
  alter column player_id drop not null;

-- 2. ------------------------------- NAME + STATUS TRIGGER (guest-aware) ------
-- Resolves account names from profiles, keeps guest names as typed, and manages
-- partner_status exactly as before for the account invite flow:
--   • INSERT with an account partner + no status  → 'pending'
--   • partner changed (by id) on UPDATE           → re-resolve name, 'pending'
--   • partner removed (id → null) on UPDATE       → clear name + status
--   • a guest partner (id null, name given)       → name + status kept as passed
create or replace function public.set_registration_names()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Player name: resolve from the profile only when we have an id and no name.
  if new.player_id is not null and new.player_name is null then
    select full_name into new.player_name
    from public.profiles where id = new.player_id;
  end if;

  -- Partner identity changed *by account id* on an UPDATE.
  if tg_op = 'UPDATE' and new.partner_id is distinct from old.partner_id then
    if new.partner_id is null then
      -- Partner removed (decline / clear).
      new.partner_name := null;
      new.partner_status := null;
    else
      -- New / changed account partner → re-resolve name, pending invite.
      new.partner_name := null;
      new.partner_status := 'pending';
    end if;
  end if;

  -- Partner name: resolve from the profile only when we have an id and no name.
  if new.partner_id is not null and new.partner_name is null then
    select full_name into new.partner_name
    from public.profiles where id = new.partner_id;
  end if;

  -- On INSERT, an account partner with no explicit status is a pending invite.
  -- (Guests / admin-added pairs pass their own status and keep it.)
  if tg_op = 'INSERT'
     and new.partner_id is not null
     and new.partner_status is null then
    new.partner_status := 'pending';
  end if;

  return new;
end;
$$;

drop trigger if exists registrations_set_names on public.registrations;
create trigger registrations_set_names
  before insert or update on public.registrations
  for each row execute function public.set_registration_names();

-- 3. ------------------------------------------------ ADMIN ADD PAIR ----------
-- Inserts a confirmed pair. Each side is either an account id OR a typed name.
create or replace function public.admin_add_pair(
  p_tournament_id uuid,
  p_category      text,
  p_player_id     uuid,
  p_player_name   text,
  p_partner_id    uuid,
  p_partner_name  text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  -- Admin only.
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  ) then
    raise exception 'Admin only';
  end if;

  -- Each side needs either an account id or a typed name.
  if p_player_id is null and coalesce(btrim(p_player_name), '') = '' then
    raise exception 'A player (account or name) is required';
  end if;
  if p_partner_id is null and coalesce(btrim(p_partner_name), '') = '' then
    raise exception 'A partner (account or name) is required';
  end if;
  if p_player_id is not null and p_player_id = p_partner_id then
    raise exception 'A player cannot be their own partner';
  end if;

  -- Neither account player may already be in a CONFIRMED pair in this category.
  if p_player_id is not null and exists (
    select 1 from public.registrations r
    where r.tournament_id = p_tournament_id
      and r.category is not distinct from p_category
      and r.partner_status = 'accepted'
      and (r.player_id = p_player_id or r.partner_id = p_player_id)
  ) then
    raise exception 'That player is already in a pair in this category';
  end if;
  if p_partner_id is not null and exists (
    select 1 from public.registrations r
    where r.tournament_id = p_tournament_id
      and r.category is not distinct from p_category
      and r.partner_status = 'accepted'
      and (r.player_id = p_partner_id or r.partner_id = p_partner_id)
  ) then
    raise exception 'That partner is already in a pair in this category';
  end if;

  -- Clear any leftover solo / pending rows for the chosen account players in
  -- this category so they aren't listed twice (cascade cleans notifications).
  delete from public.registrations r
  where r.tournament_id = p_tournament_id
    and r.category is not distinct from p_category
    and (
      (p_player_id  is not null and (r.player_id = p_player_id  or r.partner_id = p_player_id))
      or
      (p_partner_id is not null and (r.player_id = p_partner_id or r.partner_id = p_partner_id))
    );

  insert into public.registrations
    (tournament_id, player_id, player_name, partner_id, partner_name,
     category, partner_status, status)
  values
    (p_tournament_id,
     p_player_id,  nullif(btrim(p_player_name), ''),
     p_partner_id, nullif(btrim(p_partner_name), ''),
     p_category, 'accepted', 'registered')
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function
  public.admin_add_pair(uuid, text, uuid, text, uuid, text)
  to authenticated;
