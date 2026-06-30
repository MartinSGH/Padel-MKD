-- ============================================================================
-- Publishable tournament draw
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
-- Idempotent: safe to run again.
--
-- Adds a `draw` column where the admin saves the generated bracket. Because
-- tournaments are publicly readable, a saved draw is visible to everyone (shown
-- in a "Draw" tab). It's null until the admin publishes it.
-- ============================================================================

alter table public.tournaments
  add column if not exists draw jsonb;
