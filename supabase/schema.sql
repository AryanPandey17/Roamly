-- Roamly schema — run in the Supabase SQL editor.
-- Enables auth-linked profiles, trips, agent events, and saved places.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  email text,
  home_location text default 'Mumbai, India',
  travel_style text,
  currency text default 'INR',
  theme text default 'light',
  countries_visited text[] default '{}',
  notifications jsonb default '{"tripUpdates":true,"planningComplete":true,"budgetAlerts":true}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  title text,
  destination text,
  origin text,
  start_date date,
  end_date date,
  traveler_count int default 1,
  budget_total numeric,
  currency text default 'INR',
  status text default 'draft' check (status in ('draft', 'planning', 'ready', 'completed')),
  user_request text,
  parsed_request jsonb,
  trip_state jsonb,
  final_itinerary jsonb,
  rejection_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.agent_events (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips on delete cascade not null,
  agent text not null,
  event_type text default 'info',
  message text not null,
  round int,
  payload jsonb,
  created_at timestamptz default now()
);

create table if not exists public.saved_places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  category text not null check (category in ('hotels', 'flights', 'recs')),
  external_id text not null,
  title text,
  payload jsonb,
  created_at timestamptz default now(),
  unique (user_id, category, external_id)
);

create index if not exists trips_user_id_idx on public.trips (user_id, created_at desc);
create index if not exists agent_events_trip_id_idx on public.agent_events (trip_id, created_at);
create index if not exists saved_places_user_id_idx on public.saved_places (user_id);

alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.agent_events enable row level security;
alter table public.saved_places enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "trips_all_own" on public.trips;
create policy "trips_all_own" on public.trips for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "events_select_own" on public.agent_events;
create policy "events_select_own" on public.agent_events for select
  using (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()));
drop policy if exists "events_insert_own" on public.agent_events;
create policy "events_insert_own" on public.agent_events for insert
  with check (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()));

drop policy if exists "saved_all_own" on public.saved_places;
create policy "saved_all_own" on public.saved_places for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trips_touch on public.trips;
create trigger trips_touch before update on public.trips
  for each row execute procedure public.touch_updated_at();

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute procedure public.touch_updated_at();
