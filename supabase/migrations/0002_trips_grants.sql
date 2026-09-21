-- Grant the Data API access to public.trips.
-- 5 September 2026. Run in Supabase → SQL Editor.
--
-- WHY THIS IS A SEPARATE MIGRATION AND NOT PART OF 0001. The project was
-- created with "Automatically expose new tables" switched OFF, which is
-- the right setting - it means a new table is not reachable through the
-- REST API until somebody says so on purpose. 0001 created the table and
-- its policies and then never said so, so `trips` existed, was correctly
-- protected, and could not be read by the application at all. The
-- account page reported "We couldn't load your trips just now", which is
-- what an unreachable table looks like from the outside.
--
-- GRANTS AND POLICIES ARE DIFFERENT THINGS, and this is the distinction
-- that catches people:
--
--   GRANT   decides whether the table is reachable at all
--   POLICY  decides which rows you get once it is
--
-- Both are needed. A table with policies and no grants is invisible; a
-- table with grants and no policies is public. 0001 did the second half.

grant usage on schema public to authenticated;

-- `authenticated` ONLY, deliberately - not `anon`.
--
-- A signed-out visitor has no business reaching this table: their trip
-- lives in their own browser and never touches the database. Granting to
-- anon would make the table reachable by anyone holding the publishable
-- key, which is in the page source, and leave row level security as the
-- only thing standing in the way. Two locks are better than one, and the
-- outer one costs nothing here.
--
-- This is tighter than "Automatically expose new tables" would have
-- given us, which grants to both roles.
grant select, insert, update, delete
  on table public.trips
  to authenticated;
