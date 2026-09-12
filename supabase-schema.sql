-- ============================================================
-- HOMERent — Supabase Database Schema (Supabase Auth version)
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. USERS (linked to Supabase Auth)
create table if not exists public.users (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text not null,
  email         text not null unique,
  password_hash text,
  role          text not null default 'user' check (role in ('admin', 'user')),
  is_verified   boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 2. ACTIVITY LOGS
create table if not exists public.activity_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.users(id) on delete set null,
  action     text not null,
  metadata   jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_logs_user_id on public.activity_logs(user_id);
create index if not exists idx_users_email  on public.users(email);

-- ============================================================
-- AUTO-UPDATE updated_at on users
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_updated_at on public.users;
create trigger users_updated_at
  before update on public.users
  for each row execute procedure public.handle_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
alter table public.users         enable row level security;
alter table public.activity_logs enable row level security;

-- Service role bypasses RLS (used by supabaseAdmin in API routes)
-- No public policies needed since all DB access goes through server API routes
