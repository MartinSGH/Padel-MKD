-- ============================================================================
-- Clubs feature setup
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
-- It is idempotent: safe to run again.
--
-- Creates:
--   1. public.clubs          table (the club directory)
--   2. Row Level Security    public read, admin-only write
--   3. storage bucket        "club-logos" (public) + admin-only write policies
--   4. Seed data             the 6 clubs currently hard-coded on the site
-- ============================================================================

-- 1. ----------------------------------------------------------------- TABLE --
create table if not exists public.clubs (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  address       text,
  hours         text,
  phone         text,
  email         text,
  logo_url      text,
  display_order integer not null default 0,
  created_at    timestamptz not null default now()
);

-- Keep the carousel/page in a stable, controllable order.
create index if not exists clubs_display_order_idx
  on public.clubs (display_order, created_at);

-- 2. ------------------------------------------------------------------- RLS --
alter table public.clubs enable row level security;

-- Anyone (including anonymous visitors) can read the club directory.
drop policy if exists "Clubs are viewable by everyone" on public.clubs;
create policy "Clubs are viewable by everyone"
  on public.clubs
  for select
  using (true);

-- Only admins may insert / update / delete clubs.
drop policy if exists "Admins can insert clubs" on public.clubs;
create policy "Admins can insert clubs"
  on public.clubs
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "Admins can update clubs" on public.clubs;
create policy "Admins can update clubs"
  on public.clubs
  for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "Admins can delete clubs" on public.clubs;
create policy "Admins can delete clubs"
  on public.clubs
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- 3. -------------------------------------------------------- STORAGE BUCKET --
-- Public bucket for club logos uploaded from the admin panel.
insert into storage.buckets (id, name, public)
values ('club-logos', 'club-logos', true)
on conflict (id) do update set public = true;

-- Public read of logo files.
drop policy if exists "Club logos are publicly readable" on storage.objects;
create policy "Club logos are publicly readable"
  on storage.objects
  for select
  using (bucket_id = 'club-logos');

-- Only admins can upload / overwrite / remove logo files.
drop policy if exists "Admins can upload club logos" on storage.objects;
create policy "Admins can upload club logos"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'club-logos'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "Admins can update club logos" on storage.objects;
create policy "Admins can update club logos"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'club-logos'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "Admins can delete club logos" on storage.objects;
create policy "Admins can delete club logos"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'club-logos'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- 4. ------------------------------------------------------------------ SEED --
-- The 6 clubs that were previously hard-coded in the carousel. Their logos stay
-- as the existing static files under /public/images/ClubsCardsImages.
-- Only inserts if the clubs table is empty, so re-running won't duplicate.
insert into public.clubs (name, address, hours, phone, email, logo_url, display_order)
select * from (values
  ('Mondo Padel',              'Ul. Ljubljanska br.4 Veles',        'Open from 10-6', '078 436 922', 'mondopadel1@gmail.com',      '/images/ClubsCardsImages/mondo.png',    1),
  ('Padel Pioneers',           'Ul. Industriska 1, Skopje',         'Open from 10-6', '078 657 744', 'pioneerspadel@gmail.com',    '/images/ClubsCardsImages/pioneer.png',  2),
  ('Pr1me Padel Club',         'Viktor Igo 39, Skopje',             'Open from 10-6', '071 248 750', 'pr1mepadel.mk@gmail.com',    '/images/ClubsCardsImages/prime.png',    3),
  ('Tikvesh Padel Club',       'Ohridska br.49, Kavadarci',         'Open from 10-6', '078 650 710', 'padeltikvesh@gmail.com',     '/images/ClubsCardsImages/tikvesh.png',  4),
  ('Smash Masters Padel Club', 'Bogomilska, Ohrid',                 'Open from 10-6', '076 801 829', 'smashmastersclub@yahoo.com', '/images/ClubsCardsImages/smash.png',    5),
  ('Padel Klub Kumanovo',      'Sport Event Centar-Kumanovo bb',    null,             '072 317 704', null,                         '/images/ClubsCardsImages/kumanovo.png', 6)
) as seed(name, address, hours, phone, email, logo_url, display_order)
where not exists (select 1 from public.clubs);
