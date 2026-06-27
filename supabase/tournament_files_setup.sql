-- ============================================================================
-- Tournament cover image + propositions (PDF) document
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
-- Idempotent: safe to run again.
-- ============================================================================

-- 1. ------------------------------------------------------ EXTRA COLUMNS -----
alter table public.tournaments
  add column if not exists image_url        text,
  add column if not exists propositions_url text;

-- 2. -------------------------------------------------------- STORAGE BUCKET --
-- One public bucket for tournament cover images and PDF documents.
insert into storage.buckets (id, name, public)
values ('tournament-files', 'tournament-files', true)
on conflict (id) do update set public = true;

-- Public read of tournament files.
drop policy if exists "Tournament files are publicly readable" on storage.objects;
create policy "Tournament files are publicly readable"
  on storage.objects
  for select
  using (bucket_id = 'tournament-files');

-- Only admins can upload / overwrite / remove tournament files.
drop policy if exists "Admins can upload tournament files" on storage.objects;
create policy "Admins can upload tournament files"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'tournament-files'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "Admins can update tournament files" on storage.objects;
create policy "Admins can update tournament files"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'tournament-files'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "Admins can delete tournament files" on storage.objects;
create policy "Admins can delete tournament files"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'tournament-files'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
