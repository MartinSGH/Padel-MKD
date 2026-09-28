-- ============================================================================
-- Rang list — set placement points for tournament d0308c58-04fc-43a5-9390-bf7a837a676a
-- (1 КОЛО – СЕНАТОР – Национална падел лига на Македонија – 2026)
-- Scoring: 1st 50 | 2nd 32 | 3rd 25 | Semifinal (4th) 20 | Quarterfinal 15 |
--          Round of 16 10 | Group stage 5
-- The points were first written with the default scheme (100 / 70 / 50 / 40 /
-- 30 / 5); this replaces them. Each player gets a single flat value by how far
-- their team finished (NOT cumulative per win). profiles.total_points follows
-- automatically (profile_points_sync.sql trigger).
-- Run in Supabase -> SQL -> New query. Idempotent.
-- ============================================================================

begin;

-- Replace this tournament's points with the correct placement values (37 rows).
delete from public.tournament_points where tournament_id = 'd0308c58-04fc-43a5-9390-bf7a837a676a';

insert into public.tournament_points (tournament_id, player_id, player_name, points) values
  ('d0308c58-04fc-43a5-9390-bf7a837a676a', '76e9bba7-8e78-4452-ad81-f22737137760', 'Teodor Deljanovski', 50),
  ('d0308c58-04fc-43a5-9390-bf7a837a676a', '1742128b-a804-43f5-99ed-fb634cc5d825', 'Eldin Huseinovic', 50),
  ('d0308c58-04fc-43a5-9390-bf7a837a676a', '335ed3bf-be31-403c-8ff4-24680a4556e0', 'Filip Andonovski', 32),
  ('d0308c58-04fc-43a5-9390-bf7a837a676a', '04c77472-eca8-4905-b86a-434ab514e874', 'Stefan Micov', 32),
  ('d0308c58-04fc-43a5-9390-bf7a837a676a', 'feaad98e-8270-4ef0-b33e-cdc59f620dc0', 'Kristijan Gjoshevski', 25),
  ('d0308c58-04fc-43a5-9390-bf7a837a676a', '4441040c-2134-4940-9bf7-9df7e1d59e4c', 'Zeljko Stojanovski', 25),
  ('d0308c58-04fc-43a5-9390-bf7a837a676a', '3c7fc894-abce-4c5c-9e97-08d213e0eab2', 'Mishko Cvejevski', 20),
  ('d0308c58-04fc-43a5-9390-bf7a837a676a', '5c3d501f-44eb-4701-b233-0ebbcd445442', 'JOVICA MARKOVSKI', 20),
  ('d0308c58-04fc-43a5-9390-bf7a837a676a', 'b2e620bd-15d3-4c1f-a1fd-74cbb6f7ac3b', 'Martin Hristovski', 15),
  ('d0308c58-04fc-43a5-9390-bf7a837a676a', '2e276f98-259e-4371-9277-aa440afb9a74', 'Martin Vladevski', 15),
  ('d0308c58-04fc-43a5-9390-bf7a837a676a', 'e618ecf0-e345-48fb-be23-548313e278ad', 'Vuksha Tomovski', 15),
  ('d0308c58-04fc-43a5-9390-bf7a837a676a', '3fce2b2d-cac1-4922-b5ed-99410e9aabc4', 'Darjan Petkov', 15),
  ('d0308c58-04fc-43a5-9390-bf7a837a676a', '81cdef76-0ea7-4c79-a0a8-917e477ba5a3', 'Gorjan Mishkovski Mishkovski', 15),
  ('d0308c58-04fc-43a5-9390-bf7a837a676a', '08c8f4cd-17e1-47b2-8b43-6324e862791c', 'Predrag  Gavrilovikj', 15),
  ('d0308c58-04fc-43a5-9390-bf7a837a676a', 'aa12c479-1274-4bff-bb21-f561df941a14', 'Filip Bonevski', 15),
  ('d0308c58-04fc-43a5-9390-bf7a837a676a', '28a5b770-d78e-4c85-a884-7becfd08a061', 'Марко Димковски', 15),
  ('d0308c58-04fc-43a5-9390-bf7a837a676a', '17bdd687-3a0b-4c87-974a-9ab046a92051', 'Ivan Manasov', 5),
  ('d0308c58-04fc-43a5-9390-bf7a837a676a', 'f7a1762c-c6ff-4557-a58a-1cf2652468f6', 'Mario Gegovski', 5),
  ('d0308c58-04fc-43a5-9390-bf7a837a676a', '6474aacb-e228-4e93-9a74-e4a9b6c80f07', 'Bujar Imeri', 5),
  ('d0308c58-04fc-43a5-9390-bf7a837a676a', '0db9e9fe-f67d-4ad7-9118-f5a412afcd3d', 'Vlatko Nacevski', 5),
  ('d0308c58-04fc-43a5-9390-bf7a837a676a', '69d96624-9c47-46b3-a84f-1cf4242d7c6e', 'Ivana Desoska', 5),
  ('d0308c58-04fc-43a5-9390-bf7a837a676a', '57022f5b-9321-454a-96d5-bae955edf548', 'Teodora Ducevska', 5),
  ('d0308c58-04fc-43a5-9390-bf7a837a676a', '6987bfda-696e-4359-8c58-c0bb11b42b57', 'Simona Angelova', 5),
  ('d0308c58-04fc-43a5-9390-bf7a837a676a', 'eaaffb74-86da-49c6-8077-9ee1846a1908', 'Apolonija Antic', 5),
  ('d0308c58-04fc-43a5-9390-bf7a837a676a', '3d1093da-86e7-4072-a95f-0a65a50f2f37', 'Aleksandra Karatanovska', 5),
  ('d0308c58-04fc-43a5-9390-bf7a837a676a', 'f88e6134-b1a7-488b-a46c-18df85dc301c', 'Danche Krzhovska', 5),
  ('d0308c58-04fc-43a5-9390-bf7a837a676a', '59e60ef4-5eec-4af6-86e6-8f28814c18cf', 'Lazar Angov', 5),
  ('d0308c58-04fc-43a5-9390-bf7a837a676a', 'c682c293-b6ac-4bce-a699-1bb858dfebaf', 'Zivce Dagalev', 5),
  ('d0308c58-04fc-43a5-9390-bf7a837a676a', 'f5396e09-3ff7-44bb-819f-d3a0bf0a7669', 'Mario Nikolovski', 5),
  ('d0308c58-04fc-43a5-9390-bf7a837a676a', 'd8c52ccc-1e29-4859-9a13-d62c52f61317', 'Boris Pocev', 5),
  ('d0308c58-04fc-43a5-9390-bf7a837a676a', '62c76232-8818-49ea-b228-39c49c2f32db', 'Sokol Kasapi', 5),
  ('d0308c58-04fc-43a5-9390-bf7a837a676a', '897f8c10-a1e7-4ac9-a9a5-34d8a90ae3bc', 'Anid  Abazi', 5),
  ('d0308c58-04fc-43a5-9390-bf7a837a676a', '92b5bb79-423d-4164-9608-efd4339070a4', 'Nikola Stojmenov', 5),
  ('d0308c58-04fc-43a5-9390-bf7a837a676a', 'fd44f635-a180-4016-8dee-952031c5e7dd', 'Jovan Karajanov', 5),
  ('d0308c58-04fc-43a5-9390-bf7a837a676a', '3ee33b14-d90d-48d1-aadc-21be34f4d148', 'Teodora Arsovska', 5),
  ('d0308c58-04fc-43a5-9390-bf7a837a676a', '295c66dd-a2ec-4051-8e1a-c33b524392a3', 'Jovan Vasikj', 5),
  ('d0308c58-04fc-43a5-9390-bf7a837a676a', '88deedda-4fe3-4096-8b64-970a66e2f2a6', 'Vasko Zdravkin', 5);

-- Verify: should return 37 rows summing to 479 pts
-- select count(*), sum(points) from public.tournament_points
--   where tournament_id = 'd0308c58-04fc-43a5-9390-bf7a837a676a';

commit;
