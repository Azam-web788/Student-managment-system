const API_BASE = '/api';

class ApiService {
  constructor() {
    this.baseUrl = API_BASE;
  }

  getToken() {
    return localStorage.getItem('token');
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

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        const error = new Error(data.message || 'Request failed');
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
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
