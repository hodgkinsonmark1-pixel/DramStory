-- ---------------------------------------------------------------------
-- 0003 — a table whose only job is to be written to
-- 24 September 2026
--
-- WHY THIS EXISTS. Supabase pauses a free-tier project after seven days
-- without "sufficient activity". Paused means the database stops
-- answering: sign-in fails, /account breaks, saved trips will not load.
--
-- The keep-alive cron has been running daily since 21 September and
-- Supabase still scheduled this project for pausing on the 24th. The
-- reason is that the old query deliberately asked for a table the anon
-- role has no grant on, and treated the resulting "permission denied" as
-- proof of life. It IS proof the database is reachable - Postgres has to
-- be running to refuse you - but a rejected query is evidently not
-- activity as far as the inactivity scan is concerned. That was a
-- reasoned guess dressed up as a fact, and it was wrong.
--
-- So: one row, written once a day, by the cron. A real statement that
-- really changes a real byte.
--
-- WHY THE CRON USES THE SERVICE ROLE RATHER THAN GRANTING ANYTHING TO
-- anon. The obvious version of this table is readable by anon so the
-- cron can select from it with the publishable key. That would work, and
-- it would also mean a table anyone holding the public key can read, and
-- - if it were made writable so the write counted - a public endpoint
-- that lets a stranger update a row on our database. The service role
-- key is already set on production for account deletion, it is
-- server-only, and this route is behind CRON_SECRET. No grants are
-- issued here at all: the service role bypasses row level security by
-- design, and nothing else has any business touching this table.
--
-- DELETE ALL OF THIS the day Supabase moves to Pro. Pro projects do not
-- pause, which makes the table, the route and the cron entry dead weight
-- rather than merely unnecessary. See docs/to-do.md.
-- ---------------------------------------------------------------------

create table if not exists public.heartbeat (
  -- Exactly one row, forever. The check constraint is what enforces
  -- that: without it a broken cron could append a row a day and nobody
  -- would notice for a year.
  id smallint primary key default 1 constraint heartbeat_single_row check (id = 1),
  last_checked timestamptz not null default now(),
  -- Free text so a human reading the table in the dashboard can tell
  -- what touched it, without cross-referencing anything.
  note text
);

insert into public.heartbeat (id, last_checked, note)
values (1, now(), 'created by migration 0003')
on conflict (id) do nothing;

-- RLS on, and no policies. That is not an oversight: with RLS enabled
-- and no policy, every role that goes through PostgREST sees nothing at
-- all, which is correct here. The service role is the only thing that
-- should ever reach this table, and it bypasses RLS entirely.
alter table public.heartbeat enable row level security;

comment on table public.heartbeat is
  'Written daily by /api/cron/keep-alive so the free-tier project is not paused for inactivity. Not application data. Delete along with the route when Supabase moves to Pro.';
