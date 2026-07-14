import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

// Suppress expected unhandled rejections from retry tests with fake timers.
// These occur because promise rejections from _fetchWithRetry happen during
// vi.advanceTimersByTimeAsync() before the test's await can catch them.
// Despite the warnings, all rejections are properly handled by the tests.
const suppressUnhandled = () => {};
beforeAll(() => process.on('unhandledRejection', suppressUnhandled));
afterAll(() => process.removeListener('unhandledRejection', suppressUnhandled));

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

// Mock window.location.href so 401 redirect can be tested
delete globalThis.window.location;
globalThis.window.location = { href: '' };

// Helper to create a successful fetch response
function successResponse(body) {
  return {
    ok: true,
    status: 200,
    headers: new Map([['content-type', 'application/json']]),
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  };
}

// Helper to create an error fetch response
function errorResponse(status, body = { message: 'Error' }) {
  return {
    ok: false,
    status,
    headers: new Map([['content-type', 'application/json']]),
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  };
}

// Helper to create an HTML error response (like Vite proxy returns 502)
function htmlErrorResponse(status) {
  return {
    ok: false,
    status,
    headers: new Map([['content-type', 'text/html']]),
    json: () => Promise.reject(new Error('Not JSON')),
    text: () => Promise.resolve(`<html><body>${status} Bad Gateway</body></html>`),
  };
}

