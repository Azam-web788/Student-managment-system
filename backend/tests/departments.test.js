import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';

const mockQuery = jest.fn();
jest.unstable_mockModule('pg', () => ({
  default: {
    Pool: jest.fn(() => ({
      query: mockQuery,
      connect: jest.fn(),
      end: jest.fn(),
      on: jest.fn(),
    })),
  },
  Pool: jest.fn(() => ({
    query: mockQuery,
    connect: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
  })),
}));

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.LOG_LEVEL = 'error';

let app;
let request;
try {
  const mod = await import('../server.js');
  app = mod.default;
} catch (e) {
  console.error('Failed to import server.js:', e.message);
  throw e;
}
const { generateAuthToken, mockDepartment } = await import('./helpers/testApp.js');

describe('Department Routes - /api/departments', () => {
  let authToken;

  beforeAll(async () => {
    request = (await import('supertest')).default;
    authToken = generateAuthToken();
  });

  beforeEach(() => {
    mockQuery.mockReset();
    // First query is always authenticate middleware - set it up here
    mockQuery.mockResolvedValueOnce({ rows: [{
      id: 'test-user-id-0000-0000-000000000001',
      username: 'admin',
      email: 'admin@test.com',
      full_name: 'Admin User',
      role: 'admin',
      is_active: true,
    }] });
  });

  const authGet = (url) => request(app).get(url).set('Authorization', `Bearer ${authToken}`);
  const authPost = (url) => request(app).post(url).set('Authorization', `Bearer ${authToken}`);
  const authPut = (url) => request(app).put(url).set('Authorization', `Bearer ${authToken}`);
  const authDelete = (url) => request(app).delete(url).set('Authorization', `Bearer ${authToken}`);

  describe('GET /api/departments', () => {
    it('should return paginated list of departments', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '2' }] })
        .mockResolvedValueOnce({ rows: [
          mockDepartment({ id: 'dept-1', name: 'Computer Science', code: 'CS', student_count: 10 }),
          mockDepartment({ id: 'dept-2', name: 'Mathematics', code: 'MATH', student_count: 5 }),
        ] });

      const res = await authGet('/api/departments').expect('Content-Type', /json/);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination.total).toBe(2);
    });

    it('should support search query', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      await authGet('/api/departments?search=Computer').expect('Content-Type', /json/);
      // Second call is the model query (first was auth middleware)
      expect(mockQuery.mock.calls[1][0]).toContain('ILIKE');
    });

    it('should support pagination parameters', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '20' }] })
        .mockResolvedValueOnce({ rows: [mockDepartment()] });

      const res = await authGet('/api/departments?page=2&limit=5').expect('Content-Type', /json/);
      expect(res.body.pagination.page).toBe(2);
      expect(res.body.pagination.limit).toBe(5);
    });

    it('should return empty list when no departments exist', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      const res = await authGet('/api/departments').expect('Content-Type', /json/);
      expect(res.body.data).toHaveLength(0);
      expect(res.body.pagination.total).toBe(0);
    });
  });

  describe('GET /api/departments/all', () => {
    it('should return all active departments (simple list)', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [
        { id: 'dept-1', name: 'Computer Science', code: 'CS' },
        { id: 'dept-2', name: 'Mathematics', code: 'MATH' },
      ] });

      const res = await authGet('/api/departments/all').expect('Content-Type', /json/);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
    });

    it('should only return is_active = true departments', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await authGet('/api/departments/all').expect('Content-Type', /json/);
      // Second call is the model query (first was auth middleware)
      expect(mockQuery.mock.calls[1][0]).toContain('is_active = true');
    });
  });

  describe('GET /api/departments/:id', () => {
    it('should return a department by ID', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockDepartment()] });

      const res = await authGet('/api/departments/dept-id-0000-0000-0000-000000000001')
        .expect('Content-Type', /json/);

      expect(res.body.data.name).toBe('Computer Science');
    });

    it('should return 404 for non-existent department', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await authGet('/api/departments/non-existent-id').expect('Content-Type', /json/);
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/departments', () => {
    it('should create a new department', async () => {
      const newDept = mockDepartment({ id: 'new-dept-id', name: 'Physics', code: 'PHY' });
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [newDept] });

      const res = await authPost('/api/departments')
        .send({ name: 'Physics', code: 'PHY', description: 'Physics Department' })
        .expect('Content-Type', /json/);

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Physics');
    });

    it('should reject duplicate department code', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockDepartment()] });

      const res = await authPost('/api/departments')
        .send({ name: 'Duplicate CS', code: 'CS' })
        .expect('Content-Type', /json/);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already exists');
    });

    it('should require name and code', async () => {
      const res = await authPost('/api/departments')
        .send({ description: 'Missing name and code' })
        .expect('Content-Type', /json/);

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/departments/:id', () => {
    it('should update an existing department', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockDepartment({ name: 'Advanced CS', code: 'ACS' })] });

      const res = await authPut('/api/departments/dept-id-0000-0000-0000-000000000001')
        .send({ name: 'Advanced CS', code: 'ACS' })
        .expect('Content-Type', /json/);

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Advanced CS');
    });

    it('should return 404 when department not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await authPut('/api/departments/non-existent-id')
        .send({ name: 'Ghost Dept' })
        .expect('Content-Type', /json/);

      expect(res.status).toBe(404);
    });

    it('should toggle is_active status', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockDepartment({ is_active: false })] });

      const res = await authPut('/api/departments/dept-id-0000-0000-0000-000000000001')
        .send({ isActive: false })
        .expect('Content-Type', /json/);

      expect(res.status).toBe(200);
      expect(res.body.data.is_active).toBe(false);
    });
  });

  describe('DELETE /api/departments/:id', () => {
    it('should delete a department', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'dept-id' }] });

      const res = await authDelete('/api/departments/dept-id-0000-0000-0000-000000000001')
        .expect('Content-Type', /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 when department not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await authDelete('/api/departments/non-existent-id').expect('Content-Type', /json/);
      expect(res.status).toBe(404);
    });
  });

  describe('Authorization', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/departments').expect('Content-Type', /json/);
      expect(res.status).toBe(401);
    });
  });
});
