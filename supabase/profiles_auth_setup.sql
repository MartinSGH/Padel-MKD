-- ============================================================================
-- Player profiles — extra personal fields + new-user trigger
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
-- It is idempotent: safe to run again.
--
-- Assumes the standard Supabase setup where a `public.profiles` row is created
-- automatically when a user signs up, via a `handle_new_user()` trigger on
-- `auth.users`. If your trigger/function is named differently, adapt the names
-- in section 2 (or tell me and I'll adjust).
-- ============================================================================

-- 1. ------------------------------------------------------ EXTRA COLUMNS -----
alter table public.profiles
  add column if not exists first_name     text,
  add column if not exists last_name      text,
  add column if not exists sex            text,   -- 'male' | 'female'
  add column if not exists birth_date     date,
  add column if not exists place_of_birth text;

-- 2. ----------------------------------------------- NEW-USER HANDLER ---------
-- Copies the personal data submitted at registration (stored in the user's
-- auth metadata) into the profiles row. New accounts default to role 'player'.
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
    place_of_birth = excluded.place_of_birth;
  return new;
end;
$$;

-- 3. --------------------------------------------------------- TRIGGER --------
-- Make sure the trigger is attached (standard Supabase name).
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
