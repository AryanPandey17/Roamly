-- 0003: agent runs, the negotiation transcript, and budget audits.

create type public.run_status   as enum ('queued', 'running', 'paused', 'completed', 'completed_over_budget', 'failed');
create type public.agent_name   as enum ('supervisor', 'logistics', 'recommendations', 'budget', 'system');
create type public.message_kind as enum ('info', 'proposal', 'rejection', 'revision', 'approval', 'mediation', 'compromise', 'final', 'error');
create type public.budget_status as enum ('approved', 'rejected', 'compromise');

-- One execution of the graph. id doubles as the LangGraph thread_id.
create table public.agent_runs (
  id            uuid primary key default gen_random_uuid(),
  trip_id       uuid not null references public.trips (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  request_id    uuid not null references public.trip_requests (id) on delete cascade,
  status        public.run_status not null default 'queued',
  round         integer not null default 0,
  rejections    integer not null default 0,
  llm_calls     integer not null default 0,
  tool_calls    integer not null default 0,
  error_code    text,
  error_message text,
  started_at    timestamptz,
  finished_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index agent_runs_trip_idx on public.agent_runs (trip_id, created_at desc);
create index agent_runs_user_idx on public.agent_runs (user_id, created_at desc);

alter table public.trips
  add constraint trips_current_run_fk
  foreign key (current_run_id) references public.agent_runs (id) on delete set null;

-- Every event the UI shows in the negotiation feed. seq is per run and is
-- what the SSE stream uses to replay after a reconnect.
create table public.agent_messages (
  id         bigint generated always as identity primary key,
  run_id     uuid not null references public.agent_runs (id) on delete cascade,
  trip_id    uuid not null references public.trips (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  seq        integer not null check (seq >= 0),
  agent      public.agent_name not null,
  kind       public.message_kind not null default 'info',
  round      integer,
  content    text not null,
  data       jsonb,
  created_at timestamptz not null default now(),
  unique (run_id, seq)
);

create index agent_messages_trip_idx on public.agent_messages (trip_id, created_at);

-- One row per Budget verdict.
create table public.budget_audits (
  id              uuid primary key default gen_random_uuid(),
  run_id          uuid not null references public.agent_runs (id) on delete cascade,
  trip_id         uuid not null references public.trips (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  round           integer not null,
  status          public.budget_status not null,
  currency        text not null,
  budget_amount   numeric(12, 2) not null,
  total           numeric(12, 2) not null,
  breakdown       jsonb not null,
  target_agent    public.agent_name,
  target_category text,
  ceiling         numeric(12, 2),
  over_by         numeric(12, 2),
  feedback        text,
  created_at      timestamptz not null default now()
);

create index budget_audits_run_idx on public.budget_audits (run_id, round);
