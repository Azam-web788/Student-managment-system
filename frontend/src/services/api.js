/**
 * Retry configuration
 */
export const RETRY_CONFIG = {
  maxAttempts: 3,       // total attempts (1 initial + 2 retries)
  baseDelayMs: 1000,    // initial delay before first retry
  maxDelayMs: 6000,     // maximum delay between retries
};

/**
 * Determine if an error is retryable.
 * Retryable: network failures, 502/503 proxy errors
 * NOT retryable: 4xx client errors, non-502/503 5xx server errors
 */
export function isRetryableError(error) {
  // Guard against null/undefined
  if (!error) return false;
  // Network error (backend unreachable)
  if (error.isNetworkError) return true;
  // Proxy errors (Vite can't reach backend)
  if (error.isProxyError) return true;
  // 429 Too Many Requests — retry with backoff
  if (error.status === 429) return true;
  // Never retry 4xx client errors (bad request, not found, conflict, etc.)
  if (error.status >= 400 && error.status < 500) return false;
  // Transient server errors
  if (error.status === 502 || error.status === 503) return true;
  return false;
}

/**
 * Sleep for a given number of milliseconds (promise-based)
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff + jitter
 * Formula: min(baseDelay * 2^attempt, maxDelay) * (0.5 + random * 0.5)
 * This gives a delay between 50% and 100% of the calculated backoff value.
 */
export function calculateBackoff(attempt, baseDelayMs, maxDelayMs) {
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
  const clampedDelay = Math.min(exponentialDelay, maxDelayMs);
  const jitter = 0.5 + Math.random() * 0.5;
  return Math.round(clampedDelay * jitter);
}

const API_BASE = '/api';

class ApiService {
  constructor() {
    this.baseUrl = API_BASE;
  }

  getToken() {
    return localStorage.getItem('token');
  }

  /**
   * Check if the error is a network error from fetch.
   * Browsers throw TypeError with 'Failed to fetch' when the server is unreachable.
   */
  _isNetworkError(error) {
    return error instanceof TypeError && error.message === 'Failed to fetch';
  }

  /**
   * Build a user-friendly error for connection failures.
   */
  _buildConnectionError(status, isNetworkError) {
    const error = new Error(
      'Cannot connect to the backend server. Make sure it is running:\n' +
      '  cd backend && npm run dev\n\n' +
      'Or start both servers from the project root:\n' +
      '  npm run dev'
    );
    error.status = status || 0;
    if (isNetworkError) {
      error.isNetworkError = true;
    } else {
      error.isProxyError = true;
    }
    return error;
  }

  /**
   * Execute the fetch request with automatic retry for transient errors.
   * Uses exponential backoff with jitter between retries.
   */
  async _fetchWithRetry(url, config, endpoint, retries = RETRY_CONFIG.maxAttempts) {
    let lastError;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, config);

        // Handle 502/503/504 proxy errors (backend not running)
        if (response.status === 502 || response.status === 503 || response.status === 504) {
          const error = this._buildConnectionError(response.status, false);
          error.response = response;
          throw error;
        }

        // Handle non-JSON responses (e.g., HTML error pages from proxy)
        const contentType = response.headers.get('content-type');
        let data;
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          const text = await response.text();
          data = { message: text || 'Unexpected server response' };
        }

        if (!response.ok) {
          const error = new Error(data.message || 'Request failed');
          error.status = response.status;
          error.data = data;
          error.response = response;
          throw error;
        }

        return data;
      } catch (error) {
        // Convert TypeError to standardized network error immediately
        if (this._isNetworkError(error)) {
          const networkError = this._buildConnectionError(0, true);
          networkError.originalError = error;
          lastError = networkError;
        } else {
          lastError = error;
        }

        // If this is the last attempt, or the error is not retryable, stop here
        if (attempt >= retries || !isRetryableError(lastError)) {
          break;
        }

        // Wait with exponential backoff before retrying
        const delay = calculateBackoff(
          attempt - 1,
          RETRY_CONFIG.baseDelayMs,
          RETRY_CONFIG.maxDelayMs
        );

        if (import.meta.env.DEV) {
          console.warn(
            `[API] Retrying ${endpoint} (retry ${attempt - 1}/${retries - 1}) after ${delay}ms...`
          );
        }

        await sleep(delay);
      }
    }

    throw lastError;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const token = this.getToken();

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    // Don't set Content-Type for FormData (multipart)
    if (options.body instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    // Allow callers to opt out of retry by passing retry: false
    // Note: fetch() ignores unknown properties, so options.retry is harmless
    const retries = options.retry !== false ? RETRY_CONFIG.maxAttempts : 1;

    try {
      return await this._fetchWithRetry(url, config, endpoint, retries);
    } catch (error) {
      // Only redirect to login on 401 for authenticated endpoints,
      // NOT during login itself (where 401 just means wrong password)
      if (error.status === 401 && !endpoint.startsWith('/auth/login')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      throw error;
    }
  }

  // Auth endpoints
  login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  register(data) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  getProfile() {
    return this.request('/auth/profile');
  }

  logout() {
    return this.request('/auth/logout', { method: 'POST' });
  }

  forgotPassword(email) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  resetPassword(token, password) {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  }

  updateProfile(data) {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  uploadProfileImage(formData) {
    return this.request('/auth/profile/image', {
      method: 'POST',
      body: formData,
    });
  }

  // Student endpoints
  getStudents(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) query.append(key, value);
    });
    return this.request(`/students?${query.toString()}`);
  }

  getStudent(id) {
    return this.request(`/students/${id}`);
  }

  createStudent(formData) {
    return this.request('/students', {
      method: 'POST',
      body: formData,
    });
  }

  updateStudent(id, formData) {
    return this.request(`/students/${id}`, {
      method: 'PUT',
      body: formData,
    });
  }

  deleteStudent(id) {
    return this.request(`/students/${id}`, { method: 'DELETE' });
  }

  uploadStudentImage(id, formData) {
    return this.request(`/students/${id}/image`, {
      method: 'POST',
      body: formData,
    });
  }

  // Dashboard endpoints
  getDashboardStats() {
    return this.request('/dashboard/stats');
  }

  getDashboardDepartments() {
    return this.request('/dashboard/departments');
  }

  getDashboardActivity() {
    return this.request('/dashboard/activity');
  }

  getEnrollmentTrends() {
    return this.request('/dashboard/enrollment-trends');
  }

  // Department endpoints
  getDepartments(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) query.append(key, value);
    });
    return this.request(`/departments?${query.toString()}`);
  }

  getAllDepartments() {
    return this.request('/departments/all');
  }

  createDepartment(data) {
    return this.request('/departments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateDepartment(id, data) {
    return this.request(`/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  deleteDepartment(id) {
    return this.request(`/departments/${id}`, { method: 'DELETE' });
  }

  // Course endpoints
  getCourses(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) query.append(key, value);
    });
    return this.request(`/courses?${query.toString()}`);
  }

  getAllCourses(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) query.append(key, value);
    });
    return this.request(`/courses/all?${query.toString()}`);
  }

  getCoursesByDepartment(departmentId) {
    return this.request(`/courses/by-department/${departmentId}`);
  }

  createCourse(data) {
    return this.request('/courses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateCourse(id, data) {
    return this.request(`/courses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  deleteCourse(id) {
    return this.request(`/courses/${id}`, { method: 'DELETE' });
  }
}

const api = new ApiService();
export default api;
