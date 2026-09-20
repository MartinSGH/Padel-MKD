-- ============================================================================
-- Rang list — set placement points for tournament d0f9737f-377b-4882-abae-8a13f5379ae8
-- Scoring: 1st 100 | 2nd 70 | 3rd 50 | 4th 40 | Quarterfinal 30 | Group phase 5
-- Each player gets a single flat value by how far their team finished
-- (NOT cumulative per win). Run in Supabase -> SQL -> New query. Idempotent.
-- ============================================================================

begin;

-- Replace this tournament's points with the correct placement values (32 rows).
delete from public.tournament_points where tournament_id = 'd0f9737f-377b-4882-abae-8a13f5379ae8';

insert into public.tournament_points (tournament_id, player_id, player_name, points) values
  ('d0f9737f-377b-4882-abae-8a13f5379ae8', '5a537441-30b5-47ab-95f1-e7e40d02a8a6', 'Gjorgji Jankulovski', 100),
  ('d0f9737f-377b-4882-abae-8a13f5379ae8', '76e9bba7-8e78-4452-ad81-f22737137760', 'Teodor  Deljanovski', 100),
  ('d0f9737f-377b-4882-abae-8a13f5379ae8', '1742128b-a804-43f5-99ed-fb634cc5d825', 'Eldin Huseinovic', 70),
  ('d0f9737f-377b-4882-abae-8a13f5379ae8', 'cef16644-964f-452e-84f2-90d473bb0d0a', 'Darko Kolevski', 70),
  ('d0f9737f-377b-4882-abae-8a13f5379ae8', '08c8f4cd-17e1-47b2-8b43-6324e862791c', 'Predrag  Gavrilovikj', 50),
  ('d0f9737f-377b-4882-abae-8a13f5379ae8', '04c77472-eca8-4905-b86a-434ab514e874', 'Stefan Micov', 50),
  ('d0f9737f-377b-4882-abae-8a13f5379ae8', '4441040c-2134-4940-9bf7-9df7e1d59e4c', 'Zeljko Stojanovski', 40),
  ('d0f9737f-377b-4882-abae-8a13f5379ae8', 'd471b2ad-e980-4960-921a-8699f6157b12', 'Никола Стојановски', 40),
  ('d0f9737f-377b-4882-abae-8a13f5379ae8', 'f725d20c-faa9-4964-8197-598902adf21e', 'Aleksandar Vlaho', 30),
  ('d0f9737f-377b-4882-abae-8a13f5379ae8', 'a479ec58-dd2f-41a3-8733-e17cf05b7e13', 'Zlatko Stojanoski', 30),
  ('d0f9737f-377b-4882-abae-8a13f5379ae8', 'd7086dcc-a89f-4246-8856-6ff103e9d395', 'Petar Stojkovic', 30),
  ('d0f9737f-377b-4882-abae-8a13f5379ae8', 'd9509a05-2fb4-4d56-b67f-ba56daf4d8b1', 'Aleksandar  Tushevski', 30),
  ('d0f9737f-377b-4882-abae-8a13f5379ae8', '5c3d501f-44eb-4701-b233-0ebbcd445442', 'JOVICA MARKOVSKI', 30),
  ('d0f9737f-377b-4882-abae-8a13f5379ae8', '3c7fc894-abce-4c5c-9e97-08d213e0eab2', 'Mishko Cvejevski', 30),
  ('d0f9737f-377b-4882-abae-8a13f5379ae8', 'd8f2ae76-9abc-471c-b2d1-2915875cda84', 'Marko Dimitrovski', 30),
  ('d0f9737f-377b-4882-abae-8a13f5379ae8', '2e276f98-259e-4371-9277-aa440afb9a74', 'Martin Vladevski', 30),
  ('d0f9737f-377b-4882-abae-8a13f5379ae8', '4bb260ea-ed74-4825-8ec2-99541f9b2ebc', 'Emil Nikolovski', 5),
  ('d0f9737f-377b-4882-abae-8a13f5379ae8', 'f38d5383-02a6-4dd2-9ba2-6b9b3a4bd6a5', 'Богољуб Богатиноски', 5),
  ('d0f9737f-377b-4882-abae-8a13f5379ae8', 'b2632463-5b04-4d40-a2f1-0396e9ddeb7c', 'Rado Popov', 5),
  ('d0f9737f-377b-4882-abae-8a13f5379ae8', '3febaf10-c458-47c8-b63c-8e5324eab707', 'MARTIN TRAJKOVSKI', 5),
  ('d0f9737f-377b-4882-abae-8a13f5379ae8', 'c2604959-1476-4387-9230-0ef57e90791b', 'Zharko Stojanovski', 5),
  ('d0f9737f-377b-4882-abae-8a13f5379ae8', 'a8252d16-8e2f-4f7b-8b30-251a438674da', 'Vladimir Jakimovski', 5),
  ('d0f9737f-377b-4882-abae-8a13f5379ae8', '211af42c-6dd9-4c4c-898e-c4d14a32bb21', 'Martin Ivanov', 5),
  ('d0f9737f-377b-4882-abae-8a13f5379ae8', '567bd1ae-26c3-4288-ad02-5639ecffd707', 'Milosh Ilievski', 5),
  ('d0f9737f-377b-4882-abae-8a13f5379ae8', '7a9b7c3f-07f0-4e50-8f1d-a62b00b9db42', 'Zdravko Zdravev', 5),
  ('d0f9737f-377b-4882-abae-8a13f5379ae8', 'af1a9f2c-1ba7-46d8-9000-6e802dcffcdd', 'Josif Malinski', 5),
  ('d0f9737f-377b-4882-abae-8a13f5379ae8', '3fce2b2d-cac1-4922-b5ed-99410e9aabc4', 'Darjan Petkov', 5),
  ('d0f9737f-377b-4882-abae-8a13f5379ae8', '1ef6a599-29ec-4f6b-9a1a-9c4a72a3cda6', 'Mario Gerasimoski', 5),
  ('d0f9737f-377b-4882-abae-8a13f5379ae8', '157e41c9-ed62-4da7-991a-fc250b941931', 'Jovan Ivanov', 5),
  ('d0f9737f-377b-4882-abae-8a13f5379ae8', '39afe248-def1-414f-8ec2-632d1d9c3384', 'Andrej Vuchevski', 5),
  ('d0f9737f-377b-4882-abae-8a13f5379ae8', '71626c04-6407-4cd0-85da-68f507817512', 'Илија Тренчевски', 5),
  ('d0f9737f-377b-4882-abae-8a13f5379ae8', 'aa12c479-1274-4bff-bb21-f561df941a14', 'Filip Bonevski', 5);

-- Verify: should return 32 rows summing to 840 pts
-- select count(*), sum(points) from public.tournament_points
--   where tournament_id = 'd0f9737f-377b-4882-abae-8a13f5379ae8';

commit;
