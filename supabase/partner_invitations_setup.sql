-- ============================================================================
-- Partner invitations + notifications
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
-- Idempotent: safe to run again. Requires registrations_setup.sql and
-- registrations_redesign_setup.sql.
--
-- Turns "adding a partner" into an INVITATION the other player must accept:
--   • registrations.partner_status : pending → accepted (or cleared on decline)
--   • a notifications table drives the navbar badge + toasts
--   • set_partner()             — invite / change / remove a partner (inviter)
--   • respond_to_partner_invite() — accept or decline (the invited player)
-- ============================================================================

-- 1. ------------------------------------------- PARTNER STATUS COLUMN --------
alter table public.registrations
  add column if not exists partner_status text; -- null | 'pending' | 'accepted'

-- Existing pairs predate invitations — treat them as already accepted so they
-- aren't suddenly shown as "pending".
update public.registrations
  set partner_status = 'accepted'
  where partner_id is not null and partner_status is null;

-- 2. ------------------------------- NAME + STATUS TRIGGER (INSERT/UPDATE) ----
-- Extends the existing name-sync trigger: whenever a partner is set or changed
-- the pairing goes back to 'pending' (server-side, so a client can't fake an
-- 'accepted' status). Removing the partner clears the status. An accept keeps
-- partner_id unchanged, so the status the caller sets ('accepted') is kept.
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
    new.partner_status := null;
  else
    if new.partner_name is null then
      select full_name into new.partner_name
      from public.profiles where id = new.partner_id;
    end if;
    -- A newly set / changed partner is always a pending invitation.
    if tg_op = 'INSERT' or new.partner_id is distinct from old.partner_id then
      new.partner_status := 'pending';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists registrations_set_names on public.registrations;
create trigger registrations_set_names
  before insert or update on public.registrations
  for each row execute function public.set_registration_names();

-- 3. ------------------------------------------------ NOTIFICATIONS TABLE -----
create table if not exists public.notifications (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade, -- recipient
  type            text not null,           -- 'partner_invite' | 'invite_declined' | 'invite_accepted'
  tournament_id   uuid references public.tournaments(id) on delete cascade,
  tournament_name text,
  registration_id uuid references public.registrations(id) on delete cascade,
  actor_id        uuid references public.profiles(id) on delete set null,
  actor_name      text,
  is_read         boolean not null default false,
  created_at      timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, is_read);

alter table public.notifications enable row level security;

-- A user can only read / update / delete their own notifications. Inserts only
-- happen through the SECURITY DEFINER functions below (which bypass RLS), so no
-- insert policy is granted to normal users.
drop policy if exists "Notifications are viewable by owner" on public.notifications;
create policy "Notifications are viewable by owner"
  on public.notifications for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Notifications updatable by owner" on public.notifications;
create policy "Notifications updatable by owner"
  on public.notifications for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Notifications deletable by owner" on public.notifications;
create policy "Notifications deletable by owner"
  on public.notifications for delete to authenticated
  using (auth.uid() = user_id);

-- 4. ----------------------------------------- SET / INVITE PARTNER (RPC) -----
-- Called by the inviter. Sets (or changes / removes) the partner on their own
-- registration and sends a 'partner_invite' notification to the new partner.
-- Any stale pending invite to a previous partner is cleaned up.
create or replace function public.set_partner(
  p_registration_id uuid,
  p_partner_id      uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reg     public.registrations%rowtype;
  v_tname   text;
  v_inviter text;
begin
  select * into v_reg from public.registrations where id = p_registration_id;
  if not found then
    raise exception 'Registration not found';
  end if;
  if v_reg.player_id <> auth.uid() then
    raise exception 'Not allowed';
  end if;

  -- Drop the pending invite sent to a previous (different) partner.
  if v_reg.partner_id is not null and v_reg.partner_id is distinct from p_partner_id then
    delete from public.notifications
      where registration_id = p_registration_id
        and type = 'partner_invite'
        and user_id = v_reg.partner_id;
  end if;

  update public.registrations
    set partner_id = p_partner_id
    where id = p_registration_id;

  if p_partner_id is not null and p_partner_id is distinct from v_reg.partner_id then
    select name into v_tname from public.tournaments where id = v_reg.tournament_id;
    select full_name into v_inviter from public.profiles where id = auth.uid();

    insert into public.notifications
      (user_id, type, tournament_id, tournament_name, registration_id, actor_id, actor_name)
    values
      (p_partner_id, 'partner_invite', v_reg.tournament_id, v_tname,
       p_registration_id, auth.uid(), v_inviter);
  end if;
end;
$$;

grant execute on function public.set_partner(uuid, uuid) to authenticated;

-- 5. ------------------------------------ RESPOND TO INVITE (RPC) -------------
-- Called by the invited player. Accept confirms the pair; decline frees the
-- inviter to invite someone else and notifies them.
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
  -- (as a player) in the same tournament.
  if p_accept and exists (
    select 1 from public.registrations r
    where r.tournament_id = v_reg.tournament_id
      and r.player_id = auth.uid()
  ) then
    raise exception 'You are already registered in this tournament';
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
