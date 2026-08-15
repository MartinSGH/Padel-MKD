-- ============================================================================
-- Playing schedule (План за играње)
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
-- Idempotent: safe to run again. Requires the tournaments table.
--
-- Stores an admin-authored playing schedule on the tournament. The column is
-- public (like `draw`): when it's set, a "Schedule" tab appears on the public
-- tournament page for everyone; when null, the tab is hidden. Only admins can
-- write it (the existing tournaments UPDATE policy already restricts writes to
-- admins), so it can be edited and published/unpublished only by an admin.
--
-- Shape (jsonb). The match grid itself is derived from the draw at render time;
-- only these settings are stored. For a group tournament the knockout day
-- (Day 2: quarterfinals → semifinals → 3rd place → final) can carry its own
-- start time + interval; when day2StartTime is empty it inherits Day 1's.
--   {
--     "dateRange":           "14-16.08.2026",
--     "club":                "Тенис Клуб Поинтер / Скопје",
--     "referee":             "Дејан Деспотовски 078 299 986",
--     "startTime":           "12:00",   -- Day 1 (group stage)
--     "intervalMinutes":     60,
--     "day2StartTime":       "10:00",   -- Day 2 (knockout); "" = same as Day 1
--     "day2IntervalMinutes": 60
--   }
-- ============================================================================

alter table public.tournaments
  add column if not exists schedule jsonb;
