-- ============================================================
-- HomeRent — Booking Integrity Triggers
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- These act as a database-level safety net — they enforce the
-- same rules as the application code, so the invariants hold
-- even if the API is called directly or bypassed.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- TRIGGER 1: On booking APPROVED
-- • Mark the property as Booked
-- • Auto-reject all other Pending bookings for the same property
-- • Insert rejection notifications for those tenants
-- ────────────────────────────────────────────────────────────
create or replace function public.handle_booking_approved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
begin
  -- Only fire when status transitions TO 'Approved'
  if new.status <> 'Approved' or old.status = 'Approved' then
    return new;
  end if;

  -- Get property title
  select title into v_title
  from   public.properties
  where  id = new.property_id;

  -- Mark property as Booked
  update public.properties
  set    status = 'Booked'
  where  id = new.property_id
    and  status = 'Available';  -- only if still Available (idempotent)

  -- Auto-reject other Pending bookings for the same property
  with rejected as (
    update public.bookings
    set    status = 'Rejected'
    where  property_id = new.property_id
      and  status      = 'Pending'
      and  id         <> new.id
    returning id, user_email
  )
  insert into public.notifications (user_email, booking_id, message, link, is_read)
  select
    r.user_email,
    r.id,
    'Your booking for "' || coalesce(v_title, 'the property') || '" was not approved — another tenant was selected.',
    '/bookings',
    false
  from rejected r;

  return new;
end;
$$;

drop trigger if exists trg_booking_approved on public.bookings;
create trigger trg_booking_approved
  after update on public.bookings
  for each row execute procedure public.handle_booking_approved();

-- ────────────────────────────────────────────────────────────
-- TRIGGER 2: On booking CANCELLED (when it was Approved)
-- • Restore the property back to Available
-- ────────────────────────────────────────────────────────────
create or replace function public.handle_booking_cancelled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only fire when an Approved booking is cancelled
  if new.status <> 'Cancelled' or old.status <> 'Approved' then
    return new;
  end if;

  update public.properties
  set    status = 'Available'
  where  id = new.property_id
    and  status = 'Booked';  -- idempotent: only if currently Booked

  return new;
end;
$$;

drop trigger if exists trg_booking_cancelled on public.bookings;
create trigger trg_booking_cancelled
  after update on public.bookings
  for each row execute procedure public.handle_booking_cancelled();

-- ────────────────────────────────────────────────────────────
-- TRIGGER 3: Prevent inserting a booking for an unavailable property
-- Also prevents duplicate active bookings at the DB level.
-- ────────────────────────────────────────────────────────────
create or replace function public.validate_booking_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prop_status text;
  v_duplicate   boolean;
begin
  -- Check property availability
  select status into v_prop_status
  from   public.properties
  where  id = new.property_id;

  if v_prop_status is null then
    raise exception 'Property not found.';
  end if;

  if v_prop_status <> 'Available' then
    raise exception 'Property is % and cannot be booked.', v_prop_status;
  end if;

  -- Check for duplicate active booking
  select exists (
    select 1 from public.bookings
    where  property_id = new.property_id
      and  user_email  = new.user_email
      and  status in ('Pending', 'Approved')
  ) into v_duplicate;

  if v_duplicate then
    raise exception 'You already have an active booking for this property.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_booking_insert on public.bookings;
create trigger trg_validate_booking_insert
  before insert on public.bookings
  for each row execute procedure public.validate_booking_insert();

-- ────────────────────────────────────────────────────────────
-- TRIGGER 4: Prevent invalid status transitions
-- Valid transitions:
--   Pending  → Approved | Rejected | Cancelled
--   Approved → Cancelled
--   Rejected → (none — terminal)
--   Cancelled → (none — terminal)
-- ────────────────────────────────────────────────────────────
create or replace function public.validate_booking_status_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- No-op if status unchanged
  if new.status = old.status then
    return new;
  end if;

  -- Rejected and Cancelled are terminal
  if old.status in ('Rejected', 'Cancelled') then
    raise exception 'Cannot change status of a % booking.', old.status;
  end if;

  -- Approved can only move to Cancelled
  if old.status = 'Approved' and new.status not in ('Cancelled') then
    raise exception 'An Approved booking can only be Cancelled, not %.', new.status;
  end if;

  -- Pending can move to Approved, Rejected, or Cancelled
  if old.status = 'Pending' and new.status not in ('Approved', 'Rejected', 'Cancelled') then
    raise exception 'A Pending booking cannot transition to %.', new.status;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_booking_status on public.bookings;
create trigger trg_validate_booking_status
  before update on public.bookings
  for each row execute procedure public.validate_booking_status_transition();
