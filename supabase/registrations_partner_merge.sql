-- ============================================================================
-- Partner merge + public pairings list
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
-- Idempotent: safe to run again. Requires the earlier registrations migrations
-- (including registrations_multi_category.sql).
--
-- Changes:
--   1. get_taken_player_ids  — a player is only "taken" once they're in a
--      CONFIRMED (accepted) pair. Solo / pending players stay pickable so two
--      people who registered separately can still connect.
--   2. respond_to_partner_invite — accepting an invite MERGES the two entries:
--      the accepter's own separate registration in that category is deleted, so
--      the pair lives under a single row (no more duplicates in lists / draws).
--   3. One-time cleanup of leftover solo rows that predate the merge behaviour.
--   4. Registrations become readable by EVERYONE (full pairings list, all
--      categories, regardless of the deadline).
-- ============================================================================

-- 1. ------------------------------ TAKEN PLAYER IDS (accepted pairs only) ----
-- Only players locked in a confirmed pair are unavailable. Someone who
-- registered solo (or has only a pending invite) can still be chosen as a
-- partner. Return signature is unchanged from the multi-category migration.
create or replace function public.get_taken_player_ids(p_tournament_id uuid)
returns table (player_id uuid, category text)
language sql
security definer
set search_path = public
stable
as $$
  select player_id, category
  from public.registrations
  where tournament_id = p_tournament_id
    and partner_id is not null
    and partner_status = 'accepted'
  union
  select partner_id, category
  from public.registrations
  where tournament_id = p_tournament_id
    and partner_id is not null
    and partner_status = 'accepted';
$$;

grant execute on function public.get_taken_player_ids(uuid) to authenticated;

-- 2. ---------------------------------- RESPOND TO INVITE (merge on accept) ---
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
  v_reg       public.registrations%rowtype;
  v_tname     text;
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

  -- Block only if you are ALREADY in a confirmed pair in this category — you
  -- can't be in two accepted pairs at once. A separate SOLO registration is
  -- fine; it gets merged away below.
  if p_accept and exists (
    select 1 from public.registrations r
    where r.tournament_id = v_reg.tournament_id
      and r.category is not distinct from v_reg.category
      and r.id <> p_registration_id
      and (
        (r.player_id = auth.uid()
           and r.partner_id is not null
           and r.partner_status = 'accepted')
        or (r.partner_id = auth.uid() and r.partner_status = 'accepted')
      )
  ) then
    raise exception 'You are already in a pair in this category';
  end if;

  -- Clear the invite notification for the responder.
  update public.notifications
    set is_read = true
    where registration_id = p_registration_id
      and type = 'partner_invite'
      and user_id = auth.uid();

  if p_accept then
    -- MERGE: drop the responder's own separate registration(s) in this
    -- category so the pair lives under one row. Cascade removes any
    -- notifications tied to those rows (e.g. a stale invite they had sent out).
    delete from public.registrations r
    where r.tournament_id = v_reg.tournament_id
      and r.player_id = auth.uid()
      and r.category is not distinct from v_reg.category
      and r.id <> p_registration_id;

    update public.registrations
      set partner_status = 'accepted'
      where id = p_registration_id;
  else
    select name into v_tname from public.tournaments where id = v_reg.tournament_id;
    select full_name into v_responder from public.profiles where id = auth.uid();

    -- Free the inviter (trigger clears partner_status / name).
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

-- 3. -------------------------------------- CLEAN UP LEFTOVER SOLO ROWS -------
-- Pairs formed before the merge behaviour left the accepted partner's own solo
-- row behind, so that player shows up twice (once in their pair, once solo).
-- Remove those orphaned solo rows.
delete from public.registrations solo
where solo.partner_id is null
  and exists (
    select 1 from public.registrations paired
    where paired.tournament_id = solo.tournament_id
      and paired.category is not distinct from solo.category
      and paired.partner_status = 'accepted'
      and paired.partner_id = solo.player_id
  );

-- 4. ------------------------------------ PAIRINGS LIST IS ADMIN-ONLY --------
-- The full list of pairs is visible to admins only. A player can still read
-- their OWN entry (as player or partner) so their registration cards work, but
-- they can't browse everyone else's pairings. (The partner picker is powered by
-- SECURITY DEFINER functions that bypass RLS, so it is unaffected.)
drop policy if exists "Registrations viewable after deadline or by self/admin" on public.registrations;
drop policy if exists "Registrations are viewable by everyone" on public.registrations;
drop policy if exists "Registrations are viewable by self or admin" on public.registrations;

create policy "Registrations are viewable by self or admin"
  on public.registrations
  for select
  to authenticated
  using (
    auth.uid() = player_id
    or auth.uid() = partner_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
