-- ============================================================
-- HomeRent — Booking Form Enhancements Migration
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── New columns on bookings ──────────────────────────────────
alter table public.bookings
  add column if not exists lease_duration    text,        -- e.g. '1 month', '6 months', '1 year'
  add column if not exists move_out_date     date,        -- auto-calculated or manual
  add column if not exists occupants         smallint,    -- number of people moving in
  add column if not exists introduction      text,        -- "About me" from tenant
  add column if not exists employment_status text,        -- Employed | Self-employed | Student | Other
  add column if not exists contact_method    text,        -- Phone | Email | Messaging
  add column if not exists gov_id_url        text,        -- Supabase Storage URL
  add column if not exists income_proof_url  text;        -- Supabase Storage URL

-- ── Storage bucket: tenant-documents (private) ───────────────
-- Stores government IDs and proof-of-income files.
-- Only the uploader and landlords can read; service role manages uploads.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tenant-documents',
  'tenant-documents',
  false,
  10485760,   -- 10 MB
  array[
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
    'application/pdf'
  ]
)
on conflict (id) do nothing;

-- Tenants can upload their own documents
create policy "tenant-docs: tenant upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'tenant-documents');

-- Owner and landlords can read
create policy "tenant-docs: owner read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'tenant-documents'
    and (
      owner = auth.uid()
      or (select role from public.userss where email = (auth.jwt()->>'email')) in ('admin', 'landlord')
    )
  );
