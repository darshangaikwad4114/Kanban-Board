import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from './env';

let client: SupabaseClient | null = null;

/**
 * Browser-only singleton. Authentication is persisted by the SDK and every
 * query is executed as the signed-in user, so RLS remains the security boundary.
 */
export function getSupabaseClient(): SupabaseClient {
  if (client) return client;

  const { url, key } = getSupabaseConfig();
  client = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
    realtime: {
      params: { eventsPerSecond: 10 },
    },
    global: {
      headers: { 'x-application-name': 'flowboard' },
    },
  });

  return client;
}
