import type { Session } from '@supabase/supabase-js';
import { useAuthStore } from '@/store/authStore';
import * as authService from '@/services/auth.service';
import { ServiceError } from '@/lib/errors';
import type { User } from '@/types/domain';

jest.mock('@/lib/supabase/env', () => ({
  isSupabaseConfigured: true,
  getAppUrl: () => 'http://localhost:3000',
}));

jest.mock('@/services/auth.service', () => ({
  getSession: jest.fn(),
  onAuthStateChange: jest.fn(() => ({ unsubscribe: jest.fn() })),
  requestPasswordReset: jest.fn(),
  resendConfirmation: jest.fn(),
  resolveUser: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
  signUp: jest.fn(),
  updateDisplayName: jest.fn(),
  updatePassword: jest.fn(),
}));

const USER: User = { id: 'user-1', email: 'ada@example.com', name: 'Ada Lovelace' };

function makeSession(): Session {
  return {
    access_token: 'access',
    refresh_token: 'refresh',
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: USER.id,
      email: USER.email,
      app_metadata: {},
      user_metadata: { name: USER.name },
      aud: 'authenticated',
      created_at: '2026-01-01T00:00:00.000Z',
    },
  } as Session;
}

const mocked = jest.mocked(authService);

function resetStore(): void {
  useAuthStore.setState({
    user: null,
    isAuthenticated: false,
    isInitializing: true,
    isLoading: false,
    isConfigured: true,
    error: null,
    fieldErrors: {},
  });
}

describe('authStore', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    resetStore();
    mocked.onAuthStateChange.mockReturnValue({ unsubscribe: jest.fn() });
  });

  it('bootstraps an existing session into an authenticated user', async () => {
    mocked.getSession.mockResolvedValue(makeSession());
    mocked.resolveUser.mockResolvedValue(USER);

    await useAuthStore.getState().bootstrap();

    const state = useAuthStore.getState();
    expect(state.user).toEqual(USER);
    expect(state.isAuthenticated).toBe(true);
    expect(state.isInitializing).toBe(false);
    expect(mocked.resolveUser).toHaveBeenCalledWith(makeSession().user);
  });

  it('rejects malformed login input without calling Supabase', async () => {
    const ok = await useAuthStore.getState().login('not-an-email', 'secret');

    const state = useAuthStore.getState();
    expect(ok).toBe(false);
    expect(state.fieldErrors.email).toBeTruthy();
    expect(state.isLoading).toBe(false);
    expect(mocked.signIn).not.toHaveBeenCalled();
  });

  it('stores the user after a successful login', async () => {
    mocked.signIn.mockResolvedValue(USER);

    const ok = await useAuthStore.getState().login('ada@example.com', 'correct-horse');

    const state = useAuthStore.getState();
    expect(ok).toBe(true);
    expect(state.user).toEqual(USER);
    expect(state.isAuthenticated).toBe(true);
    expect(state.error).toBeNull();
    expect(mocked.signIn).toHaveBeenCalledWith('ada@example.com', 'correct-horse');
  });

  it('maps service errors to friendly login messages', async () => {
    mocked.signIn.mockRejectedValue(new ServiceError('failed', 'invalid_credentials'));

    const ok = await useAuthStore.getState().login('ada@example.com', 'wrong-password');

    const state = useAuthStore.getState();
    expect(ok).toBe(false);
    expect(state.error).toBe('Incorrect email or password.');
    expect(state.isLoading).toBe(false);
  });

  it('returns field errors for mismatched registration passwords', async () => {
    const outcome = await useAuthStore.getState().register({
      name: 'Ada',
      email: 'ada@example.com',
      password: 'correct-horse',
      confirmPassword: 'different',
    });

    expect(outcome.success).toBe(false);
    expect(useAuthStore.getState().fieldErrors.confirmPassword).toBeTruthy();
    expect(mocked.signUp).not.toHaveBeenCalled();
  });

  it('signs in immediately after registration when a session is returned', async () => {
    mocked.signUp.mockResolvedValue({ user: USER, needsEmailConfirmation: false });

    const outcome = await useAuthStore.getState().register({
      name: 'Ada',
      email: 'ada@example.com',
      password: 'correct-horse',
      confirmPassword: 'correct-horse',
    });

    expect(outcome).toEqual({ success: true, needsEmailConfirmation: false });
    expect(useAuthStore.getState().user).toEqual(USER);
  });

  it('reports email confirmation when no session is returned', async () => {
    mocked.signUp.mockResolvedValue({ user: null, needsEmailConfirmation: true });

    const outcome = await useAuthStore.getState().register({
      name: 'Ada',
      email: 'ada@example.com',
      password: 'correct-horse',
      confirmPassword: 'correct-horse',
    });

    expect(outcome).toEqual({ success: true, needsEmailConfirmation: true });
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('refreshes a valid session', async () => {
    useAuthStore.setState({ user: null, isAuthenticated: false, isInitializing: true });
    mocked.getSession.mockResolvedValue(makeSession());
    mocked.resolveUser.mockResolvedValue(USER);

    const ok = await useAuthStore.getState().refreshSession();

    expect(ok).toBe(true);
    expect(useAuthStore.getState().user).toEqual(USER);
    expect(useAuthStore.getState().isInitializing).toBe(false);
  });

  it('clears the user when the session has expired', async () => {
    useAuthStore.setState({ user: USER, isAuthenticated: true, isInitializing: false });
    mocked.getSession.mockResolvedValue(null);

    const ok = await useAuthStore.getState().refreshSession();

    expect(ok).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('clears local auth state on logout', async () => {
    useAuthStore.setState({
      user: USER,
      isAuthenticated: true,
      isInitializing: false,
    });
    mocked.signOut.mockResolvedValue();

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
  });

  it('updates the display name in the current user', async () => {
    useAuthStore.setState({ user: USER, isAuthenticated: true, isInitializing: false });
    mocked.updateDisplayName.mockResolvedValue({
      id: USER.id,
      display_name: 'Ada King',
      created_at: '',
      updated_at: '',
    });

    const ok = await useAuthStore.getState().updateProfile('Ada King');

    expect(ok).toBe(true);
    expect(useAuthStore.getState().user?.name).toBe('Ada King');
    expect(mocked.updateDisplayName).toHaveBeenCalledWith(USER.id, 'Ada King');
  });

  it('does not update the profile when no user is signed in', async () => {
    const ok = await useAuthStore.getState().updateProfile('Ada King');
    expect(ok).toBe(false);
    expect(mocked.updateDisplayName).not.toHaveBeenCalled();
  });
});
