'use client';

import { create } from 'zustand';
import type { User as SupabaseAuthUser } from '@supabase/supabase-js';
import {
  SupabaseNotConfiguredError,
  toFieldErrors,
  toUserMessage,
  type FieldErrors,
} from '@/lib/errors';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import {
  forgotPasswordSchema,
  loginSchema,
  profileSchema,
  registerSchema,
  resetPasswordSchema,
  type RegisterInput,
} from '@/lib/validation';
import {
  getSession,
  onAuthStateChange,
  requestPasswordReset as requestPasswordResetService,
  resendConfirmation,
  resolveUser,
  signIn as signInService,
  signOut as signOutService,
  signUp as signUpService,
  updateDisplayName,
  updatePassword as updatePasswordService,
} from '@/services/auth.service';
import type { RegisterOutcome, User } from '@/types/domain';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  isLoading: boolean;
  isConfigured: boolean;
  error: string | null;
  fieldErrors: FieldErrors;
  bootstrap: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (input: RegisterInput) => Promise<RegisterOutcome>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<boolean>;
  updatePassword: (password: string, confirmPassword: string) => Promise<boolean>;
  updateProfile: (displayName: string) => Promise<boolean>;
  resendConfirmationEmail: (email: string) => Promise<boolean>;
  clearError: () => void;
  clearFieldErrors: () => void;
}

let bootstrapPromise: Promise<void> | null = null;
let authSubscription: { unsubscribe: () => void } | null = null;
let lastUserId: string | null = null;

