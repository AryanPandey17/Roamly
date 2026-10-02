-- 0006: triggers, Row Level Security and grants.

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at         before update on public.profiles         for each row execute function public.set_updated_at();
create trigger user_preferences_set_updated_at before update on public.user_preferences for each row execute function public.set_updated_at();
create trigger trips_set_updated_at            before update on public.trips            for each row execute function public.set_updated_at();
create trigger agent_runs_set_updated_at       before update on public.agent_runs       for each row execute function public.set_updated_at();
create trigger itineraries_set_updated_at      before update on public.itineraries      for each row execute function public.set_updated_at();
create trigger itinerary_items_set_updated_at  before update on public.itinerary_items  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Profile + preferences on signup
-- ---------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(new.email, '@', 1)
    ),
    new.email,
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Accounts that existed before this migration get their rows too.
insert into public.profiles (id, full_name, email, avatar_url)
select u.id,
       coalesce(nullif(u.raw_user_meta_data ->> 'full_name', ''),
                nullif(u.raw_user_meta_data ->> 'name', ''),
                split_part(u.email, '@', 1)),
       u.email,
       u.raw_user_meta_data ->> 'avatar_url'
from auth.users u
on conflict (id) do nothing;

insert into public.user_preferences (user_id)
select p.id from public.profiles p
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- Row Level Security: on for every table
-- ---------------------------------------------------------------------------
alter table public.profiles             enable row level security;
alter table public.user_preferences     enable row level security;
alter table public.trips                enable row level security;
alter table public.trip_requests        enable row level security;
alter table public.agent_runs           enable row level security;
alter table public.agent_messages       enable row level security;
alter table public.budget_audits        enable row level security;
alter table public.itineraries          enable row level security;
alter table public.itinerary_days       enable row level security;
alter table public.itinerary_items      enable row level security;
alter table public.saved_options        enable row level security;
alter table public.shared_trips         enable row level security;
alter table public.llm_call_logs        enable row level security;
alter table public.tool_call_logs       enable row level security;
alter table public.provider_quota_usage enable row level security;
alter table public.tool_cache           enable row level security;

-- Identity: read and update your own row. Rows are created by the trigger.
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy user_preferences_select_own on public.user_preferences
  for select to authenticated using (user_id = (select auth.uid()));
create policy user_preferences_update_own on public.user_preferences
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Trips: full ownership. Deleting is a soft delete (update deleted_at).
create policy trips_select_own on public.trips
  for select to authenticated using (user_id = (select auth.uid()));
create policy trips_insert_own on public.trips
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy trips_update_own on public.trips
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy trip_requests_select_own on public.trip_requests
  for select to authenticated using (user_id = (select auth.uid()));
create policy trip_requests_insert_own on public.trip_requests
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.trips t where t.id = trip_id and t.user_id = (select auth.uid()))
  );

-- Run data: read-only for the owner. Written by the server (service role).
create policy agent_runs_select_own on public.agent_runs
  for select to authenticated using (user_id = (select auth.uid()));
create policy agent_messages_select_own on public.agent_messages
  for select to authenticated using (user_id = (select auth.uid()));
create policy budget_audits_select_own on public.budget_audits
  for select to authenticated using (user_id = (select auth.uid()));

-- Itinerary: the owner reads it and may edit items (swap, move, retime, remove).
create policy itineraries_select_own on public.itineraries
  for select to authenticated using (user_id = (select auth.uid()));
create policy itineraries_update_own on public.itineraries
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy itinerary_days_select_own on public.itinerary_days
  for select to authenticated using (user_id = (select auth.uid()));
create policy itinerary_days_update_own on public.itinerary_days
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy itinerary_items_select_own on public.itinerary_items
  for select to authenticated using (user_id = (select auth.uid()));
create policy itinerary_items_insert_own on public.itinerary_items
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.itineraries i where i.id = itinerary_id and i.user_id = (select auth.uid()))
  );
create policy itinerary_items_update_own on public.itinerary_items
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy itinerary_items_delete_own on public.itinerary_items
  for delete to authenticated using (user_id = (select auth.uid()));

-- Saved options: full ownership.
create policy saved_options_select_own on public.saved_options
  for select to authenticated using (user_id = (select auth.uid()));
create policy saved_options_insert_own on public.saved_options
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy saved_options_delete_own on public.saved_options
  for delete to authenticated using (user_id = (select auth.uid()));

-- Share links: the owner manages them. Anonymous visitors never query this
-- table; /share/[token] resolves the token on the server.
create policy shared_trips_select_own on public.shared_trips
  for select to authenticated using (user_id = (select auth.uid()));
create policy shared_trips_insert_own on public.shared_trips
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.trips t where t.id = trip_id and t.user_id = (select auth.uid()))
  );
create policy shared_trips_update_own on public.shared_trips
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- llm_call_logs, tool_call_logs, provider_quota_usage, tool_cache:
-- RLS is on and there are no policies, so only the service role can touch them.

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
-- Start from nothing, then grant exactly what the policies above allow.
revoke all on all tables in schema public from anon, authenticated;

grant select, update on public.profiles, public.user_preferences to authenticated;
grant select, insert, update on public.trips to authenticated;
grant select, insert on public.trip_requests to authenticated;
grant select on public.agent_runs, public.agent_messages, public.budget_audits to authenticated;
grant select, update on public.itineraries, public.itinerary_days to authenticated;
grant select, insert, update, delete on public.itinerary_items to authenticated;
grant select, insert, delete on public.saved_options to authenticated;
grant select, insert, update on public.shared_trips to authenticated;

grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
