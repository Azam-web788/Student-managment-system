import { describe, it, expect, vi, beforeEach } from 'vitest';

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

// Helper to mock fetch responses
function mockFetchOnce(status, body) {
  globalThis.fetch = vi.fn().mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

describe('ApiService', () => {
  let api;

  beforeEach(async () => {
    localStorageMock.clear();
    vi.clearAllMocks();
    // Dynamic import so localStorage mock is in place
    api = (await import('../api')).default;
  });

  // ── Login ──────────────────────────────────────────

  describe('login', () => {
    it('should POST email and password to /auth/login', async () => {
      mockFetchOnce(200, { data: { token: 'abc' }, message: 'Success' });

      const result = await api.login('admin@test.com', 'pass123');

      expect(fetch).toHaveBeenCalledTimes(1);
      const [url, opts] = fetch.mock.calls[0];
      expect(url).toBe('/api/auth/login');
      expect(opts.method).toBe('POST');
      expect(opts.body).toBe(JSON.stringify({ email: 'admin@test.com', password: 'pass123' }));
      expect(result).toEqual({ data: { token: 'abc' }, message: 'Success' });
    });

    it('should throw an error when login fails', async () => {
      mockFetchOnce(401, { message: 'Invalid credentials' });

      await expect(api.login('bad@test.com', 'wrong')).rejects.toThrow('Invalid credentials');
    });
  });

  // ── Get Students ───────────────────────────────────

  describe('getStudents', () => {
    it('should send query parameters', async () => {
      mockFetchOnce(200, { data: [], pagination: { total: 0 } });

      await api.getStudents({ search: 'john', status: 'active', page: 2, limit: 20 });

      const [url] = fetch.mock.calls[0];
      expect(url).toContain('/api/students?');
      expect(url).toContain('search=john');
      expect(url).toContain('status=active');
      expect(url).toContain('page=2');
      expect(url).toContain('limit=20');
    });

    it('should omit empty query parameters', async () => {
      mockFetchOnce(200, { data: [], pagination: { total: 0 } });

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
      mockFetchOnce(201, { data: { id: 1, firstName: 'Jane' } });

      const formData = new FormData();
      formData.append('firstName', 'Jane');
      formData.append('lastName', 'Doe');

      await api.createStudent(formData);

      const [, opts] = fetch.mock.calls[0];
      expect(opts.method).toBe('POST');
      expect(opts.body).toBe(formData); // FormData is not serialized
      // Content-Type should not be set for FormData (browser sets it with boundary)
      expect(opts.headers['Content-Type']).toBeUndefined();
    });
  });

  // ── Auth Token ─────────────────────────────────────

  describe('authentication token', () => {
    it('should include Bearer token in Authorization header when token exists', async () => {
      localStorageMock.setItem('token', 'my-jwt-token');
      mockFetchOnce(200, { data: [] });

      await api.getProfile();

      const [, opts] = fetch.mock.calls[0];
      expect(opts.headers.Authorization).toBe('Bearer my-jwt-token');
    });

    it('should not include Authorization header when no token exists', async () => {
      mockFetchOnce(200, { data: [] });

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
      mockFetchOnce(401, { message: 'Unauthorized' });

      await expect(api.getStudents()).rejects.toThrow('Unauthorized');

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('user');
      expect(window.location.href).toBe('/login');
    });
  });

  // ── Dashboard ─────────────────────────────────────

  describe('dashboard endpoints', () => {
    it('getDashboardStats should call /api/dashboard/stats', async () => {
      mockFetchOnce(200, { data: { totalStudents: 42 } });

      const result = await api.getDashboardStats();

      expect(fetch).toHaveBeenCalledWith('/api/dashboard/stats', expect.any(Object));
      expect(result.data.totalStudents).toBe(42);
    });
  });

  // ── Department endpoints ───────────────────────────

  describe('department endpoints', () => {
    it('getAllDepartments should call /api/departments/all', async () => {
      mockFetchOnce(200, { data: [{ id: 1, name: 'Science' }] });

      const result = await api.getAllDepartments();

      expect(fetch).toHaveBeenCalledWith('/api/departments/all', expect.any(Object));
      expect(result.data).toHaveLength(1);
    });

    it('createDepartment should POST JSON data', async () => {
      mockFetchOnce(201, { data: { id: 1, name: 'Math' } });

      await api.createDepartment({ name: 'Math', code: 'MATH' });

      const [, opts] = fetch.mock.calls[0];
      expect(opts.method).toBe('POST');
      expect(opts.body).toBe(JSON.stringify({ name: 'Math', code: 'MATH' }));
    });
  });

  // ── Course endpoints ───────────────────────────────

  describe('course endpoints', () => {
    it('getCoursesByDepartment should include departmentId in URL', async () => {
      mockFetchOnce(200, { data: [] });

      await api.getCoursesByDepartment('dept-uuid-123');

      const [url] = fetch.mock.calls[0];
      expect(url).toBe('/api/courses/by-department/dept-uuid-123');
    });

    it('deleteCourse should send DELETE request', async () => {
      mockFetchOnce(200, { data: { id: 5 } });

      await api.deleteCourse(5);

      const [, opts] = fetch.mock.calls[0];
      expect(opts.method).toBe('DELETE');
    });
  });
});
