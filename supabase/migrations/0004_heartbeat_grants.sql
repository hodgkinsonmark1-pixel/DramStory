-- ---------------------------------------------------------------------
-- 0004 — make heartbeat reachable by the Data API
-- 25 September 2026. Run in Supabase → SQL Editor.
--
-- 0003 created the table and switched RLS on, and stopped there, on the
-- reasoning that the service role bypasses row level security so no
-- grants were needed. The table appeared in the dashboard, the row
-- existed, and the cron could not touch it. Its last_checked sat at the
-- migration's own timestamp for a day while the project carried on
-- drifting toward a pause.
--
-- THIS IS THE SECOND TIME THIS WEEK, and the answer was already written
-- down. 0002 exists for exactly this reason - this project was created
-- with "Automatically expose new tables" switched OFF - and its comment
-- spells it out:
--
--     GRANT   decides whether the table is reachable at all
--     POLICY  decides which rows you get once it is
--
-- Bypassing RLS does nothing for a table PostgREST was never told to
-- expose. Reasoning carefully about one layer while a different layer
-- decides the outcome is the same failure as the keep-alive itself: the
-- argument was sound and answered the wrong question.
--
-- service_role ONLY. Not anon, not authenticated. Nothing that reaches
-- this database with a public key has any business seeing a table whose
-- entire purpose is to be written to by a cron, and RLS stays on with no
-- policies so there is a second lock behind this one - the same
-- belt-and-braces reasoning 0002 used for trips.
-- ---------------------------------------------------------------------

grant usage on schema public to service_role;

grant select, update on table public.heartbeat to service_role;

-- PostgREST caches the schema it exposes. Supabase reloads that cache on
-- DDL automatically in most cases, but a grant is not always enough to
-- trigger it, and a stale cache looks exactly like a missing grant -
-- which is the confusion this whole file exists to end. Ask explicitly.
notify pgrst, 'reload schema';
