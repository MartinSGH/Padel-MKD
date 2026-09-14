-- ============================================================================
-- Photo Galleries feature setup
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
-- Idempotent: safe to run again.
--
-- Creates:
--   1. public.galleries        the gallery "fields" shown on the News page
--   2. public.gallery_images   the photos inside each gallery
--   3. Row Level Security      public read, admin-only write (both tables)
--   4. Storage bucket          gallery-photos (public read, admin-only write)
--   5. Seed data               the 5 dynamic tiles (Training stays an article)
-- ============================================================================

-- 1. ---------------------------------------------------------------- TABLES --
create table if not exists public.galleries (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,          -- URL segment, e.g. "players"
  title_en      text not null,
  title_mk      text not null,
  cover_url     text,                           -- tile background image
  display_order integer not null default 0,
  created_at    timestamptz not null default now()
);

create table if not exists public.gallery_images (
  id            uuid primary key default gen_random_uuid(),
  gallery_id    uuid not null references public.galleries (id) on delete cascade,
  image_url     text not null,
  caption       text,
  display_order integer not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists gallery_images_gallery_idx
  on public.gallery_images (gallery_id, display_order);
create index if not exists galleries_display_order_idx
  on public.galleries (display_order);

-- 2. ------------------------------------------------------------------- RLS --
alter table public.galleries      enable row level security;
alter table public.gallery_images enable row level security;

-- Public read.
drop policy if exists "Galleries are viewable by everyone" on public.galleries;
create policy "Galleries are viewable by everyone"
  on public.galleries for select using (true);

drop policy if exists "Gallery images are viewable by everyone" on public.gallery_images;
create policy "Gallery images are viewable by everyone"
  on public.gallery_images for select using (true);

-- Admin-only writes on galleries.
drop policy if exists "Admins can insert galleries" on public.galleries;
create policy "Admins can insert galleries"
  on public.galleries for insert to authenticated
  with check (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

drop policy if exists "Admins can update galleries" on public.galleries;
create policy "Admins can update galleries"
  on public.galleries for update to authenticated
  using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

drop policy if exists "Admins can delete galleries" on public.galleries;
create policy "Admins can delete galleries"
  on public.galleries for delete to authenticated
  using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

-- Admin-only writes on gallery images.
drop policy if exists "Admins can insert gallery images" on public.gallery_images;
create policy "Admins can insert gallery images"
  on public.gallery_images for insert to authenticated
  with check (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

drop policy if exists "Admins can update gallery images" on public.gallery_images;
create policy "Admins can update gallery images"
  on public.gallery_images for update to authenticated
  using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

drop policy if exists "Admins can delete gallery images" on public.gallery_images;
create policy "Admins can delete gallery images"
  on public.gallery_images for delete to authenticated
  using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

-- 3. -------------------------------------------------------- STORAGE BUCKET --
insert into storage.buckets (id, name, public)
values ('gallery-photos', 'gallery-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "Gallery photos are publicly readable" on storage.objects;
create policy "Gallery photos are publicly readable"
  on storage.objects for select using (bucket_id = 'gallery-photos');

drop policy if exists "Admins can upload gallery photos" on storage.objects;
create policy "Admins can upload gallery photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'gallery-photos'
    and exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "Admins can update gallery photos" on storage.objects;
create policy "Admins can update gallery photos"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'gallery-photos'
    and exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "Admins can delete gallery photos" on storage.objects;
create policy "Admins can delete gallery photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'gallery-photos'
    and exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- 4. ------------------------------------------------------------------ SEED --
-- The 5 tiles that become photo galleries (Training tile 1 stays an article).
-- Covers reuse the images already bundled in /public/images/NewsImages so the
-- tiles are never empty. Only inserts when the table is empty (safe re-run).
insert into public.galleries (slug, title_en, title_mk, cover_url, display_order)
select * from (values
  ('players',      'Players',                        'Играчи',                 '/images/NewsImages/Players.jpg',     1),
  ('women',        'Women in Padel',                 'Жени во Падел',          '/images/NewsImages/WomenPad.jpg',    2),
  ('competitions', 'Padel Competitions Skopje 2025', 'Падел Натпревари Скопје 2025', '/images/NewsImages/Competition.jpg', 3),
  ('tournaments',  'Padel Tournaments 2025',         'Падел Турнири 2025',     '/images/NewsImages/Tournament.jpg',  4),
  ('courts',       'Courts',                         'Терени',                 '/images/NewsImages/Courts.jpg',      5)
) as v(slug, title_en, title_mk, cover_url, display_order)
where not exists (select 1 from public.galleries);
