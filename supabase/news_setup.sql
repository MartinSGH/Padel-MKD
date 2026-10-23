-- ============================================================================
-- News articles feature setup
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
-- Idempotent: safe to run again.
--
-- Creates:
--   1. public.news         articles written in the Admin panel (rich text HTML)
--   2. Row Level Security  public read of published news, admin-only write
--   3. Storage bucket      news-files (images + attachments, public read)
--   4. Seed data           the 4 news that used to be hard-coded on /news
-- ============================================================================

-- 1. ----------------------------------------------------------------- TABLE --
create table if not exists public.news (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,          -- URL segment for /all-news/:slug
  title_en      text not null,
  title_mk      text,
  content_en    text,                           -- HTML from the admin editor
  content_mk    text,                           -- falls back to content_en
  cover_url     text,                           -- court square / card image
  external_url  text,                           -- set → card opens this link instead
  published     boolean not null default true,
  published_at  timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists news_published_at_idx
  on public.news (published, published_at desc);

-- 2. ------------------------------------------------------------------- RLS --
alter table public.news enable row level security;

-- Everyone sees published news; admins also see drafts.
drop policy if exists "Published news are viewable by everyone" on public.news;
create policy "Published news are viewable by everyone"
  on public.news for select
  using (
    published = true
    or exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "Admins can insert news" on public.news;
create policy "Admins can insert news"
  on public.news for insert to authenticated
  with check (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

drop policy if exists "Admins can update news" on public.news;
create policy "Admins can update news"
  on public.news for update to authenticated
  using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

drop policy if exists "Admins can delete news" on public.news;
create policy "Admins can delete news"
  on public.news for delete to authenticated
  using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

-- 3. -------------------------------------------------------- STORAGE BUCKET --
insert into storage.buckets (id, name, public)
values ('news-files', 'news-files', true)
on conflict (id) do update set public = true;

drop policy if exists "News files are publicly readable" on storage.objects;
create policy "News files are publicly readable"
  on storage.objects for select using (bucket_id = 'news-files');

drop policy if exists "Admins can upload news files" on storage.objects;
create policy "Admins can upload news files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'news-files'
    and exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "Admins can update news files" on storage.objects;
create policy "Admins can update news files"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'news-files'
    and exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "Admins can delete news files" on storage.objects;
create policy "Admins can delete news files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'news-files'
    and exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- 4. ------------------------------------------------------------------ SEED --
-- The 4 news previously hard-coded in NewsComponent.jsx, as link-out news.
-- Dated in the past so anything written in the admin panel shows first.
-- Only inserts when the table is empty (safe re-run).
insert into public.news (slug, title_en, title_mk, cover_url, external_url, published_at)
select * from (values
  ('schedule-2026',
   'Schedule 2026',
   'Распоред 2026',
   '/images/NewsComponentImages/Image-1.png',
   '/schedule-2026',
   timestamptz '2026-01-20 10:00+01'),
  ('premier-padel-vs-a1-padel',
   'Differences in playing style between Premier Padel and A1 Padel',
   'Differences in playing style between Premier Padel and A1 Padel',
   '/images/NewsComponentImages/Image-2.jpg',
   'https://padel-magazine.co.uk/differences-in-playing-style-between-premier-padel-and-a1-padel/',
   timestamptz '2026-01-15 10:00+01'),
  ('messi-football-and-padel',
   'Lionel Messi opens up: between football and padel, the Argentinian star plays on all terrains!',
   'Lionel Messi opens up: between football and padel, the Argentinian star plays on all terrains!',
   '/images/NewsComponentImages/Image-3.jpg',
   'https://padel-magazine.co.uk/Lionel-Messi-talks-about-football-and-padel.-The-Argentinian-star-plays-on-all-terrains./',
   timestamptz '2026-01-10 10:00+01'),
  ('fip-inter-continental-cup',
   'International Padel Federation launches Ryder Cup and Laver Cup of Padel with new Inter-Continental Cup competition set for 2025 season',
   'International Padel Federation launches Ryder Cup and Laver Cup of Padel with new Inter-Continental Cup competition set for 2025 season',
   '/images/NewsComponentImages/image-4.jpg',
   'https://www.padelfip.com/2024/11/international-padel-federation-launches-ryder-cup-and-laver-cup-of-padel-with-new-inter-continental-cup-competition-set-for-2025-season/',
   timestamptz '2026-01-05 10:00+01')
) as v(slug, title_en, title_mk, cover_url, external_url, published_at)
where not exists (select 1 from public.news);
