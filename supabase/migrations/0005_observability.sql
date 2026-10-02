-- 0005: logs, quota counters and the tool cache. Server-only tables.

create type public.call_status as enum ('success', 'error', 'timeout', 'rate_limited');

create table public.llm_call_logs (
  id                bigint generated always as identity primary key,
  run_id            uuid references public.agent_runs (id) on delete set null,
  user_id           uuid references public.profiles (id) on delete set null,
  agent             public.agent_name,
  role              text not null,
  provider          text not null,
  requested_model   text not null,
  served_model      text,
  fallback_depth    integer not null default 0,
  prompt_tokens     integer,
  completion_tokens integer,
  latency_ms        integer,
  status            public.call_status not null,
  error_code        text,
  error_message     text,
  cost_usd          numeric(10, 6) not null default 0,
  created_at        timestamptz not null default now()
);

create index llm_call_logs_run_idx on public.llm_call_logs (run_id, created_at);
create index llm_call_logs_created_idx on public.llm_call_logs (created_at desc);

create table public.tool_call_logs (
  id            bigint generated always as identity primary key,
  run_id        uuid references public.agent_runs (id) on delete set null,
  user_id       uuid references public.profiles (id) on delete set null,
  agent         public.agent_name,
  tool          text not null,
  provider      text,
  latency_ms    integer,
  cache_hit     boolean not null default false,
  status        public.call_status not null,
  error_code    text,
  error_message text,
  created_at    timestamptz not null default now()
);

create index tool_call_logs_run_idx on public.tool_call_logs (run_id, created_at);

-- Requests per provider per UTC day, to stay under free-tier caps.
create table public.provider_quota_usage (
  provider   text not null,
  day        date not null default (now() at time zone 'utc')::date,
  requests   integer not null default 0,
  errors     integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (provider, day)
);

-- Cached tool results keyed by tool + normalized input.
create table public.tool_cache (
  key        text primary key,
  tool       text not null,
  value      jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index tool_cache_expires_idx on public.tool_cache (expires_at);

-- LangGraph checkpoint tables are created in this schema by the
-- checkpointer's own setup step (Phase 4). It is not exposed to the Data API.
create schema if not exists langgraph;
