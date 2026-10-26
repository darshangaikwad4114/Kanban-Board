import { ZodError } from 'zod';

export class AppError extends Error {
  readonly code: string;

  constructor(message: string, code = 'app_error') {
    super(message);
    this.name = 'AppError';
    this.code = code;
  }
}

export class ServiceError extends AppError {
  constructor(message: string, code = 'service_error') {
    super(message, code);
    this.name = 'ServiceError';
  }
}

export class NotFoundError extends ServiceError {
  constructor(message = 'That item no longer exists.') {
    super(message, 'not_found');
    this.name = 'NotFoundError';
  }
}

export class SupabaseNotConfiguredError extends AppError {
  constructor() {
    super(
      'Supabase is not configured yet. Copy .env.example to .env.local, add your project URL and publishable key, then restart the dev server.',
      'supabase_not_configured'
    );
    this.name = 'SupabaseNotConfiguredError';
  }
}

const CODE_MESSAGES: Record<string, string> = {
  supabase_not_configured:
    'Supabase is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) to .env.local, then restart the dev server.',
  invalid_credentials: 'Incorrect email or password.',
  email_not_confirmed:
    'Please confirm your email before signing in. Check your inbox for the confirmation link.',
  user_already_exists: 'An account with this email already exists. Try signing in instead.',
  email_exists: 'An account with this email already exists. Try signing in instead.',
  weak_password: 'Choose a stronger password with at least 8 characters.',
  over_email_send_rate_limit: 'Too many emails sent. Please wait a few minutes and try again.',
  over_request_rate_limit: 'Too many attempts. Please wait a moment and try again.',
  session_not_found: 'Your session has expired. Please sign in again.',
  refresh_token_not_found: 'Your session has expired. Please sign in again.',
  session_expired: 'Your session has expired. Please sign in again.',
  same_password: 'Choose a password you have not used before.',
  otp_expired: 'That link has expired. Please request a new one.',
  otp_disabled: 'That sign-in method is disabled for this project.',
  signup_disabled: 'New sign-ups are disabled for this project.',
  email_provider_disabled: 'Email sign-in is disabled for this project.',
  validation_failed: 'Please check the information you entered and try again.',
  invalid_link: 'That link is invalid or has expired. Please request a new one.',
  not_found: 'That item no longer exists.',
  '42501': 'You do not have permission to do that.',
  '23505': 'That item already exists.',
  '23503': 'This item is linked to other data and cannot be changed.',
  '23514': 'Some of the entered values are invalid.',
  '22001': 'One of the fields is too long.',
  '22023': 'Some of the entered values are invalid.',
  P0001: 'That action could not be completed.',
  P0002: 'That item no longer exists.',
  PGRST116: 'That item no longer exists.',
  PGRST301: 'Your session has expired. Please sign in again.',
  PGRST302: 'Your session has expired. Please sign in again.',
  '42P01': 'The database is not set up yet. Run the Supabase migrations and try again.',
};

const NETWORK_MESSAGE =
  'Could not reach the server. Check your internet connection and try again.';

interface ErrorLike {
  code?: unknown;
  message?: unknown;
  status?: unknown;
}

function readError(error: unknown): ErrorLike | null {
  return typeof error === 'object' && error !== null ? (error as ErrorLike) : null;
}

function looksInternal(message: string): boolean {
  return /postgrest|permission denied for table|row-level security|violates (foreign key|check|unique)|duplicate key value|syntax error at or near|relation ".*" does not exist/i.test(
    message
  );
}

export function toUserMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.'
): string {
  if (!error) return fallback;

  if (error instanceof ZodError) {
    return error.issues[0]?.message || fallback;
  }

  if (error instanceof AppError) {
    return CODE_MESSAGES[error.code] ?? error.message ?? fallback;
  }

  const record = readError(error);
  const code = typeof record?.code === 'string' ? record.code : '';
  const message =
    typeof record?.message === 'string'
      ? record.message
      : error instanceof Error
        ? error.message
        : String(error);

  if (code && CODE_MESSAGES[code]) return CODE_MESSAGES[code];
  if (/invalid login credentials/i.test(message)) return CODE_MESSAGES.invalid_credentials;
  if (/email not confirmed/i.test(message)) return CODE_MESSAGES.email_not_confirmed;
  if (/user already registered|already been registered/i.test(message)) {
    return CODE_MESSAGES.user_already_exists;
  }
  if (/failed to fetch|fetch failed|networkerror|load failed|network request failed/i.test(message)) {
    return NETWORK_MESSAGE;
  }
  if (/jwt expired|invalid jwt|token has expired/i.test(message)) {
    return CODE_MESSAGES.session_expired;
  }
  if (/row-level security|permission denied/i.test(message)) {
    return CODE_MESSAGES['42501'];
  }

  if (!message || looksInternal(message)) return fallback;
  return message.length > 180 ? fallback : message;
}

export type FieldErrors = Record<string, string>;

export function toFieldErrors(error: ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form';
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}
