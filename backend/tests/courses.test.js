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
const { generateAuthToken, mockCourse } = await import('./helpers/testApp.js');

describe('Course Routes - /api/courses', () => {
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

  describe('GET /api/courses', () => {
    it('should return paginated list of courses', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '2' }] })
        .mockResolvedValueOnce({ rows: [
          mockCourse({ id: 'course-1', name: 'CS 101', code: 'CS101', credits: 3 }),
          mockCourse({ id: 'course-2', name: 'CS 201', code: 'CS201', credits: 4 }),
        ] });

      const res = await authGet('/api/courses').expect('Content-Type', /json/);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination.total).toBe(2);
    });

    it('should support search query', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      await authGet('/api/courses?search=Programming').expect('Content-Type', /json/);
      // Second call is the model query (first was auth middleware)
      expect(mockQuery.mock.calls[1][0]).toContain('ILIKE');
    });

    it('should filter by department ID', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [mockCourse()] });

      const res = await authGet('/api/courses?departmentId=dept-id-0000-0000-0000-000000000001')
        .expect('Content-Type', /json/);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it('should return empty list when no courses exist', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      const res = await authGet('/api/courses').expect('Content-Type', /json/);
      expect(res.body.data).toHaveLength(0);
    });
  });

  describe('GET /api/courses/all', () => {
    it('should return all active courses for dropdown', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockCourse()] });

      const res = await authGet('/api/courses/all').expect('Content-Type', /json/);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/courses/by-department/:departmentId', () => {
    it('should return courses for a specific department', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockCourse()] });

      const res = await authGet('/api/courses/by-department/dept-id-0000-0000-0000-000000000001')
        .expect('Content-Type', /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return empty array for department with no courses', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await authGet('/api/courses/by-department/non-existent-dept')
        .expect('Content-Type', /json/);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });
  });

  describe('GET /api/courses/:id', () => {
    it('should return a course by ID', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockCourse()] });

      const res = await authGet('/api/courses/course-id-0000-0000-0000-000000000001')
        .expect('Content-Type', /json/);

      expect(res.body.data.name).toBe('Introduction to Programming');
    });

    it('should return 404 for non-existent course', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await authGet('/api/courses/non-existent-id').expect('Content-Type', /json/);
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/courses', () => {
    const newCourseData = {
      name: 'Data Structures', code: 'CS301',
      description: 'Advanced data structures', credits: 4,
      departmentId: '22345678-1234-4234-9234-123456789012',
    };

    it('should create a new course', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [mockCourse({ id: 'new-course-id', name: 'Data Structures', code: 'CS301' })] });

      const res = await authPost('/api/courses')
        .send(newCourseData)
        .expect('Content-Type', /json/);

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Data Structures');
    });

    it('should reject duplicate course code', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockCourse()] });

      const res = await authPost('/api/courses')
        .send(newCourseData)
        .expect('Content-Type', /json/);

      expect(res.status).toBe(400);
    });

    it('should require name, code, credits, and departmentId', async () => {
      const res = await authPost('/api/courses')
        .send({ description: 'Missing fields' })
        .expect('Content-Type', /json/);

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/courses/:id', () => {
    it('should update an existing course', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockCourse({ name: 'Advanced Programming', credits: 4 })] });

      const res = await authPut('/api/courses/course-id-0000-0000-0000-000000000001')
        .send({ name: 'Advanced Programming', credits: 4 })
        .expect('Content-Type', /json/);

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Advanced Programming');
    });

    it('should return 404 when course not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await authPut('/api/courses/non-existent-id')
        .send({ name: 'Ghost Course' })
        .expect('Content-Type', /json/);

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/courses/:id', () => {
    it('should delete a course', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'course-id' }] });

      const res = await authDelete('/api/courses/course-id-0000-0000-0000-000000000001')
        .expect('Content-Type', /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 when course not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await authDelete('/api/courses/non-existent-id').expect('Content-Type', /json/);
      expect(res.status).toBe(404);
    });
  });

  describe('Authorization', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/courses').expect('Content-Type', /json/);
      expect(res.status).toBe(401);
    });
  });
});
