import { createClient } from "@supabase/supabase-js";

// Returns a brand-new Supabase client each time.
// Used for Realtime subscriptions in components — each mount
// gets its own client so React Strict Mode double-invocation
// never reuses a torn-down channel.
export function createSupabaseBrowser() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
