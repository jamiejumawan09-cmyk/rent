import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const browserGlobal = globalThis as typeof globalThis & {
  __homeRentSupabaseBrowser?: SupabaseClient;
};

// Reuse one client per browser context; channels are managed separately.
export function createSupabaseBrowser() {
  if (!browserGlobal.__homeRentSupabaseBrowser) {
    browserGlobal.__homeRentSupabaseBrowser = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  return browserGlobal.__homeRentSupabaseBrowser;
}
