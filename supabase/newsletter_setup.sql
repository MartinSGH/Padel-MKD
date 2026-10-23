-- ============================================================================
-- Newsletter + news / tournament emails
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
-- Idempotent: safe to run again.
--
-- Creates:
--   1. public.email_contacts   every address we email: footer subscribers, plus
--                              registered users once they've been emailed (so
--                              each address has an unsubscribe token)
--   2. public.email_sends      log of every send (what, to whom, how many)
--   3. RPCs                    newsletter_subscribe / newsletter_unsubscribe,
--                              callable by anyone (the table itself is admin-only)
--
-- The emails are sent by the `send-email` Edge Function
-- (supabase/functions/send-email/index.ts).
-- ============================================================================

-- 1. ---------------------------------------------------------------- TABLES --
create table if not exists public.email_contacts (
  email       text primary key,                 -- always lower-case
  token       uuid not null default gen_random_uuid() unique, -- unsubscribe link
  newsletter  boolean not null default false,   -- subscribed in the footer
  opted_out   boolean not null default false,   -- unsubscribed: never email
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.email_sends (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null,                    -- 'news' | 'tournament'
  ref_id      uuid not null,                    -- news.id / tournaments.id
  audience    text not null,                    -- everyone | players | subscribers | manual
  sent_count  integer not null default 0,
  failed_count integer not null default 0,
  sent_by     uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists email_sends_ref_idx on public.email_sends (kind, ref_id);

-- 2. ------------------------------------------------------------------- RLS --
-- No public access to the tables: visitors go through the RPCs below, the
-- Edge Function uses the service role, admins can read the lists.
alter table public.email_contacts enable row level security;
alter table public.email_sends    enable row level security;

drop policy if exists "Admins can read email contacts" on public.email_contacts;
create policy "Admins can read email contacts"
  on public.email_contacts for select to authenticated
  using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

drop policy if exists "Admins can read email sends" on public.email_sends;
create policy "Admins can read email sends"
  on public.email_sends for select to authenticated
  using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

-- 3. ------------------------------------------------------------------ RPCs --
-- Footer "Subscribe". Re-subscribing after unsubscribing turns emails back on.
create or replace function public.newsletter_subscribe(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
begin
  if v_email is null
     or length(v_email) > 254
     or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Invalid email address' using errcode = '22023';
  end if;

  insert into public.email_contacts (email, newsletter, opted_out)
  values (v_email, true, false)
  on conflict (email) do update
    set newsletter = true, opted_out = false, updated_at = now();
end;
$$;

-- Unsubscribe link in every email. Returns the address so the page can show it.
create or replace function public.newsletter_unsubscribe(p_token uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  update public.email_contacts
     set opted_out = true, newsletter = false, updated_at = now()
   where token = p_token
  returning email into v_email;
  return v_email; -- null when the token is unknown
end;
$$;

revoke all on function public.newsletter_subscribe(text) from public;
revoke all on function public.newsletter_unsubscribe(uuid) from public;
grant execute on function public.newsletter_subscribe(text) to anon, authenticated;
grant execute on function public.newsletter_unsubscribe(uuid) to anon, authenticated;
