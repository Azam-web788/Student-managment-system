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
const { generateAuthToken, mockStudent, mockDepartment, mockCourse } = await import('./helpers/testApp.js');

describe('Student Routes - /api/students', () => {
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

  describe('GET /api/students', () => {
    it('should return paginated list of students', async () => {
      const students = [
        mockStudent({ id: 'student-1', first_name: 'Alice', last_name: 'Smith' }),
        mockStudent({ id: 'student-2', first_name: 'Bob', last_name: 'Jones' }),
      ];

      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '2' }] })
        .mockResolvedValueOnce({ rows: students });

      const res = await authGet('/api/students')
        .expect('Content-Type', /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination.total).toBe(2);
      expect(res.body.pagination.page).toBe(1);
    });

    it('should support search query', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [mockStudent()] });

      await authGet('/api/students?search=John')
        .expect('Content-Type', /json/);

      // Second call is the model query (first was auth middleware)
      expect(mockQuery.mock.calls[1][0]).toContain('ILIKE');
    });

    it('should filter by department', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [mockStudent()] });

      await authGet('/api/students?departmentId=22345678-1234-1234-1234-123456789012')
        .expect('Content-Type', /json/);

      // Second call is the model query (first was auth middleware)
      expect(mockQuery.mock.calls[1][0]).toContain('department_id');
    });

    it('should filter by status', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [mockStudent({ status: 'active' })] });

      const res = await authGet('/api/students?status=active')
        .expect('Content-Type', /json/);

      expect(res.status).toBe(200);
      expect(res.body.data[0].status).toBe('active');
    });

    it('should filter by gender', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [mockStudent({ gender: 'Female' })] });

      const res = await authGet('/api/students?gender=Female')
        .expect('Content-Type', /json/);

      expect(res.status).toBe(200);
    });

    it('should support sorting', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '2' }] })
        .mockResolvedValueOnce({ rows: [mockStudent(), mockStudent()] });

      await authGet('/api/students?sortBy=first_name&sortOrder=ASC')
        .expect('Content-Type', /json/);

      // Third call is the SELECT query (first: auth, second: COUNT)
      expect(mockQuery.mock.calls[2][0]).toContain('ORDER BY');
    });

    it('should support pagination', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '50' }] })
        .mockResolvedValueOnce({ rows: [mockStudent()] });

      const res = await authGet('/api/students?page=3&limit=10')
        .expect('Content-Type', /json/);

      expect(res.status).toBe(200);
      expect(res.body.pagination.page).toBe(3);
      expect(res.body.pagination.limit).toBe(10);
    });

    it('should return empty list when no students match', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      const res = await authGet('/api/students?search=NonExistentName')
        .expect('Content-Type', /json/);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
      expect(res.body.pagination.total).toBe(0);
    });
  });

  describe('GET /api/students/:id', () => {
    it('should return a student by ID', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [mockStudent()] });

      const res = await authGet('/api/students/42345678-1234-4234-9234-123456789012')
        .expect('Content-Type', /json/);

      expect(res.status).toBe(200);
      expect(res.body.data.first_name).toBe('John');
      expect(res.body.data.last_name).toBe('Doe');
      expect(res.body.data.email).toBe('john.doe@test.com');
    });

    it('should return 404 for non-existent student', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] });

      const res = await authGet('/api/students/non-existent-id')
        .expect('Content-Type', /json/);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/students', () => {
    const validPayload = {
      firstName: 'Jane', lastName: 'Smith',
      email: 'jane.smith@test.com', phone: '+1-555-0200',
      dateOfBirth: '2001-03-20', gender: 'Female',
      address: '456 Oak Ave', city: 'Boston', state: 'MA', zipCode: '02108', country: 'USA',
      departmentId: '22345678-1234-4234-9234-123456789012',
      courseId: '32345678-1234-4234-9234-123456789012', status: 'active',
      emergencyContactName: 'John Smith', emergencyContactPhone: '+1-555-0201',
    };

    it('should create a new student successfully', async () => {
      const newStudent = mockStudent({ id: 'new-student-id', student_id: 'STU260002', first_name: 'Jane', last_name: 'Smith', email: 'jane.smith@test.com' });

      mockQuery
        .mockResolvedValueOnce({ rows: [] })                         // findByEmail
        .mockResolvedValueOnce({ rows: [mockDepartment()] })         // Department.findById
        .mockResolvedValueOnce({ rows: [mockCourse()] })             // Course.findById
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })           // generateStudentId
        .mockResolvedValueOnce({ rows: [newStudent] });              // INSERT

      const res = await authPost('/api/students')
        .send(validPayload)
        .expect('Content-Type', /json/);

      expect(res.status).toBe(201);
      expect(res.body.data.email).toBe('jane.smith@test.com');
    });

    it('should reject duplicate email', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockStudent()] });

      const res = await authPost('/api/students')
        .send(validPayload)
        .expect('Content-Type', /json/);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('email already exists');
    });

    it('should reject non-existent department', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const res = await authPost('/api/students')
        .send(validPayload)
        .expect('Content-Type', /json/);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Department not found');
    });

    it('should reject non-existent course', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [mockDepartment()] })
        .mockResolvedValueOnce({ rows: [] });

      const res = await authPost('/api/students')
        .send(validPayload)
        .expect('Content-Type', /json/);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Course not found');
    });

    it('should return validation errors for invalid input', async () => {
      const res = await authPost('/api/students')
        .send({ firstName: 'J', lastName: '', email: 'bad-email' })
        .expect('Content-Type', /json/);

      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    it('should require firstName, lastName, email, and departmentId', async () => {
      const res = await authPost('/api/students')
        .send({})
        .expect('Content-Type', /json/);

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/students/:id', () => {
    it('should update an existing student', async () => {
      const existing = mockStudent();
      const updated = { ...existing, first_name: 'Johnny', last_name: 'Updated' };

      mockQuery
        .mockResolvedValueOnce({ rows: [existing] })
        .mockResolvedValueOnce({ rows: [updated] });

      const res = await authPut('/api/students/42345678-1234-4234-9234-123456789012')
        .send({ firstName: 'Johnny', lastName: 'Updated', phone: '+1-555-9999' })
        .expect('Content-Type', /json/);

      expect(res.status).toBe(200);
      expect(res.body.data.first_name).toBe('Johnny');
    });

    it('should return 404 when student not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await authPut('/api/students/42345678-1234-4234-9234-123456789012')
        .send({ firstName: 'Johnny' })
        .expect('Content-Type', /json/);

      expect(res.status).toBe(404);
    });

    it('should reject email change to an existing email', async () => {
      const existing = mockStudent({ email: 'original@test.com' });

      mockQuery
        .mockResolvedValueOnce({ rows: [existing] })
        .mockResolvedValueOnce({ rows: [mockStudent()] });

      const res = await authPut('/api/students/42345678-1234-4234-9234-123456789012')
        .send({ email: 'john.doe@test.com' })
        .expect('Content-Type', /json/);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('email already exists');
    });
  });

  describe('DELETE /api/students/:id', () => {
    it('should soft-delete a student', async () => {
      const student = mockStudent({ profile_image_url: null });

      mockQuery
        .mockResolvedValueOnce({ rows: [student] })
        .mockResolvedValueOnce({ rows: [{ id: student.id }] });

      const res = await authDelete('/api/students/42345678-1234-4234-9234-123456789012')
        .expect('Content-Type', /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Second call is Student.findById (first was auth middleware)
      // Third call is Student.delete (UPDATE)
      expect(mockQuery.mock.calls[2][0]).toContain('UPDATE');
      expect(mockQuery.mock.calls[2][0]).toContain('is_active');
    });

    it('should return 404 when student not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await authDelete('/api/students/non-existent-id')
        .expect('Content-Type', /json/);

      expect(res.status).toBe(404);
    });
  });

  describe('Authorization', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/students')
        .expect('Content-Type', /json/);
      expect(res.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app).get('/api/students')
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/);
      expect(res.status).toBe(401);
    });
  });

  describe('404 Handling', () => {
    it('should return 404 for unknown API routes', async () => {
      const res = await request(app).get('/api/unknown-route')
        .expect('Content-Type', /json/);
      expect(res.status).toBe(404);
    });
  });
});
