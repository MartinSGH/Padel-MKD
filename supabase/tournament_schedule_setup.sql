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
-- Shape (jsonb):
--   {
--     "dateRange": "14-16.08.2026",
--     "club":      "Тенис Клуб Поинтер / Скопје",
--     "referee":   "Дејан Деспотовски 078 299 986",
--     "days": [
--       {
--         "dayLabel": "петок",
--         "date":     "14.08.2026",
--         "rows": [ ["Терен 1 cell text", "Терен 2 cell text"], ... ]
--       }
--     ]
--   }
-- ============================================================================

alter table public.tournaments
  add column if not exists schedule jsonb;
