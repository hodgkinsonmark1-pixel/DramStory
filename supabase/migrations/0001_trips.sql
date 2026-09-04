-- Trips: one row per saved trip, owned by one account.
-- 4 September 2026. Run in Supabase → SQL Editor.
--
-- ROW LEVEL SECURITY IS THE WHOLE SECURITY MODEL HERE. The publishable
-- key ships in client-side code by design, so anyone can reach this
-- table's API endpoint. What stops them reading someone else's trips is
-- the policies below and nothing else. A table without them is a public
-- table.

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  -- Shown in the trips list. "May with Dad", "Fèis Ìle 2027".
  name text not null default 'Your trip',

  -- The trip itself: the same shape TripContext already serialises into
  -- localStorage under dramstory-trip-v2. Stored as JSON rather than
  -- normalised into days and stops tables because nothing in the plan
  -- queries inside a trip - it is read and written whole - and
  -- normalising would mean a migration every time the trip shape moves.
  payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- on delete cascade above means deleting an account really does delete
-- the trips, rather than orphaning rows that then answer a subject
-- access request nobody expected.

create index if not exists trips_user_id_idx on public.trips (user_id);

alter table public.trips enable row level security;

-- Four policies, one per operation. `auth.uid()` is the signed-in user;
-- it is null for an anonymous request, so every policy fails closed.
--
-- The with check on insert and update is the half people forget: without
-- it, a signed-in visitor could write a row carrying somebody else's
-- user_id, or move one of their own rows to another account.

drop policy if exists "trips are readable by their owner" on public.trips;
create policy "trips are readable by their owner"
  on public.trips for select
  using (auth.uid() = user_id);

drop policy if exists "trips are insertable by their owner" on public.trips;
create policy "trips are insertable by their owner"
  on public.trips for insert
  with check (auth.uid() = user_id);

drop policy if exists "trips are updatable by their owner" on public.trips;
create policy "trips are updatable by their owner"
  on public.trips for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "trips are deletable by their owner" on public.trips;
create policy "trips are deletable by their owner"
  on public.trips for delete
  using (auth.uid() = user_id);

-- Keep updated_at honest. Doing this in the database rather than the
-- client means it cannot be forgotten at a call site or spoofed from the
-- browser.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trips_set_updated_at on public.trips;
create trigger trips_set_updated_at
  before update on public.trips
  for each row execute function public.set_updated_at();
