-- 0002: enums, identity tables, trips and trip requests.

create type public.budget_style as enum ('saver', 'balanced', 'comfort');
create type public.travel_pace  as enum ('relaxed', 'balanced', 'packed');
create type public.theme_pref   as enum ('light', 'dark', 'system');
create type public.trip_status  as enum ('draft', 'planning', 'ready', 'over_budget', 'paused', 'failed');

-- One row per auth user. Created by trigger on signup (see 0006).
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  full_name    text,
  email        text,
  avatar_url   text,
  onboarded_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Planning defaults. Created by the same signup trigger.
create table public.user_preferences (
  user_id      uuid primary key references public.profiles (id) on delete cascade,
  home_city    text,
  home_lat     double precision,
  home_lng     double precision,
  currency     text not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  budget_style public.budget_style not null default 'balanced',
  pace         public.travel_pace  not null default 'balanced',
  interests    text[] not null default '{}',
  dietary      text[] not null default '{}',
  theme        public.theme_pref   not null default 'system',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- A trip is the user-facing object. Most columns are filled once the
-- Supervisor has parsed the request, so they are nullable.
create table public.trips (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id) on delete cascade,
  title          text not null default 'New trip',
  destination    text,
  destination_lat double precision,
  destination_lng double precision,
  origin         text,
  start_date     date,
  end_date       date,
  travellers     integer not null default 1 check (travellers between 1 and 20),
  budget_amount  numeric(12, 2) check (budget_amount is null or budget_amount >= 0),
  currency       text check (currency is null or currency ~ '^[A-Z]{3}$'),
  total_cost     numeric(12, 2),
  status         public.trip_status not null default 'planning',
  current_run_id uuid,
  deleted_at     timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);

create index trips_user_created_idx on public.trips (user_id, created_at desc) where deleted_at is null;

-- The prompt exactly as typed, the optional structured fields, and what the
-- Supervisor made of them.
create table public.trip_requests (
  id               uuid primary key default gen_random_uuid(),
  trip_id          uuid not null references public.trips (id) on delete cascade,
  user_id          uuid not null references public.profiles (id) on delete cascade,
  raw_prompt       text not null check (char_length(raw_prompt) between 1 and 4000),
  structured_hints jsonb not null default '{}'::jsonb,
  parsed           jsonb,
  assumptions      text[] not null default '{}',
  created_at       timestamptz not null default now()
);

create index trip_requests_trip_idx on public.trip_requests (trip_id, created_at desc);
