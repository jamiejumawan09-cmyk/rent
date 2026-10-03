-- ============================================================
-- HOMERent — Supabase Database Schema (Supabase Auth version)
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. USERS (custom auth — not linked to Supabase Auth)
create table if not exists public.userss (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  email         text not null unique,
  password_hash text,
  role          text not null default 'user' check (role in ('admin', 'user')),
  is_verified   boolean not null default false,
  otp           text,
  otp_expires   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 2. PROPERTIES
create table if not exists public.properties (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  location    text not null,
  price       text not null,
  status      text not null default 'Available',
  description text,
  beds        integer,
  baths       integer,
  sqm         integer,
  images      text[] default '{}',
  latitude    numeric,
  longitude   numeric,
  created_at  timestamptz not null default now()
);

-- 3. ACTIVITY LOGS
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
create index if not exists idx_logs_user_id    on public.activity_logs(user_id);
create index if not exists idx_users_email     on public.users(email);
create index if not exists idx_properties_created on public.properties(created_at desc);

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
alter table public.properties    enable row level security;

-- Service role bypasses RLS (used by supabaseAdmin in API routes)
-- No public policies needed since all DB access goes through server API routes

-- ============================================================
-- Tenant features migration
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Add phone + avatar to userss
alter table public.userss
  add column if not exists phone      text,
  add column if not exists avatar_url text;

-- Favorites
create table if not exists public.favorites (
  id          uuid primary key default gen_random_uuid(),
  user_email  text not null,
  property_id uuid not null references public.properties(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_email, property_id)
);
create index if not exists idx_favorites_user on public.favorites(user_email);

-- Reviews
create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  user_email  text not null,
  user_name   text not null,
  rating      smallint not null check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now(),
  unique (property_id, user_email)
);
create index if not exists idx_reviews_property on public.reviews(property_id);

-- ============================================================
-- New features migration
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Notifications
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_email  text not null,
  message     text not null,
  type        text not null default 'info',
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists idx_notifications_user on public.notifications(user_email);

-- Announcements
create table if not exists public.announcements (
  id         uuid primary key default gen_random_uuid(),
  message    text not null,
  type       text not null default 'info',
  created_at timestamptz not null default now()
);

-- Property approval: add 'Pending' as a valid status for landlord submissions
-- (no schema change needed — status column already accepts any text)
-- Landlords submit with status='Pending', admin approves by setting status='Available'

-- Add payment_method to bookings
alter table public.bookings
  add column if not exists payment_method text not null default 'Cash';
