-- ============================================================
-- HomeRent — Notifications
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── 1. Drop and recreate notifications table ──────────────
-- (keeps it consistent; safe to re-run)
drop table if exists public.notifications cascade;

create table public.notifications (
  id          uuid        primary key default gen_random_uuid(),
  user_email  text        not null,
  booking_id  uuid        references public.bookings(id) on delete cascade,
  message     text        not null,
  link        text        not null default '/bookings',
  is_read     boolean     not null default false,
  created_at  timestamptz not null default now()
);

create index idx_notifications_user    on public.notifications(user_email);
create index idx_notifications_unread  on public.notifications(user_email, is_read)
  where is_read = false;

-- ── 2. Row Level Security ─────────────────────────────────
alter table public.notifications enable row level security;

-- Service role (used by API routes) bypasses RLS — no extra policy needed.
-- We use email-based access since this project uses custom auth (no auth.users).
-- All notification reads/writes go through API routes with the service role key.

-- ── 3. Enable Realtime ───────────────────────────────────
-- Add the table to the supabase_realtime publication so clients
-- can subscribe to INSERT events.
alter publication supabase_realtime add table public.notifications;

-- ── 4. Trigger: tenant approved or rejected ──────────────
-- Fires on bookings UPDATE when status changes to Approved or Rejected.
create or replace function public.notify_tenant_booking_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message text;
  v_link    text := '/bookings';
begin
  -- Only fire when status actually changes
  if new.status = old.status then
    return new;
  end if;

  if new.status = 'Approved' then
    v_message := 'Your booking was approved! The landlord will contact you soon.';
  elsif new.status = 'Rejected' then
    v_message := 'Your booking was rejected. You may apply for another property.';
  else
    return new;  -- Pending / Cancelled handled elsewhere
  end if;

  insert into public.notifications (user_email, booking_id, message, link)
  values (new.user_email, new.id, v_message, v_link);

  return new;
end;
$$;

drop trigger if exists trg_notify_tenant_booking_status on public.bookings;
create trigger trg_notify_tenant_booking_status
  after update on public.bookings
  for each row execute procedure public.notify_tenant_booking_status();

-- ── 5. Trigger: new booking → notify landlord ────────────
-- Fires on bookings INSERT. Looks up the property title and
-- landlord_email from the properties table.
create or replace function public.notify_landlord_new_booking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title          text;
  v_landlord_email text;
  v_message        text;
begin
  -- Get property info
  select title, landlord_email
  into   v_title, v_landlord_email
  from   public.properties
  where  id = new.property_id;

  -- Only notify if the property has an assigned landlord
  if v_landlord_email is null then
    return new;
  end if;

  v_message := 'New booking request for "' || coalesce(v_title, 'your property') || '" from ' || new.user_name || '.';

  insert into public.notifications (user_email, booking_id, message, link)
  values (v_landlord_email, new.id, v_message, '/landlord');

  return new;
end;
$$;

drop trigger if exists trg_notify_landlord_new_booking on public.bookings;
create trigger trg_notify_landlord_new_booking
  after insert on public.bookings
  for each row execute procedure public.notify_landlord_new_booking();

-- ── 6. Trigger: tenant cancels → notify landlord ─────────
-- Reuses the UPDATE trigger path; fires when status → 'Cancelled'.
create or replace function public.notify_landlord_booking_cancelled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title          text;
  v_landlord_email text;
  v_message        text;
begin
  if new.status <> 'Cancelled' or old.status = 'Cancelled' then
    return new;
  end if;

  select title, landlord_email
  into   v_title, v_landlord_email
  from   public.properties
  where  id = new.property_id;

  if v_landlord_email is null then
    return new;
  end if;

  v_message := new.user_name || ' cancelled their booking request for "' || coalesce(v_title, 'your property') || '".';

  insert into public.notifications (user_email, booking_id, message, link)
  values (v_landlord_email, new.id, v_message, '/landlord');

  return new;
end;
$$;

drop trigger if exists trg_notify_landlord_booking_cancelled on public.bookings;
create trigger trg_notify_landlord_booking_cancelled
  after update on public.bookings
  for each row execute procedure public.notify_landlord_booking_cancelled();
