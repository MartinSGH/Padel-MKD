-- ============================================================================
-- Admin rescue: manually confirm / pair "disqualified" players after deadline
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
-- Idempotent: safe to run again. Requires the earlier registrations migrations.
--
-- After the registration deadline, a solo player or a pair whose partner never
-- accepted is "disqualified" (hidden from the public list, but NOT deleted).
-- This function lets an ADMIN rescue such an entry — confirm the pending pair,
-- or assign a partner to a solo player — bypassing the normal deadline / invite
-- flow. It also merges away the partner's own leftover registration so nobody
-- ends up listed twice.
-- ============================================================================

create or replace function public.admin_set_pair(
  p_registration_id uuid,
  p_partner_id      uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reg public.registrations%rowtype;
begin
  -- Admin only.
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  ) then
    raise exception 'Admin only';
  end if;

  select * into v_reg from public.registrations where id = p_registration_id;
  if not found then
    raise exception 'Registration not found';
  end if;
  if p_partner_id is null then
    raise exception 'A partner is required to confirm a pair';
  end if;
  if p_partner_id = v_reg.player_id then
    raise exception 'A player cannot be their own partner';
  end if;

  -- The chosen partner must not already be in a CONFIRMED pair in this category.
  if exists (
    select 1 from public.registrations r
    where r.tournament_id = v_reg.tournament_id
      and r.category is not distinct from v_reg.category
      and r.id <> p_registration_id
      and r.partner_status = 'accepted'
      and (r.player_id = p_partner_id or r.partner_id = p_partner_id)
  ) then
    raise exception 'That player is already in a pair in this category';
  end if;

  -- Set the partner (the name/status trigger flips status to pending if the
  -- partner changed) …
  update public.registrations
    set partner_id = p_partner_id
    where id = p_registration_id;
  -- … then force-confirm the pairing.
  update public.registrations
    set partner_status = 'accepted'
    where id = p_registration_id;

  -- Merge away the partner's own separate registration(s) in this category so
  -- they aren't listed twice (cascade cleans up any related notifications).
  delete from public.registrations r
    where r.tournament_id = v_reg.tournament_id
      and r.player_id = p_partner_id
      and r.category is not distinct from v_reg.category
      and r.id <> p_registration_id;
end;
$$;

grant execute on function public.admin_set_pair(uuid, uuid) to authenticated;
