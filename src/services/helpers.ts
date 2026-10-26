import type { PostgrestError } from '@supabase/supabase-js';
import { NotFoundError, ServiceError } from '@/lib/errors';

export function throwOnError(error: PostgrestError | null): void {
  if (error) {
    throw new ServiceError(error.message, error.code || 'postgrest_error');
  }
}

export function unwrap<T>(
  data: T | null,
  error: PostgrestError | null,
  notFoundMessage = 'That item no longer exists.'
): T {
  throwOnError(error);
  if (data === null) throw new NotFoundError(notFoundMessage);
  return data;
}

export function unwrapList<T>(data: T[] | null, error: PostgrestError | null): T[] {
  throwOnError(error);
  return data ?? [];
}
