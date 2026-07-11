import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';

// Mock pg before any imports that depend on it
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

// Set test environment before importing the app
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.LOG_LEVEL = 'error';

let app;
try {
  const mod = await import('../server.js');
  app = mod.default;
} catch (e) {
  console.error('Failed to import server.js:', e.message);
  throw e;
}
const { generateAuthToken, mockUser } = await import('./helpers/testApp.js');

describe('Auth Routes - /api/auth', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  describe('POST /api/auth/register', () => {
    const validPayload = {
      username: 'newadmin',
      email: 'newadmin@test.com',
      password: 'Password123',
      fullName: 'New Admin',
    };

    const mockNewUser = {
      id: 'new-user-id-0000-0000-000000000002',
      username: 'newadmin',
      email: 'newadmin@test.com',
      full_name: 'New Admin',
      role: 'admin',
      created_at: new Date().toISOString(),
    };

    it('should register a new user successfully', async () => {
      // First query: check if email exists -> no match
      // Second query: check if username exists -> no match
      // Third query: insert user
      mockQuery
        .mockResolvedValueOnce({ rows: [] })   // findByEmail - no existing user
        .mockResolvedValueOnce({ rows: [] })   // findByUsername - no existing user
        .mockResolvedValueOnce({ rows: [mockNewUser] }); // create user

      const res = await request(app)
        .post('/api/auth/register')
        .send(validPayload)
        .expect('Content-Type', /json/);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Registration successful');
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe('newadmin@test.com');
      expect(res.body.data.token).toBeDefined();
    });

    it('should reject registration with duplicate email', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [mockUser()] }); // findByEmail - found existing

      const res = await request(app)
        .post('/api/auth/register')
        .send(validPayload)
        .expect('Content-Type', /json/);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Email already registered');
    });

    it('should reject registration with duplicate username', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] })           // findByEmail - no match
        .mockResolvedValueOnce({ rows: [mockUser()] }); // findByUsername - found

      const res = await request(app)
        .post('/api/auth/register')
        .send(validPayload)
        .expect('Content-Type', /json/);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Username already taken');
    });

    it('should return validation errors for invalid input', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'ab', email: 'not-an-email', password: '123', fullName: '' })
        .expect('Content-Type', /json/);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });

    it('should enforce password complexity', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...validPayload, password: 'weak' })
        .expect('Content-Type', /json/);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    const validCredentials = { email: 'admin@test.com', password: 'Password123' };

    it('should login successfully with valid credentials', async () => {
      const user = mockUser();
      mockQuery
        .mockResolvedValueOnce({ rows: [user] })       // findByEmail
        .mockResolvedValueOnce({ rows: [] })             // updateLastLogin (no return)
        .mockResolvedValueOnce({ rows: [{ count: 1 }] }); // verify token query (get user after login)

      const res = await request(app)
        .post('/api/auth/login')
        .send(validCredentials)
        .expect('Content-Type', /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe('admin@test.com');
    });

    it('should reject login with wrong password', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [mockUser()] }); // findByEmail - user found

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@test.com', password: 'WrongPassword1' })
        .expect('Content-Type', /json/);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('should reject login for non-existent email', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] }); // findByEmail - no user

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'Password123' })
        .expect('Content-Type', /json/);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject login for deactivated account', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [mockUser({ is_active: false })] }); // deactivated user

      const res = await request(app)
        .post('/api/auth/login')
        .send(validCredentials)
        .expect('Content-Type', /json/);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return validation errors for invalid input', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'bad-email', password: '' })
        .expect('Content-Type', /json/);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should return user profile when authenticated', async () => {
      const token = generateAuthToken();

      mockQuery
        .mockResolvedValueOnce({ rows: [mockUser()] }); // authenticate middleware queries db

      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .expect('Content-Type', /json/);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token-here')
        .expect('Content-Type', /json/);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 when user no longer exists', async () => {
      const token = generateAuthToken();

      mockQuery
        .mockResolvedValueOnce({ rows: [] }); // authenticate - no user found

      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 when account is deactivated', async () => {
      const token = generateAuthToken();

      mockQuery
        .mockResolvedValueOnce({ rows: [mockUser({ is_active: false })] }); // deactivated

      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully when authenticated', async () => {
      const token = generateAuthToken();

      mockQuery
        .mockResolvedValueOnce({ rows: [mockUser()] }); // authenticate middleware

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Logged out successfully');
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .expect('Content-Type', /json/);

      expect(res.status).toBe(401);
    });
  });

  describe('Health Check', () => {
    it('GET /api/health should return API status', async () => {
      const res = await request(app)
        .get('/api/health')
        .expect('Content-Type', /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('running');
    });
  });
});
