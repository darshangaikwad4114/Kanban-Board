import { useAuthStore } from '@/store/authStore';
import { api, setTokens, clearTokens, loadTokens } from '@/lib/api';
import type { User } from '@kanban/shared';

jest.mock('@/lib/api');

const mockedApi = api as jest.Mocked<typeof api>;
const mockedSetTokens = setTokens as jest.MockedFunction<typeof setTokens>;
const mockedClearTokens = clearTokens as jest.MockedFunction<typeof clearTokens>;
const mockedLoadTokens = loadTokens as jest.MockedFunction<typeof loadTokens>;

function makeUser(id: string): User {
  return {
    _id: id,
    email: 'ada@example.com',
    name: 'Ada Lovelace',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };
}

describe('authStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.clear();
    useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: true, error: null });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('login', () => {
    it('sets user/isAuthenticated and stores tokens on success', async () => {
      const user = makeUser('user-1');
      mockedApi.post.mockResolvedValueOnce({
        success: true,
        data: { accessToken: 'access-1', refreshToken: 'refresh-1', user },
      });

      const result = await useAuthStore.getState().login('ada@example.com', 'password123');

      expect(result).toBe(true);
      expect(mockedSetTokens).toHaveBeenCalledWith('access-1', 'refresh-1');
      const state = useAuthStore.getState();
      expect(state.user).toEqual(user);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets an error and leaves isAuthenticated false on failure', async () => {
      mockedApi.post.mockResolvedValueOnce({
        success: false,
        error: { message: 'Invalid credentials', code: 'UNAUTHORIZED', status: 401 },
      });

      const result = await useAuthStore.getState().login('ada@example.com', 'wrong-password');

      expect(result).toBe(false);
      expect(mockedSetTokens).not.toHaveBeenCalled();
      const state = useAuthStore.getState();
      expect(state.error).toBe('Invalid credentials');
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('logout', () => {
    it('clears tokens and resets state', async () => {
      const user = makeUser('user-1');
      useAuthStore.setState({ user, isAuthenticated: true, isLoading: false, error: null });
      mockedApi.post.mockResolvedValueOnce({ success: true });

      await useAuthStore.getState().logout();

      expect(mockedClearTokens).toHaveBeenCalled();
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('loadUser', () => {
    it('sets isLoading/isAuthenticated to false without calling the API when there is no stored token', async () => {
      await useAuthStore.getState().loadUser();

      expect(mockedLoadTokens).toHaveBeenCalled();
      expect(mockedApi.get).not.toHaveBeenCalled();
      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.isAuthenticated).toBe(false);
    });
  });
});
