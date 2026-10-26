/** Accepts only same-origin absolute paths, preventing open redirects. */
export function sanitizeNext(
  value: string | null | undefined,
  fallback = '/dashboard'
): string {
  if (!value) return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return fallback;
  }

  try {
    const base = 'https://flowboard.local';
    const url = new URL(value, base);
    if (url.origin !== base) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function authPath(path: string, next?: string | null): string {
  if (!next) return path;
  const safe = sanitizeNext(next);
  return `${path}?next=${encodeURIComponent(safe)}`;
}
