-- 0004: the final itinerary, saved options and share links.

create type public.item_type   as enum ('flight', 'stay', 'activity', 'meal', 'transfer', 'note');
create type public.option_kind as enum ('flight', 'stay', 'place');

-- One current itinerary per trip. A new run replaces it.
create table public.itineraries (
  id               uuid primary key default gen_random_uuid(),
  trip_id          uuid not null unique references public.trips (id) on delete cascade,
  run_id           uuid references public.agent_runs (id) on delete set null,
  user_id          uuid not null references public.profiles (id) on delete cascade,
  currency         text not null,
  budget_amount    numeric(12, 2) not null,
  total_cost       numeric(12, 2) not null,
  fits_budget      boolean not null,
  over_by          numeric(12, 2) not null default 0,
  cost_breakdown   jsonb not null default '{}'::jsonb,
  assumptions      text[] not null default '{}',
  summary_markdown text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table public.itinerary_days (
  id           uuid primary key default gen_random_uuid(),
  itinerary_id uuid not null references public.itineraries (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  day_number   integer not null check (day_number >= 1),
  date         date,
  title        text,
  notes        text,
  created_at   timestamptz not null default now(),
  unique (itinerary_id, day_number)
);

-- Flights, stays, activities, meals and transfers, ordered within a day.
create table public.itinerary_items (
  id           uuid primary key default gen_random_uuid(),
  itinerary_id uuid not null references public.itineraries (id) on delete cascade,
  day_id       uuid not null references public.itinerary_days (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  type         public.item_type not null,
  position     integer not null default 0,
  title        text not null,
  description  text,
  start_time   time,
  end_time     time,
  cost_amount  numeric(12, 2) not null default 0,
  currency     text,
  lat          double precision,
  lng          double precision,
  address      text,
  provider     text,
  external_id  text,
  deep_link    text,
  details      jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index itinerary_items_day_idx on public.itinerary_items (day_id, position);
create index itinerary_items_itinerary_idx on public.itinerary_items (itinerary_id);

-- Options the user bookmarked from any trip.
create table public.saved_options (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  trip_id     uuid references public.trips (id) on delete set null,
  kind        public.option_kind not null,
  provider    text not null,
  external_id text not null,
  title       text not null,
  payload     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  unique (user_id, kind, provider, external_id)
);

-- Read-only share links. The public page resolves the token on the server;
-- there is no anonymous policy on this table.
create table public.shared_trips (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  token      text not null unique
             default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index shared_trips_trip_idx on public.shared_trips (trip_id);
