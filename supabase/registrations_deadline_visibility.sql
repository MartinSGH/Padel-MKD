-- ============================================================================
-- Reveal the participant list once the registration deadline has passed
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
-- Idempotent: safe to run again. Requires registrations_privacy_setup.sql.
--
-- Rule: while registration is open, only admins (and the people in a pair, for
-- their own entry) can read the names. After the tournament's
-- registration_deadline passes, the list becomes readable by everyone.
-- ============================================================================

drop policy if exists "Registrations are viewable by self or admin" on public.registrations;
drop policy if exists "Registrations viewable after deadline or by self/admin" on public.registrations;

create policy "Registrations viewable after deadline or by self/admin"
  on public.registrations
  for select
  using (
    -- Registration deadline has passed → public to everyone.
    exists (
      select 1 from public.tournaments t
      where t.id = registrations.tournament_id
        and t.registration_deadline is not null
        and t.registration_deadline < current_date
    )
    -- Or the players in the pair (their own entry).
    or auth.uid() = player_id
    or auth.uid() = partner_id
    -- Or an admin.
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
