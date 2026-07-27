'use client';

import { create } from 'zustand';
import type { User, AuthResponse } from '@kanban/shared';
import { api, setTokens, clearTokens, loadTokens } from '../lib/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isInitializing: boolean; // ← checking for existing session on app load
  isLoading: boolean;      // ← login/register/logout request in flight
  error: string | null;

  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isInitializing: true,  // starts true — we don't know yet if user has a session
  isLoading: false,      // starts false — no request in flight until one starts
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post<AuthResponse>('/auth/login', { email, password });
      if (res.success && res.data) {
        setTokens(res.data.accessToken, res.data.refreshToken);
        set({ user: res.data.user, isAuthenticated: true, isLoading: false });
        return true;
      } else {
        set({ error: res.error?.message || 'Login failed', isLoading: false });
        return false;
      }
    } catch (e: any) {
      set({ error: e.message || 'Network error', isLoading: false });
      return false;
    }
  },

  register: async (email: string, password: string, name: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post<AuthResponse>('/auth/register', { email, password, name });
      if (res.success && res.data) {
        setTokens(res.data.accessToken, res.data.refreshToken);
        set({ user: res.data.user, isAuthenticated: true, isLoading: false });
        return true;
      } else {
        set({ error: res.error?.message || 'Registration failed', isLoading: false });
        return false;
      }
    } catch (e: any) {
      set({ error: e.message || 'Network error', isLoading: false });
      return false;
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    }
    clearTokens();
    set({ user: null, isAuthenticated: false, error: null });
  },

  loadUser: async () => {
    loadTokens();
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) {
      set({ isInitializing: false, isAuthenticated: false });
      return;
    }
    try {
      const res = await api.get<User>('/auth/me');
      if (res.success && res.data) {
        set({ user: res.data, isAuthenticated: true, isInitializing: false });
      } else {
        clearTokens();
        set({ isInitializing: false, isAuthenticated: false });
      }
    } catch {
      set({ isInitializing: false, isAuthenticated: false });
    }
  },

  clearError: () => set({ error: null }),
}));