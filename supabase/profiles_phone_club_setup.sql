-- ============================================================================
-- Add phone number + club to player profiles
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
-- Idempotent: safe to run again. Requires the clubs + profiles tables.
-- ============================================================================

-- 1. ------------------------------------------------------ EXTRA COLUMNS -----
alter table public.profiles
  add column if not exists phone     text,
  add column if not exists club_id   uuid references public.clubs(id) on delete set null,
  add column if not exists club_name text;

-- 2. ----------------------------------------------- NEW-USER HANDLER ---------
-- Recreate the handler so the phone + club chosen at registration also land in
-- the profile. (club_name is stored alongside club_id so it survives even if a
-- club is later renamed/removed.)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id, email, full_name, avatar_url,
    first_name, last_name, sex, birth_date, place_of_birth,
    phone, club_id, club_name,
    role, total_points
  )
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url',
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'sex',
    nullif(new.raw_user_meta_data ->> 'birth_date', '')::date,
    new.raw_user_meta_data ->> 'place_of_birth',
    new.raw_user_meta_data ->> 'phone',
    nullif(new.raw_user_meta_data ->> 'club_id', '')::uuid,
    new.raw_user_meta_data ->> 'club_name',
    'player',
    0
  )
  on conflict (id) do update set
    email          = excluded.email,
    full_name      = excluded.full_name,
    avatar_url     = excluded.avatar_url,
    first_name     = excluded.first_name,
    last_name      = excluded.last_name,
    sex            = excluded.sex,
    birth_date     = excluded.birth_date,
    place_of_birth = excluded.place_of_birth,
    phone          = excluded.phone,
    club_id        = excluded.club_id,
    club_name      = excluded.club_name;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
