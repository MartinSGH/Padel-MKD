-- ============================================================================
-- Per-tournament scoring system (tournaments.points_scheme)
-- Run once in Supabase Dashboard -> SQL -> New query. Idempotent, safe to re-run.
--
-- Each tournament stores the ranking points it awards by final placement, as
--   { "preset": "national" | "cup" | "league" | "regional" | "custom",
--     "champion", "runnerUp", "third", "fourth",
--     "quarterfinal", "roundOf16", "participant" }
-- The admin picks a federation preset or enters custom values when creating /
-- editing a tournament (see src/lib/points.js). The values are copied in, so a
-- tournament keeps its points even if a preset changes later. A tournament
-- with no scheme falls back to 100 / 70 / 50 / 40 / 30 / 5.
-- ============================================================================

alter table public.tournaments
  add column if not exists points_scheme jsonb;

-- Keep the tournaments already played on the points they were scored with.

-- Отворено Национално Првенство во Падел 2026
update public.tournaments
set points_scheme = '{"preset": "custom", "champion": 100, "runnerUp": 70,
  "third": 50, "fourth": 40, "quarterfinal": 30, "roundOf16": 5,
  "participant": 5}'::jsonb
where id = 'd0f9737f-377b-4882-abae-8a13f5379ae8';

-- 1 КОЛО and 2 КОЛО – СЕНАТОР – Национална падел лига на Македонија – 2026
update public.tournaments
set points_scheme = '{"preset": "custom", "champion": 50, "runnerUp": 32,
  "third": 25, "fourth": 20, "quarterfinal": 15, "roundOf16": 10,
  "participant": 5}'::jsonb
where id in (
  'd0308c58-04fc-43a5-9390-bf7a837a676a',
  '8a6d7d75-1a29-44d8-b8a3-5a7bf5bd173b'
);