export const useAuthStore = create<AuthState>((set, get) => {
  const ensureListener = () => {
    if (authSubscription) return;

    authSubscription = onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        lastUserId = null;
        set({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }

      if (event === 'INITIAL_SESSION') return;
      if (!session?.user) return;
      if (event === 'SIGNED_IN' && get().isLoading) return;
      if (lastUserId === session.user.id) return;

      const authUser: SupabaseAuthUser = session.user;
      // Defer Supabase calls out of the auth callback to avoid its lock.
      setTimeout(() => {
        void resolveUser(authUser)
          .then((user) => {
            lastUserId = authUser.id;
            set({ user, isAuthenticated: true, isInitializing: false });
          })
          .catch((error) => {
            set({ error: toUserMessage(error) });
          });
      }, 0);
    });
  };

  return {
    user: null,
    isAuthenticated: false,
    isInitializing: true,
    isLoading: false,
    isConfigured: isSupabaseConfigured,
    error: null,
    fieldErrors: {},

    bootstrap: async () => {
      if (!isSupabaseConfigured) {
        set({
          isConfigured: false,
          isInitializing: false,
          isLoading: false,
          error: toUserMessage(new SupabaseNotConfiguredError()),
        });
        return;
      }

      if (bootstrapPromise) return bootstrapPromise;

      set({ isConfigured: true });
      ensureListener();

      bootstrapPromise = (async () => {
        try {
          const session = await getSession();
          if (session?.user) {
            const user = await resolveUser(session.user);
            lastUserId = session.user.id;
            set({ user, isAuthenticated: true, isInitializing: false });
          } else {
            set({ user: null, isAuthenticated: false, isInitializing: false });
          }
        } catch (error) {
          set({
            user: null,
            isAuthenticated: false,
            isInitializing: false,
            error: toUserMessage(error),
          });
        }
      })();

      await bootstrapPromise;
    },

    refreshSession: async () => {
      if (!isSupabaseConfigured) return false;

      try {
        const session = await getSession();
        if (!session?.user) {
          lastUserId = null;
          set({ user: null, isAuthenticated: false, isInitializing: false });
          return false;
        }

        const user = await resolveUser(session.user);
        lastUserId = session.user.id;
        set({
          user,
          isAuthenticated: true,
          isInitializing: false,
          error: null,
        });
        return true;
      } catch (error) {
        set({ error: toUserMessage(error), isInitializing: false });
        return false;
      }
    },

    login: async (email, password) => {
      set({ isLoading: true, error: null, fieldErrors: {} });

      const parsed = loginSchema.safeParse({ email, password });
      if (!parsed.success) {
        const fieldErrors = toFieldErrors(parsed.error);
        set({
          isLoading: false,
          fieldErrors,
          error: parsed.error.issues[0]?.message ?? 'Check your email and password.',
        });
        return false;
      }

      try {
        const user = await signInService(parsed.data.email, parsed.data.password);
        lastUserId = user.id;
        set({
          user,
          isAuthenticated: true,
          isInitializing: false,
          isLoading: false,
          error: null,
        });
        return true;
      } catch (error) {
        set({
          isLoading: false,
          error: toUserMessage(error, 'Sign in failed. Please try again.'),
        });
        return false;
      }
    },

    register: async (input) => {
      set({ isLoading: true, error: null, fieldErrors: {} });

      const parsed = registerSchema.safeParse(input);
      if (!parsed.success) {
        const message = parsed.error.issues[0]?.message ?? 'Check your details.';
        set({
          isLoading: false,
          fieldErrors: toFieldErrors(parsed.error),
          error: message,
        });
        return { success: false, needsEmailConfirmation: false, error: message };
      }

      try {
        const result = await signUpService(
          parsed.data.email,
          parsed.data.password,
          parsed.data.name
        );

        if (result.user) {
          lastUserId = result.user.id;
          set({
            user: result.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          return { success: true, needsEmailConfirmation: false };
        }

        set({ isLoading: false, error: null });
        return { success: true, needsEmailConfirmation: true };
      } catch (error) {
        const message = toUserMessage(
          error,
          'We could not create your account. Please try again.'
        );
        set({ isLoading: false, error: message });
        return { success: false, needsEmailConfirmation: false, error: message };
      }
    },

    logout: async () => {
      set({ isLoading: true, error: null });
      try {
        await signOutService();
      } catch {
        // The local session is cleared by the service even if revocation fails.
      }
      lastUserId = null;
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        fieldErrors: {},
      });
    },

    requestPasswordReset: async (email) => {
      set({ isLoading: true, error: null, fieldErrors: {} });

      const parsed = forgotPasswordSchema.safeParse({ email });
      if (!parsed.success) {
        set({
          isLoading: false,
          fieldErrors: toFieldErrors(parsed.error),
          error: parsed.error.issues[0]?.message ?? 'Enter a valid email address.',
        });
        return false;
      }

      try {
        await requestPasswordResetService(parsed.data.email);
        set({ isLoading: false });
        return true;
      } catch (error) {
        set({
          isLoading: false,
          error: toUserMessage(error, 'The reset email could not be sent.'),
        });
        return false;
      }
    },

    updatePassword: async (password, confirmPassword) => {
      set({ isLoading: true, error: null, fieldErrors: {} });

      const parsed = resetPasswordSchema.safeParse({ password, confirmPassword });
      if (!parsed.success) {
        set({
          isLoading: false,
          fieldErrors: toFieldErrors(parsed.error),
          error: parsed.error.issues[0]?.message ?? 'Choose a new password.',
        });
        return false;
      }

      try {
        await updatePasswordService(parsed.data.password);
        set({ isLoading: false });
        return true;
      } catch (error) {
        set({
          isLoading: false,
          error: toUserMessage(error, 'Your password could not be updated.'),
        });
        return false;
      }
    },

    updateProfile: async (displayName) => {
      const user = get().user;
      if (!user) return false;

      set({ isLoading: true, error: null, fieldErrors: {} });

      const parsed = profileSchema.safeParse({ displayName });
      if (!parsed.success) {
        set({
          isLoading: false,
          fieldErrors: toFieldErrors(parsed.error),
          error: parsed.error.issues[0]?.message ?? 'Check your name.',
        });
        return false;
      }

      try {
        const profile = await updateDisplayName(user.id, parsed.data.displayName);
        set({
          user: { ...user, name: profile.display_name },
          isLoading: false,
        });
        lastUserId = user.id;
        return true;
      } catch (error) {
        set({
          isLoading: false,
          error: toUserMessage(error, 'Your profile could not be updated.'),
        });
        return false;
      }
    },

    resendConfirmationEmail: async (email) => {
      set({ isLoading: true, error: null, fieldErrors: {} });

      const parsed = forgotPasswordSchema.safeParse({ email });
      if (!parsed.success) {
        set({
          isLoading: false,
          fieldErrors: toFieldErrors(parsed.error),
          error: parsed.error.issues[0]?.message ?? 'Enter a valid email address.',
        });
        return false;
      }

      try {
        await resendConfirmation(parsed.data.email);
        set({ isLoading: false });
        return true;
      } catch (error) {
        set({
          isLoading: false,
          error: toUserMessage(error, 'The confirmation email could not be sent.'),
        });
        return false;
      }
    },

    clearError: () => set({ error: null }),
    clearFieldErrors: () => set({ fieldErrors: {} }),
  };
});
