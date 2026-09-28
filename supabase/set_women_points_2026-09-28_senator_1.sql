-- ============================================================================
-- Rang list — Women's pairs, 1 КОЛО – СЕНАТОР (d0308c58-04fc-43a5-9390-bf7a837a676a)
-- The women only played one round-robin group (no knockout), so the group
-- winner (most wins) is 1st place = 50 points and everyone else gets 0.
--   Ivana Desoska & Teodora Ducevska — 3 wins of 3 → 50
--   Simona Angelova & Apolonija Antic, Danche Krzhovska & Teodora Arsovska,
--   Aleksandra Karatanovska & Sanja Gjorgieva (no account) → 0
-- Works before or after tournament_points_category.sql. profiles.total_points
-- follows automatically. Run in Supabase -> SQL -> New query. Idempotent.
-- ============================================================================

begin;

update public.tournament_points
set points = 50
where tournament_id = 'd0308c58-04fc-43a5-9390-bf7a837a676a'
  and player_id in (
    '69d96624-9c47-46b3-a84f-1cf4242d7c6e', -- Ivana Desoska
    '57022f5b-9321-454a-96d5-bae955edf548'  -- Teodora Ducevska
  );

update public.tournament_points
set points = 0
where tournament_id = 'd0308c58-04fc-43a5-9390-bf7a837a676a'
  and player_id in (
    '6987bfda-696e-4359-8c58-c0bb11b42b57', -- Simona Angelova
    'eaaffb74-86da-49c6-8077-9ee1846a1908', -- Apolonija Antic
    'f88e6134-b1a7-488b-a46c-18df85dc301c', -- Danche Krzhovska
    '3ee33b14-d90d-48d1-aadc-21be34f4d148', -- Teodora Arsovska
    '3d1093da-86e7-4072-a95f-0a65a50f2f37'  -- Aleksandra Karatanovska
  );

-- Verify: 7 rows — two with 50, five with 0 (tournament total 479 → 544)
-- select player_name, points from public.tournament_points
--   where tournament_id = 'd0308c58-04fc-43a5-9390-bf7a837a676a'
--     and player_id in ('69d96624-9c47-46b3-a84f-1cf4242d7c6e',
--       '57022f5b-9321-454a-96d5-bae955edf548', '6987bfda-696e-4359-8c58-c0bb11b42b57',
--       'eaaffb74-86da-49c6-8077-9ee1846a1908', 'f88e6134-b1a7-488b-a46c-18df85dc301c',
--       '3ee33b14-d90d-48d1-aadc-21be34f4d148', '3d1093da-86e7-4072-a95f-0a65a50f2f37');

commit;
