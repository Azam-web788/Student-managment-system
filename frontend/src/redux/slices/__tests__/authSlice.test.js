import { describe, it, expect, vi, beforeEach } from 'vitest';
import authReducer, {
  loginUser,
  registerUser,
  logoutUser,
  clearError,
  setUser,
} from '../authSlice';

// Mock the api service module
vi.mock('../../../services/api', () => ({
  default: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  },
}));

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, value) => { store[key] = value; }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('authSlice', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  // ── Initial State ──────────────────────────────────

  describe('initial state', () => {
    it('should return the initial state when no state is given', () => {
      const state = authReducer(undefined, { type: '@@INIT' });
      expect(state).toEqual({
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: null,
      });
    });

    it('should start with null user and no token when localStorage is empty', () => {
      const state = authReducer(undefined, { type: '@@INIT' });
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  // ── Reducers ───────────────────────────────────────

  describe('reducers', () => {
    it('clearError should reset error to null', () => {
      const state = authReducer(
        { user: null, token: null, isAuthenticated: false, loading: false, error: 'Something went wrong' },
        clearError(),
      );
      expect(state.error).toBeNull();
    });

    it('setUser should set user and mark as authenticated', () => {
      const userPayload = { id: 1, fullName: 'Jane Doe', email: 'jane@test.com' };
      const state = authReducer(undefined, setUser(userPayload));
      expect(state.user).toEqual(userPayload);
      expect(state.isAuthenticated).toBe(true);
    });
  });

  // ── Async Thunks ───────────────────────────────────

  describe('loginUser async thunk', () => {
    it('should handle loginUser.fulfilled', async () => {
      const api = (await import('../../../services/api')).default;
      const mockResponse = {
        data: {
          token: 'test-token',
          user: { id: 1, fullName: 'Jane Doe', email: 'jane@test.com' },
        },
      };
      api.login.mockResolvedValue(mockResponse);

      const dispatch = vi.fn();
      const getState = vi.fn();

      const thunk = loginUser({ email: 'jane@test.com', password: 'secret' });
      await thunk(dispatch, getState, undefined);

      const [pendingCall, fulfilledCall] = dispatch.mock.calls;
      expect(pendingCall[0].type).toBe('auth/login/pending');
      expect(fulfilledCall[0].type).toBe('auth/login/fulfilled');
      expect(fulfilledCall[0].payload).toEqual({
        token: 'test-token',
        user: { id: 1, fullName: 'Jane Doe', email: 'jane@test.com' },
      });

      // Verify localStorage was updated
      expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'test-token');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'user',
        JSON.stringify({ id: 1, fullName: 'Jane Doe', email: 'jane@test.com' }),
      );
    });

    it('should handle loginUser.rejected', async () => {
      const api = (await import('../../../services/api')).default;
      api.login.mockRejectedValue(new Error('Invalid credentials'));

      const dispatch = vi.fn();
      const getState = vi.fn();

      const thunk = loginUser({ email: 'bad@test.com', password: 'wrong' });
      await thunk(dispatch, getState, undefined);

      const [pendingCall, rejectedCall] = dispatch.mock.calls;
      expect(pendingCall[0].type).toBe('auth/login/pending');
      expect(rejectedCall[0].type).toBe('auth/login/rejected');
      expect(rejectedCall[0].payload).toBe('Invalid credentials');
    });

    it('should handle loginUser.fulfilled in the reducer', () => {
      const mockPayload = {
        token: 'abc123',
        user: { id: 2, fullName: 'Test User', email: 'test@test.com' },
      };
      const state = authReducer(undefined, loginUser.fulfilled(mockPayload, '', {}));
      expect(state.loading).toBe(false);
      expect(state.user).toEqual(mockPayload.user);
      expect(state.token).toBe('abc123');
      expect(state.isAuthenticated).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should handle loginUser.pending in the reducer', () => {
      const state = authReducer(undefined, loginUser.pending('', {}));
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should handle loginUser.rejected in the reducer', () => {
      const state = authReducer(undefined, loginUser.rejected(new Error(), '', {}, 'Invalid creds'));
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Invalid creds');
    });
  });

  describe('registerUser async thunk', () => {
    it('should handle registerUser.fulfilled in the reducer', () => {
      const mockPayload = {
        token: 'reg-token',
        user: { id: 3, fullName: 'New User', email: 'new@test.com' },
      };
      const state = authReducer(undefined, registerUser.fulfilled(mockPayload, '', {}));
      expect(state.user).toEqual(mockPayload.user);
      expect(state.token).toBe('reg-token');
      expect(state.isAuthenticated).toBe(true);
    });
  });

  describe('logoutUser async thunk', () => {
    it('should clear state and localStorage on fulfilled', () => {
      const initialState = {
        user: { id: 1 },
        token: 'some-token',
        isAuthenticated: true,
        loading: false,
        error: null,
      };
      const state = authReducer(initialState, logoutUser.fulfilled());
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });
});
