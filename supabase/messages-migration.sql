-- Bring the existing messages table in line with the in-system messaging API.
-- This migration assumes public.messages already exists.
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS is_read boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS thread_key text;

-- Direct support conversations do not belong to a property.
ALTER TABLE public.messages
  ALTER COLUMN property_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_thread_key
  ON public.messages (thread_key);

CREATE INDEX IF NOT EXISTS idx_messages_receiver_unread
  ON public.messages (receiver_email, is_read);

-- Make the new fields visible to Supabase's PostgREST API.
NOTIFY pgrst, 'reload schema';
