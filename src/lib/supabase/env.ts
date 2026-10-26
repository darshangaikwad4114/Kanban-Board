import { SupabaseNotConfiguredError } from '@/lib/errors';

// NEXT_PUBLIC_* values are inlined at build time, so they must be referenced
// statically. Keep both names for compatibility with the legacy anon key.
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
const supabaseKey = (
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  ''
).trim();

export interface SupabaseConfig {
  url: string;
  key: string;
}

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export function getSupabaseConfig(): SupabaseConfig {
  if (!isSupabaseConfigured) {
    throw new SupabaseNotConfiguredError();
  }
  return { url: supabaseUrl, key: supabaseKey };
}

export function getAppUrl(): string {
  const configured = (process.env.NEXT_PUBLIC_APP_URL ?? '').trim();
  if (configured) return configured.replace(/\/+$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost:3000';
}
