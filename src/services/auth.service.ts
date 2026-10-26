import type {
  AuthChangeEvent,
  EmailOtpType,
  Session,
  User as SupabaseAuthUser,
} from '@supabase/supabase-js';
import { ServiceError } from '@/lib/errors';
import { mapAuthUser } from '@/services/mappers';
import { getSupabaseClient } from '@/lib/supabase/client';
import { getAppUrl } from '@/lib/supabase/env';
import type { ProfileRow } from '@/types/database';
import type { User } from '@/types/domain';
import { throwOnError, unwrap } from '@/services/postgrest';

export interface SignUpResult {
  user: User | null;
  needsEmailConfirmation: boolean;
}

const OTP_TYPES = new Set<string>([
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
]);

function authError(message: string, code?: string): ServiceError {
  return new ServiceError(message, code || 'auth_error');
}

export async function fetchProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await getSupabaseClient()
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  throwOnError(error);
  return (data as ProfileRow | null) ?? null;
}

async function buildUser(authUser: SupabaseAuthUser): Promise<User> {
  let profile: ProfileRow | null = null;
  try {
    profile = await fetchProfile(authUser.id);
  } catch {
    // A profile read failure should not block a valid session.
  }
  return mapAuthUser(authUser, profile);
}

export async function resolveUser(authUser: SupabaseAuthUser): Promise<User> {
  return buildUser(authUser);
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await getSupabaseClient().auth.getSession();
  if (error) throw authError(error.message, error.code);
  return data.session;
}

export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
): { unsubscribe: () => void } {
  const { data } = getSupabaseClient().auth.onAuthStateChange(callback);
  return data.subscription;
}

export async function signIn(email: string, password: string): Promise<User> {
  const { data, error } = await getSupabaseClient().auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) throw authError(error.message, error.code);
  if (!data.user) throw authError('Sign in failed. Please try again.');
  return buildUser(data.user);
}

export async function signUp(
  email: string,
  password: string,
  name: string
): Promise<SignUpResult> {
  const { data, error } = await getSupabaseClient().auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: { name: name.trim() },
      emailRedirectTo: `${getAppUrl()}/auth/callback`,
    },
  });

  if (error) throw authError(error.message, error.code);
  if (!data.user) throw authError('We could not create your account. Please try again.');

  // Supabase returns an obfuscated user with no identities when the email is
  // already registered and confirmations are enabled.
  if ((data.user.identities?.length ?? 0) === 0) {
    throw new ServiceError(
      'An account with this email already exists. Try signing in instead.',
      'user_already_exists'
    );
  }

  if (data.session) {
    return { user: await buildUser(data.user), needsEmailConfirmation: false };
  }

  return { user: null, needsEmailConfirmation: true };
}

export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    // Always clear the local session so the UI does not appear signed in
    // after a failed network revocation attempt.
    await supabase.auth.signOut({ scope: 'local' });
    if (error.code !== 'session_not_found') {
      throw authError(error.message, error.code);
    }
  }
}

export async function requestPasswordReset(email: string): Promise<void> {
  const redirectTo = `${getAppUrl()}/auth/callback?next=${encodeURIComponent('/auth/reset-password')}`;
  const { error } = await getSupabaseClient().auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    { redirectTo }
  );
  if (error) throw authError(error.message, error.code);
}

export async function resendConfirmation(email: string): Promise<void> {
  const { error } = await getSupabaseClient().auth.resend({
    type: 'signup',
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: `${getAppUrl()}/auth/callback` },
  });
  if (error) throw authError(error.message, error.code);
}

export async function updatePassword(password: string): Promise<void> {
  const { error } = await getSupabaseClient().auth.updateUser({ password });
  if (error) throw authError(error.message, error.code);
}

export async function updateDisplayName(
  userId: string,
  displayName: string
): Promise<ProfileRow> {
  const { data, error } = await getSupabaseClient()
    .from('profiles')
    .update({ display_name: displayName.trim() })
    .eq('id', userId)
    .select('*')
    .single();

  return unwrap<ProfileRow>(data as ProfileRow | null, error, 'Your profile could not be updated.');
}

/**
 * Completes email confirmation and password recovery redirects. Supports
 * token_hash links, PKCE codes, and sessions already detected by the SDK.
 */
export async function completeAuthRedirect(params: {
  code?: string | null;
  tokenHash?: string | null;
  type?: string | null;
}): Promise<void> {
  const supabase = getSupabaseClient();

  if (params.tokenHash) {
    if (!params.type || !OTP_TYPES.has(params.type)) {
      throw new ServiceError('That link is invalid or has expired.', 'invalid_link');
    }
    const { error } = await supabase.auth.verifyOtp({
      token_hash: params.tokenHash,
      type: params.type as EmailOtpType,
    });
    if (error) throw authError(error.message, error.code || 'invalid_link');
    return;
  }

  if (params.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (!error) return;

    // detectSessionInUrl may have exchanged the code already.
    const { data } = await supabase.auth.getSession();
    if (data.session) return;
    throw authError(error.message, error.code || 'invalid_link');
  }

  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    throw new ServiceError('That link is invalid or has expired.', 'invalid_link');
  }
}
