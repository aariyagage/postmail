import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // Return a stub client for build time / dev without Supabase
    // All auth operations will fail gracefully
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({
          data: { subscription: { unsubscribe: () => {} } },
        }),
        signInWithOAuth: async () => ({ data: {}, error: new Error("Supabase not configured") }),
        signOut: async () => ({ error: null }),
        exchangeCodeForSession: async () => ({ data: {}, error: new Error("Supabase not configured") }),
      },
    } as unknown as SupabaseClient;
  }

  _client = createBrowserClient(url, key);
  return _client;
}

/**
 * Check if Supabase is actually configured (env vars present).
 */
export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
