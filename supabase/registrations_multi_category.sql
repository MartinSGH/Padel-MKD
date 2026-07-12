-- ============================================================================
-- Multi-category registrations
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
-- Idempotent: safe to run again. Requires the earlier registrations migrations
-- (registrations_setup.sql, registrations_privacy_setup.sql,
--  partner_invitations_setup.sql).
--
-- Lets a player enter MORE THAN ONE category in the same tournament — e.g. a man
-- in both "Men's pairs" (with a male partner) and "Mixed pairs" (with a female
-- partner). Each category is a separate registration row with its own partner.
--
-- Changes:
--   1. tournaments.categories  — which categories a tournament offers
--   2. registrations unique key — one row per (tournament, player, CATEGORY)
--   3. get_taken_player_ids     — now returns (player_id, category) so the
--                                 partner picker can exclude people per-category
--   4. respond_to_partner_invite — the "already registered" guard is scoped to
--                                 the invitation's category
-- ============================================================================

-- 1. ---------------------------------- TOURNAMENT CATEGORIES (admin picks) ---
-- The list of categories players may register for. NULL / empty means "all
-- three" so existing tournaments keep working unchanged.
alter table public.tournaments
  add column if not exists categories text[];

-- 2. ---------------------------------------------- PER-CATEGORY UNIQUENESS ---
-- Drop the old "one registration per tournament" rule and replace it with
-- "one registration per category per tournament".
alter table public.registrations
  drop constraint if exists registrations_tournament_id_player_id_key;

drop index if exists registrations_tournament_player_category_key;
create unique index registrations_tournament_player_category_key
  on public.registrations (tournament_id, player_id, category);

-- 3. ------------------------------ TAKEN PLAYER IDS (per category) -----------
-- Returns the UUIDs already in a pair together WITH the category they're taken
-- in, so a player taken in "Men's pairs" can still be picked in "Mixed pairs".
-- Still names-only (privacy preserved). Return signature changed, so the old
-- function must be dropped first.
drop function if exists public.get_taken_player_ids(uuid);

create function public.get_taken_player_ids(p_tournament_id uuid)
returns table (player_id uuid, category text)
language sql
security definer
set search_path = public
stable
as $$
  select player_id, category
  from public.registrations
  where tournament_id = p_tournament_id
  union
  select partner_id, category
  from public.registrations
  where tournament_id = p_tournament_id and partner_id is not null;
$$;

grant execute on function public.get_taken_player_ids(uuid) to authenticated;

-- 4. ------------------------------------ RESPOND TO INVITE (per category) ----
-- Same as partner_invitations_setup.sql, except the "you already registered
-- yourself" guard only blocks a clash WITHIN THE SAME CATEGORY.
create or replace function public.respond_to_partner_invite(
  p_registration_id uuid,
  p_accept          boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reg      public.registrations%rowtype;
  v_tname    text;
  v_responder text;
begin
  select * into v_reg from public.registrations where id = p_registration_id;
  if not found then
    raise exception 'Invitation not found';
  end if;
  if v_reg.partner_id <> auth.uid() or coalesce(v_reg.partner_status, '') <> 'pending' then
    raise exception 'No pending invitation for you on this registration';
  end if;

  -- Can't respond once the registration deadline has passed.
  if p_accept and exists (
    select 1 from public.tournaments t
    where t.id = v_reg.tournament_id
      and t.registration_deadline is not null
      and t.registration_deadline < current_date
  ) then
    raise exception 'Registration has closed for this tournament';
  end if;

  -- Prevent double-booking: can't accept if you already registered yourself
  -- (as a player) in the SAME category of this tournament.
  if p_accept and exists (
    select 1 from public.registrations r
    where r.tournament_id = v_reg.tournament_id
      and r.player_id = auth.uid()
      and r.category is not distinct from v_reg.category
  ) then
    raise exception 'You are already registered in this category';
  end if;

  -- Clear the invite notification for the responder.
  update public.notifications
    set is_read = true
    where registration_id = p_registration_id
      and type = 'partner_invite'
      and user_id = auth.uid();

  if p_accept then
    update public.registrations
      set partner_status = 'accepted'
      where id = p_registration_id;
  else
    select name into v_tname from public.tournaments where id = v_reg.tournament_id;
    select full_name into v_responder from public.profiles where id = auth.uid();

    -- Free the inviter (trigger clears partner_status/name).
    update public.registrations
      set partner_id = null
      where id = p_registration_id;

    insert into public.notifications
      (user_id, type, tournament_id, tournament_name, registration_id, actor_id, actor_name)
    values
      (v_reg.player_id, 'invite_declined', v_reg.tournament_id, v_tname,
       p_registration_id, auth.uid(), v_responder);
  end if;
end;
$$;

grant execute on function public.respond_to_partner_invite(uuid, boolean) to authenticated;
