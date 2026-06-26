-- ============================================================================
-- Tournaments feature setup
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
-- It is idempotent: safe to run again.
--
-- Creates:
--   1. public.tournaments   table (the tournament calendar)
--   2. Row Level Security   public read, admin-only write
--   3. Seed data            the real National Championship 2026 (the only one
--                           that currently has a real info modal)
-- ============================================================================

-- 1. ----------------------------------------------------------------- TABLE --
create table if not exists public.tournaments (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  code                  text,              -- optional ID code, e.g. "NPC-2026"
  type                  text,              -- Championship / League / Tournament …
  category              text,              -- Open / Juniors / Women / Veterans …
  location              text,
  start_date            date,
  end_date              date,
  status                text not null default 'active', -- active | postponed | cancelled
  registration_url      text,
  registration_deadline date,
  format                text,
  competitors           text,
  prizes                text,
  qualifications        text,
  result                text,
  description           text,
  detail_url            text,              -- optional custom page (e.g. /national-championship-2026)
  display_order         integer not null default 0,
  created_at            timestamptz not null default now()
);

create index if not exists tournaments_start_date_idx
  on public.tournaments (start_date);
create index if not exists tournaments_display_order_idx
  on public.tournaments (display_order, start_date);

-- 2. ------------------------------------------------------------------- RLS --
alter table public.tournaments enable row level security;

drop policy if exists "Tournaments are viewable by everyone" on public.tournaments;
create policy "Tournaments are viewable by everyone"
  on public.tournaments
  for select
  using (true);

drop policy if exists "Admins can insert tournaments" on public.tournaments;
create policy "Admins can insert tournaments"
  on public.tournaments
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "Admins can update tournaments" on public.tournaments;
create policy "Admins can update tournaments"
  on public.tournaments
  for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "Admins can delete tournaments" on public.tournaments;
create policy "Admins can delete tournaments"
  on public.tournaments
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- 3. ------------------------------------------------------------------ SEED --
-- Only the real tournament. Its "details" link points to the existing rich
-- championship page. Only inserts when the table is empty so re-running is safe.
insert into public.tournaments (
  name, code, type, category, location, start_date, end_date, status,
  registration_url, registration_deadline, format, competitors, prizes,
  description, detail_url, display_order
)
select
  'Open National Padel Championship 2026',
  'NPC-2026',
  'Championship',
  'Open',
  'MM Sport, Kumanovo',
  date '2026-07-04',
  date '2026-07-05',
  'active',
  'https://forms.gle/zWTQLv1DRfEFdfaA7',
  date '2026-06-28',
  'Men''s pairs / Women''s pairs / Mixed pairs',
  'Open to all registered pairs (min. 16 years)',
  'Trophy + medals + official MPF diploma; cash prizes above 30 pairs',
  'The first Open National Padel Championship organized by the Padel Federation of Macedonia, with technical organization by Padel Club Kumanovo.',
  '/national-championship-2026',
  1
where not exists (select 1 from public.tournaments);
