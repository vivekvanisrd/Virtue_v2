import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export { createSupabaseClient as createClient };

/**
 * V2 REAL-TIME CLIENT (Public)
 * 
 * Uses Browser-safe environment variables to enable realtime
 * subscriptions on the frontend.
 */
export const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
