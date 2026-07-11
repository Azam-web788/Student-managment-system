import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

/**
 * Generates a valid JWT token for testing authenticated routes.
 * @param {Object} [overrides] - Override default user fields
 * @returns {string} JWT token
 */
const TEST_USER_ID = '12345678-1234-4234-9234-123456789012';
const TEST_DEPT_ID = '22345678-1234-4234-9234-123456789012';
const TEST_COURSE_ID = '32345678-1234-4234-9234-123456789012';
const TEST_STUDENT_ID = '42345678-1234-4234-9234-123456789012';

export function generateAuthToken(overrides = {}) {
  const payload = {
    id: overrides.id || TEST_USER_ID,
    email: overrides.email || 'admin@test.com',
    role: overrides.role || 'admin',
  };
  return jwt.sign(payload, 'test-jwt-secret', { expiresIn: '7d' });
}

/**
 * Creates a mock user row as returned by database queries.
 */
export function mockUser(overrides = {}) {
  return {
    id: 'test-user-id-0000-0000-000000000001',
    username: 'admin',
    email: 'admin@test.com',
    full_name: 'Admin User',
    password_hash: bcrypt.hashSync('Password123', 12),
    role: 'admin',
    is_active: true,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Creates a mock student row as returned by database queries.
 */
export function mockStudent(overrides = {}) {
  return {
    id: TEST_STUDENT_ID,
    student_id: 'STU260001',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@test.com',
    phone: '+1-555-0100',
    date_of_birth: '2000-01-15',
    gender: 'Male',
    address: '123 Main St',
    city: 'New York',
    state: 'NY',
    zip_code: '10001',
    country: 'USA',
    department_id: TEST_DEPT_ID,
    department_name: 'Computer Science',
    department_code: 'CS',
    course_id: TEST_COURSE_ID,
    course_name: 'Introduction to Programming',
    course_code: 'CS101',
    enrollment_date: '2026-09-01',
    status: 'active',
    profile_image_url: null,
    emergency_contact_name: 'Jane Doe',
    emergency_contact_phone: '+1-555-0101',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Creates a mock department row as returned by database queries.
 */
export function mockDepartment(overrides = {}) {
  return {
    id: TEST_DEPT_ID,
    name: 'Computer Science',
    code: 'CS',
    description: 'Department of Computer Science',
    is_active: true,
    student_count: 10,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Creates a mock course row as returned by database queries.
 */
export function mockCourse(overrides = {}) {
  return {
    id: TEST_COURSE_ID,
    name: 'Introduction to Programming',
    code: 'CS101',
    description: 'Learn the basics of programming',
    credits: 3,
    department_id: TEST_DEPT_ID,
    department_name: 'Computer Science',
    department_code: 'CS',
    is_active: true,
    student_count: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}


