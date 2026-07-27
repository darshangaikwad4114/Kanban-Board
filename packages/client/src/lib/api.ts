import type { ApiResponse } from '@kanban/shared';

const API_BASE = '/api';

let accessToken: string | null = null;
let refreshToken: string | null = null;
let isRefreshing = false;
let refreshQueue: Array<{ resolve: (value: boolean) => void }> = [];

export const setTokens = (access: string, refresh: string) => {
  accessToken = access;
  refreshToken = refresh;
  if (typeof window !== 'undefined') {
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
  }
};

export const loadTokens = () => {
  if (typeof window !== 'undefined') {
    accessToken = localStorage.getItem('accessToken');
    refreshToken = localStorage.getItem('refreshToken');
  }
};

export const clearTokens = () => {
  accessToken = null;
  refreshToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
};

export const getAccessToken = () => accessToken;

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshToken) return false;
  
  // If a refresh is already in progress, queue up and wait for it
  if (isRefreshing) {
    return new Promise<boolean>((resolve) => {
      refreshQueue.push({ resolve });
    });
  }
  
  isRefreshing = true;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      clearTokens();
      resolveQueue(false);
      return false;
    }
    const data = await res.json();
    setTokens(data.data.accessToken, data.data.refreshToken);
    resolveQueue(true);
    return true;
  } catch {
    clearTokens();
    resolveQueue(false);
    return false;
  } finally {
    isRefreshing = false;
  }
}

function resolveQueue(success: boolean) {
  refreshQueue.forEach(({ resolve }) => resolve(success));
  refreshQueue = [];
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  loadTokens();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const url = `${API_BASE}${endpoint}`;

  let res;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (err: any) {
    console.error('[apiRequest] fetch failed', err);
    return { success: false, error: { message: err.message || 'Network error', code: 'FETCH_FAILED', status: 0 } };
  }

  if (res.status === 401 && refreshToken) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${accessToken}`;
      res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    } else {
      clearTokens();
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
      return { success: false, error: { message: 'Session expired', code: 'SESSION_EXPIRED', status: 401 } };
    }
  }

  const data = await res.json();
  return data;
}

export const api = {
  get: <T>(endpoint: string) => apiRequest<T>(endpoint),
  post: <T>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(endpoint: string, body: unknown) =>
    apiRequest<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(endpoint: string) => apiRequest<T>(endpoint, { method: 'DELETE' }),
};