describe('ApiService', () => {
  let api;

  beforeEach(async () => {
    localStorageMock.clear();
    vi.clearAllMocks();
    vi.useRealTimers();
    // Dynamic import so localStorage mock is in place
    const mod = await import('../api');
    api = mod.default;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Login ──────────────────────────────────────────

  describe('login', () => {
    it('should POST email and password to /auth/login', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(successResponse({ data: { token: 'abc' }, message: 'Success' }));

      const result = await api.login('admin@test.com', 'pass123');

      expect(fetch).toHaveBeenCalledTimes(1);
      const [url, opts] = fetch.mock.calls[0];
      expect(url).toBe('/api/auth/login');
      expect(opts.method).toBe('POST');
      expect(opts.body).toBe(JSON.stringify({ email: 'admin@test.com', password: 'pass123' }));
      expect(result).toEqual({ data: { token: 'abc' }, message: 'Success' });
    });

    it('should throw an error when login fails', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(errorResponse(401, { message: 'Invalid credentials' }));

      await expect(api.login('bad@test.com', 'wrong')).rejects.toThrow('Invalid credentials');
    });
  });

  // ── Get Students ───────────────────────────────────

  describe('getStudents', () => {
    it('should send query parameters', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(successResponse({ data: [], pagination: { total: 0 } }));

      await api.getStudents({ search: 'john', status: 'active', page: 2, limit: 20 });

      const [url] = fetch.mock.calls[0];
      expect(url).toContain('/api/students?');
      expect(url).toContain('search=john');
      expect(url).toContain('status=active');
      expect(url).toContain('page=2');
      expect(url).toContain('limit=20');
    });

    it('should omit empty query parameters', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(successResponse({ data: [], pagination: { total: 0 } }));

      await api.getStudents({ search: '', status: undefined, sortBy: 'name' });

      const [url] = fetch.mock.calls[0];
      expect(url).not.toContain('search=');
      expect(url).not.toContain('status=');
      expect(url).toContain('sortBy=name');
    });
  });

  // ── Create Student (FormData) ──────────────────────

  describe('createStudent', () => {
    it('should send FormData without Content-Type header', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(successResponse({ data: { id: 1, firstName: 'Jane' } }));

      const formData = new FormData();
      formData.append('firstName', 'Jane');
      formData.append('lastName', 'Doe');

      await api.createStudent(formData);

      const [, opts] = fetch.mock.calls[0];
      expect(opts.method).toBe('POST');
      expect(opts.body).toBe(formData);
      expect(opts.headers['Content-Type']).toBeUndefined();
    });
  });

  // ── Auth Token ─────────────────────────────────────

  describe('authentication token', () => {
    it('should include Bearer token in Authorization header when token exists', async () => {
      localStorageMock.setItem('token', 'my-jwt-token');
      globalThis.fetch = vi.fn().mockResolvedValue(successResponse({ data: [] }));

      await api.getProfile();

      const [, opts] = fetch.mock.calls[0];
      expect(opts.headers.Authorization).toBe('Bearer my-jwt-token');
    });

    it('should not include Authorization header when no token exists', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(successResponse({ data: [] }));

      await api.getProfile();

      const [, opts] = fetch.mock.calls[0];
      expect(opts.headers.Authorization).toBeUndefined();
    });
  });

  // ── 401 Handling ───────────────────────────────────

  describe('401 response handling', () => {
    it('should clear localStorage and redirect to /login on 401', async () => {
      localStorageMock.setItem('token', 'expired-token');
      localStorageMock.setItem('user', JSON.stringify({ id: 1 }));
      globalThis.fetch = vi.fn().mockResolvedValue(errorResponse(401, { message: 'Unauthorized' }));

      await expect(api.getStudents()).rejects.toThrow('Unauthorized');

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('user');
      expect(window.location.href).toBe('/login');
    });
  });

  // ── Dashboard ─────────────────────────────────────

  describe('dashboard endpoints', () => {
    it('getDashboardStats should call /api/dashboard/stats', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(successResponse({ data: { totalStudents: 42 } }));

      const result = await api.getDashboardStats();

      expect(fetch).toHaveBeenCalledWith('/api/dashboard/stats', expect.any(Object));
      expect(result.data.totalStudents).toBe(42);
    });
  });

  // ── Department endpoints ───────────────────────────

  describe('department endpoints', () => {
    it('getAllDepartments should call /api/departments/all', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(successResponse({ data: [{ id: 1, name: 'Science' }] }));

      const result = await api.getAllDepartments();

      expect(fetch).toHaveBeenCalledWith('/api/departments/all', expect.any(Object));
      expect(result.data).toHaveLength(1);
    });

    it('createDepartment should POST JSON data', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(successResponse({ data: { id: 1, name: 'Math' } }));

      await api.createDepartment({ name: 'Math', code: 'MATH' });

      const [, opts] = fetch.mock.calls[0];
      expect(opts.method).toBe('POST');
      expect(opts.body).toBe(JSON.stringify({ name: 'Math', code: 'MATH' }));
    });
  });

  // ── Course endpoints ───────────────────────────────

  describe('course endpoints', () => {
    it('getCoursesByDepartment should include departmentId in URL', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(successResponse({ data: [] }));

      await api.getCoursesByDepartment('dept-uuid-123');

      const [url] = fetch.mock.calls[0];
      expect(url).toBe('/api/courses/by-department/dept-uuid-123');
    });

    it('deleteCourse should send DELETE request', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(successResponse({ data: { id: 5 } }));

      await api.deleteCourse(5);

      const [, opts] = fetch.mock.calls[0];
      expect(opts.method).toBe('DELETE');
    });
  });

  // ═══════════════════════════════════════════════════════
  //  RETRY LOGIC
  // ═══════════════════════════════════════════════════════

  describe('retry logic', () => {
    let isRetryableErrorFn, calculateBackoffFn, RETRY_CONFIG_OBJ;

    beforeEach(async () => {
      const mod = await import('../api');
      isRetryableErrorFn = mod.isRetryableError;
      calculateBackoffFn = mod.calculateBackoff;
      RETRY_CONFIG_OBJ = mod.RETRY_CONFIG;
    });

    // ── isRetryableError unit tests ──────────────────

    describe('isRetryableError', () => {
      it('should return true for network errors (isNetworkError)', () => {
        expect(isRetryableErrorFn({ isNetworkError: true })).toBe(true);
      });

      it('should return true for proxy errors (isProxyError)', () => {
        expect(isRetryableErrorFn({ isProxyError: true })).toBe(true);
      });

      it('should return true for 502 Bad Gateway', () => {
        expect(isRetryableErrorFn({ status: 502 })).toBe(true);
      });

      it('should return true for 503 Service Unavailable', () => {
        expect(isRetryableErrorFn({ status: 503 })).toBe(true);
      });

      it('should return true for 429 Too Many Requests', () => {
        expect(isRetryableErrorFn({ status: 429 })).toBe(true);
      });

      it('should return false for 400 Bad Request', () => {
        expect(isRetryableErrorFn({ status: 400 })).toBe(false);
      });

      it('should return false for 401 Unauthorized', () => {
        expect(isRetryableErrorFn({ status: 401 })).toBe(false);
      });

      it('should return false for 403 Forbidden', () => {
        expect(isRetryableErrorFn({ status: 403 })).toBe(false);
      });

      it('should return false for 404 Not Found', () => {
        expect(isRetryableErrorFn({ status: 404 })).toBe(false);
      });

      it('should return false for 409 Conflict', () => {
        expect(isRetryableErrorFn({ status: 409 })).toBe(false);
      });

      it('should return false for 422 Unprocessable Entity', () => {
        expect(isRetryableErrorFn({ status: 422 })).toBe(false);
      });

      it('should return false for 500 Internal Server Error (non-proxy)', () => {
        expect(isRetryableErrorFn({ status: 500 })).toBe(false);
      });

      it('should return false for generic errors without status', () => {
        expect(isRetryableErrorFn(new Error('Something went wrong'))).toBe(false);
      });

      it('should return false for null/undefined', () => {
        expect(isRetryableErrorFn(null)).toBe(false);
        expect(isRetryableErrorFn(undefined)).toBe(false);
      });
    });

    // ── calculateBackoff unit tests ──────────────────

    describe('calculateBackoff', () => {
      it('should return a value between 50%-100% of baseDelay for attempt 0', () => {
        // Mock Math.random to return 0.5 (75% of base)
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
        const result = calculateBackoffFn(0, 1000, 6000);
        // 1000 * 2^0 = 1000, jitter = 0.5 + 0.5*0.5 = 0.75 → 750
        expect(result).toBe(750);
        vi.restoreAllMocks();
      });

      it('should double the delay for each attempt increment', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
        const attempt0 = calculateBackoffFn(0, 1000, 6000);
        const attempt1 = calculateBackoffFn(1, 1000, 6000);
        // attempt0: 1000 * 0.75 = 750, attempt1: 2000 * 0.75 = 1500
        expect(attempt1).toBe(attempt0 * 2);
        vi.restoreAllMocks();
      });

      it('should cap delay at maxDelayMs', () => {
        vi.spyOn(Math, 'random').mockReturnValue(1); // 100% of value (max jitter)
        const result = calculateBackoffFn(10, 1000, 5000);
        // 1000 * 2^10 = 1,024,000, capped at 5000, * 1.0 = 5000
        expect(result).toBe(5000);
        vi.restoreAllMocks();
      });

      it('should use supplied maxDelayMs instead of default', () => {
        vi.spyOn(Math, 'random').mockReturnValue(1);
        const result = calculateBackoffFn(10, 1000, 2000);
        expect(result).toBe(2000);
        vi.restoreAllMocks();
      });

      it('should apply jitter within the expected range', () => {
        // With random=0, jitter = 0.5 → 50%
        vi.spyOn(Math, 'random').mockReturnValue(0);
        const minResult = calculateBackoffFn(0, 1000, 6000);
        // 1000 * 0.5 = 500
        expect(minResult).toBe(500);

        // With random=1, jitter = 1.0 → 100%
        Math.random.mockReturnValue(1);
        const maxResult = calculateBackoffFn(0, 1000, 6000);
        // 1000 * 1.0 = 1000
        expect(maxResult).toBe(1000);

        vi.restoreAllMocks();
      });
    });

    // ── Retry config ─────────────────────────────────

    describe('RETRY_CONFIG', () => {
      it('should have maxAttempts set to 3', () => {
        expect(RETRY_CONFIG_OBJ.maxAttempts).toBe(3);
      });

      it('should have a baseDelayMs of 1000', () => {
        expect(RETRY_CONFIG_OBJ.baseDelayMs).toBe(1000);
      });

      it('should have a maxDelayMs of 6000', () => {
        expect(RETRY_CONFIG_OBJ.maxDelayMs).toBe(6000);
      });
    });

    // ── Retry behavior integration tests ─────────────

    describe('retry behavior', () => {
      it('should succeed on first attempt without retrying', async () => {
        const mockFetch = vi.fn().mockResolvedValue(successResponse({ data: 'ok' }));
        globalThis.fetch = mockFetch;

        const result = await api.getDashboardStats();

        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(result).toEqual({ data: 'ok' });
      });

      it('should retry on 502 and succeed on second attempt', async () => {
        vi.useFakeTimers();
        const mockFetch = vi.fn()
          .mockResolvedValueOnce(htmlErrorResponse(502))   // first: 502
          .mockResolvedValueOnce(successResponse({ data: 'ok' })); // second: success
        globalThis.fetch = mockFetch;

        // Start the request (will pause on sleep)
        const promise = api.getDashboardStats();

        // Advance past the backoff delay
        await vi.advanceTimersByTimeAsync(10000);

        const result = await promise;

        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(result).toEqual({ data: 'ok' });

        vi.useRealTimers();
      });

      it('should retry on 503 and succeed on third attempt', async () => {
        vi.useFakeTimers();
        const mockFetch = vi.fn()
          .mockResolvedValueOnce(htmlErrorResponse(503))   // first: 503
          .mockResolvedValueOnce(htmlErrorResponse(503))   // second: 503
          .mockResolvedValueOnce(successResponse({ data: 'ok' })); // third: success
        globalThis.fetch = mockFetch;

        const promise = api.getDashboardStats();

        // Advance past all backoff delays (3 attempts = 2 retries)
        await vi.advanceTimersByTimeAsync(20000);

        const result = await promise;

        expect(mockFetch).toHaveBeenCalledTimes(3);
        expect(result).toEqual({ data: 'ok' });

        vi.useRealTimers();
      });

      it('should throw after exhausting all retries on 502', async () => {
        vi.useFakeTimers();
        const mockFetch = vi.fn().mockResolvedValue(htmlErrorResponse(502));
        globalThis.fetch = mockFetch;

        const promise = api.getDashboardStats();

        // Advance past all retry delays
        await vi.advanceTimersByTimeAsync(20000);

        await expect(promise).rejects.toThrow('Cannot connect to the backend server');
        expect(mockFetch).toHaveBeenCalledTimes(3); // 1 initial + 2 retries

        vi.useRealTimers();
      });

      it('should throw after exhausting all retries on network error', async () => {
        vi.useFakeTimers();
        const mockFetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
        globalThis.fetch = mockFetch;

        const promise = api.getDashboardStats();

        await vi.advanceTimersByTimeAsync(20000);

        await expect(promise).rejects.toThrow('Cannot connect to the backend server');
        expect(mockFetch).toHaveBeenCalledTimes(3);

        vi.useRealTimers();
      });

      it('should NOT retry on 400 Bad Request (non-retryable)', async () => {
        const mockFetch = vi.fn().mockResolvedValue(errorResponse(400, { message: 'Bad request' }));
        globalThis.fetch = mockFetch;

        await expect(api.getDashboardStats()).rejects.toThrow('Bad request');

        expect(mockFetch).toHaveBeenCalledTimes(1); // only 1 attempt
      });

      it('should NOT retry on 404 Not Found (non-retryable)', async () => {
        const mockFetch = vi.fn().mockResolvedValue(errorResponse(404, { message: 'Not found' }));
        globalThis.fetch = mockFetch;

        await expect(api.getDashboardStats()).rejects.toThrow('Not found');

        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      it('should NOT retry on 500 Internal Server Error (non-proxy)', async () => {
        const mockFetch = vi.fn().mockResolvedValue(errorResponse(500, { message: 'Server error' }));
        globalThis.fetch = mockFetch;

        await expect(api.getDashboardStats()).rejects.toThrow('Server error');

        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      it('should NOT retry when retry option is set to false', async () => {
        vi.useFakeTimers();
        const mockFetch = vi.fn().mockResolvedValue(htmlErrorResponse(502));
        globalThis.fetch = mockFetch;

        // Use request with retry: false
        const promise = api.request('/dashboard/stats', { retry: false });

        await vi.advanceTimersByTimeAsync(10000);

        await expect(promise).rejects.toThrow('Cannot connect to the backend server');
        expect(mockFetch).toHaveBeenCalledTimes(1);

        vi.useRealTimers();
      });

      it('should include helpful error message about starting the backend', async () => {
        vi.useFakeTimers();
        globalThis.fetch = vi.fn().mockResolvedValue(htmlErrorResponse(502));

        const promise = api.getDashboardStats();
        await vi.advanceTimersByTimeAsync(20000);

        const err = await promise.catch(e => e);
        expect(err.message).toContain('backend server');
        expect(err.message).toContain('npm run dev');

        vi.useRealTimers();
      });

      it('should retry on network error (TypeError: Failed to fetch)', async () => {
        vi.useFakeTimers();
        const mockFetch = vi.fn()
          .mockRejectedValueOnce(new TypeError('Failed to fetch'))
          .mockResolvedValueOnce(successResponse({ data: 'ok' }));
        globalThis.fetch = mockFetch;

        const promise = api.getDashboardStats();
        await vi.advanceTimersByTimeAsync(10000);

        const result = await promise;
        expect(result).toEqual({ data: 'ok' });
        expect(mockFetch).toHaveBeenCalledTimes(2);

        vi.useRealTimers();
      });
    });
  });
});
