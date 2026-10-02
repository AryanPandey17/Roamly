-- 0001: remove the pre-refactor schema (4 tables from supabase/schema.sql).
-- Safe on a fresh project: everything is "if exists".

drop trigger if exists on_auth_user_created on auth.users;

drop table if exists public.agent_events cascade;
drop table if exists public.saved_places cascade;
drop table if exists public.trips cascade;
drop table if exists public.profiles cascade;

drop function if exists public.handle_new_user() cascade;
drop function if exists public.touch_updated_at() cascade;
