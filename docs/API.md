# Student Management System — API Documentation

> **Base URL:** `http://localhost:5000/api` (development)  
> **Production URL:** `https://your-domain.com/api`  
> **Content-Type:** `application/json` (unless file uploads are involved)

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Students](#2-students)
3. [Departments](#3-departments)
4. [Courses](#4-courses)
5. [Dashboard](#5-dashboard)
6. [Common Responses](#6-common-responses)
7. [Appendix: Validation Rules](#7-appendix-validation-rules)

---

## Authentication

All protected endpoints require a Bearer token in the `Authorization` header.

```
Authorization: Bearer <jwt-token>
```

Tokens are obtained via the `POST /auth/login` or `POST /auth/register` endpoints and expire after the configured duration (default: 7 days).

---

### POST /auth/register

Register a new admin user.

**Request Body**

| Field      | Type   | Required | Validation                                     |
|------------|--------|----------|------------------------------------------------|
| username   | string | ✅       | 3–50 chars, alphanumeric + underscores only    |
| email      | string | ✅       | Valid email format                             |
| password   | string | ✅       | Min 6 chars, must contain uppercase, lowercase, and number |
| fullName   | string | ✅       | 2–100 chars                                    |

```
POST /auth/register
Content-Type: application/json

{
  "username": "admin",
  "email": "admin@example.com",
  "password": "Admin@123",
  "fullName": "System Administrator"
}
```

**Response `201 Created`**

```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "username": "admin",
      "email": "admin@example.com",
      "full_name": "System Administrator",
      "role": "admin"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  },
  "timestamp": "2026-07-10T12:00:00.000Z"
}
```

**Error Responses**

| Status | Condition              |
|--------|------------------------|
| 400    | Validation failed (invalid input) |
| 400    | Email already registered         |
| 400    | Username already taken           |

---

### POST /auth/login

Authenticate with email and password to receive a JWT token.

**Request Body**

| Field    | Type   | Required | Validation                |
|----------|--------|----------|---------------------------|
| email    | string | ✅       | Valid email format        |
| password | string | ✅       | Min 6 characters          |

```
POST /auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "Admin@123"
}
```

**Response `200 OK`**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "username": "admin",
      "email": "admin@example.com",
      "fullName": "System Administrator",
      "role": "admin"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  },
  "timestamp": "2026-07-10T12:00:00.000Z"
}
```

**Error Responses**

| Status | Condition                        |
|--------|----------------------------------|
| 400    | Validation failed (invalid input)|
| 401    | Invalid email or password        |
| 401    | Account has been deactivated     |

---

### GET /auth/profile

Retrieve the currently authenticated user's profile.

```
GET /auth/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response `200 OK`**

```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "user": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "username": "admin",
      "email": "admin@example.com",
      "full_name": "System Administrator",
      "role": "admin",
      "is_active": true
    }
  },
  "timestamp": "2026-07-10T12:00:00.000Z"
}
```

**Error Responses**

| Status | Condition                |
|--------|--------------------------|
| 401    | Missing or invalid token |
| 401    | User no longer exists    |
| 401    | Account deactivated      |

---

### POST /auth/logout

Log out the current user (logged server-side for audit purposes — client should discard the token).

```
POST /auth/logout
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response `200 OK`**

```json
{
  "success": true,
  "message": "Logged out successfully",
  "data": null,
  "timestamp": "2026-07-10T12:00:00.000Z"
}
```

---

### GET /api/health

Check API status (no authentication required).

```
GET /api/health
```

**Response `200 OK`**

```json
{
  "success": true,
  "message": "Student Management API is running",
  "environment": "development",
  "timestamp": "2026-07-10T12:00:00.000Z"
}
```

---

## 2. Students

All student endpoints require authentication (`Authorization: Bearer <token>`).

### GET /students

List students with optional search, filtering, sorting, and pagination.

**Query Parameters**

| Parameter     | Type   | Default       | Valid Values                               | Description                        |
|---------------|--------|---------------|--------------------------------------------|------------------------------------|
| `search`      | string | —             | Any string                                 | Search by name, ID, or email (ILIKE) |
| `departmentId`| uuid   | —             | Valid department UUID                      | Filter by department               |
| `courseId`    | uuid   | —             | Valid course UUID                          | Filter by course                   |
| `status`      | string | —             | `active`, `inactive`, `graduated`, `suspended` | Filter by status             |
| `gender`      | string | —             | `Male`, `Female`, `Other`                  | Filter by gender                   |
| `page`        | int    | `1`           | ≥ 1                                        | Page number                        |
| `limit`       | int    | `10`          | 1–100                                      | Items per page                     |
| `sortBy`      | string | `created_at`  | `first_name`, `last_name`, `student_id`, `email`, `status`, `enrollment_date`, `created_at` | Sort field |
| `sortOrder`   | string | `DESC`        | `ASC`, `DESC`                              | Sort direction                     |

```
GET /students?search=john&departmentId=22345678-1234-4234-9234-123456789012&status=active&page=1&limit=10&sortBy=created_at&sortOrder=DESC
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response `200 OK`**

```json
{
  "success": true,
  "message": "Success",
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "student_id": "STU260001",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "phone": "+1-555-0100",
      "date_of_birth": "2000-01-15",
      "gender": "Male",
      "address": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zip_code": "10001",
      "country": "USA",
      "department_id": "22345678-1234-4234-9234-123456789012",
      "department_name": "Computer Science",
      "department_code": "CS",
      "course_id": "32345678-1234-4234-9234-123456789012",
      "course_name": "Introduction to Programming",
      "course_code": "CS101",
      "enrollment_date": "2026-09-01",
      "status": "active",
      "profile_image_url": null,
      "emergency_contact_name": "Jane Doe",
      "emergency_contact_phone": "+1-555-0101",
      "is_active": true,
      "created_at": "2026-07-10T12:00:00.000Z",
      "updated_at": "2026-07-10T12:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 10,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  },
  "timestamp": "2026-07-10T12:00:00.000Z"
}
```

---

### GET /students/:id

Get a single student by UUID.

```
GET /students/42345678-1234-4234-9234-123456789012
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response `200 OK`**

Same student object as shown in the list endpoint above.

**Error Responses**

| Status | Condition                |
|--------|--------------------------|
| 404    | Student not found        |
| 401    | Missing or invalid token |

---

### POST /students

Create a new student. Supports multipart/form-data for optional profile image upload.

**Request (multipart/form-data)**

| Field                   | Type   | Required | Validation                                |
|-------------------------|--------|----------|-------------------------------------------|
| `firstName`             | string | ✅       | 2–50 chars, letters/spaces/hyphens/apostrophes only |
| `lastName`              | string | ✅       | 2–50 chars, letters/spaces/hyphens/apostrophes only |
| `email`                 | string | ✅       | Valid email format, must be unique        |
| `phone`                 | string | optional | Phone number format                       |
| `dateOfBirth`           | date   | optional | ISO date (YYYY-MM-DD)                     |
| `gender`                | string | optional | `Male`, `Female`, or `Other`              |
| `address`               | string | optional | Free text                                 |
| `city`                  | string | optional | Free text                                 |
| `state`                 | string | optional | Free text                                 |
| `zipCode`               | string | optional | Free text                                 |
| `country`               | string | optional | Defaults to `USA`                         |
| `departmentId`          | uuid   | ✅       | Must reference an existing department     |
| `courseId`              | uuid   | optional | Must reference an existing course         |
| `status`                | string | optional | `active`, `inactive`, `graduated`, `suspended` (default: `active`) |
| `emergencyContactName`  | string | optional | Max 100 chars                             |
| `emergencyContactPhone` | string | optional | Phone number format                       |
| `profileImage`          | file   | optional | JPEG/PNG/GIF/WebP, max 5 MB              |

```
POST /students
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: multipart/form-data; boundary=---FormBoundary

-----FormBoundary
Content-Disposition: form-data; name="firstName"

Jane
-----FormBoundary
Content-Disposition: form-data; name="lastName"

Smith
-----FormBoundary
Content-Disposition: form-data; name="email"

jane.smith@example.com
-----FormBoundary
Content-Disposition: form-data; name="phone"

+1-555-0200
-----FormBoundary
Content-Disposition: form-data; name="dateOfBirth"

2001-03-20
-----FormBoundary
Content-Disposition: form-data; name="gender"

Female
-----FormBoundary
Content-Disposition: form-data; name="departmentId"

22345678-1234-4234-9234-123456789012
-----FormBoundary
Content-Disposition: form-data; name="courseId"

32345678-1234-4234-9234-123456789012
-----FormBoundary
Content-Disposition: form-data; name="profileImage"; filename="photo.jpg"
Content-Type: image/jpeg

<binary data>
-----FormBoundary--
```

**Response `201 Created`**

```json
{
  "success": true,
  "message": "Student created successfully",
  "data": {
    "id": "newly-created-uuid",
    "student_id": "STU260002",
    "first_name": "Jane",
    "last_name": "Smith",
    "email": "jane.smith@example.com",
    ...
  },
  "timestamp": "2026-07-10T12:00:00.000Z"
}
```

**Error Responses**

| Status | Condition                         |
|--------|-----------------------------------|
| 400    | Validation failed (see `errors` array) |
| 400    | A student with this email already exists |
| 400    | Department not found              |
| 400    | Course not found                  |
| 400    | File too large (max 5 MB)        |

---

### PUT /students/:id

Update an existing student. All fields are optional — only provided fields are updated. Supports multipart/form-data for updating the profile image.

```
PUT /students/42345678-1234-4234-9234-123456789012
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: multipart/form-data; boundary=---FormBoundary

-----FormBoundary
Content-Disposition: form-data; name="firstName"

Johnny
-----FormBoundary
Content-Disposition: form-data; name="phone"

+1-555-9999
-----FormBoundary--
```

**Response `200 OK`**

```json
{
  "success": true,
  "message": "Student updated successfully",
  "data": {
    "id": "42345678-1234-4234-9234-123456789012",
    "first_name": "Johnny",
    ...updated fields...
  },
  "timestamp": "2026-07-10T12:00:00.000Z"
}
```

**Error Responses**

| Status | Condition                                    |
|--------|----------------------------------------------|
| 400    | Validation failed                            |
| 400    | Invalid student ID (must be a valid UUID)   |
| 400    | A student with this email already exists    |
| 404    | Student not found                            |

---

### DELETE /students/:id

Soft-delete a student (sets `is_active = false`). The record is preserved in the database but excluded from search results.

```
DELETE /students/42345678-1234-4234-9234-123456789012
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response `200 OK`**

```json
{
  "success": true,
  "message": "Student deleted successfully",
  "data": null,
  "timestamp": "2026-07-10T12:00:00.000Z"
}
```

**Error Responses**

| Status | Condition          |
|--------|---------------------|
| 404    | Student not found   |

---

### POST /students/:id/image

Upload or replace a student's profile image. The old image is automatically deleted from storage.

```
POST /students/42345678-1234-4234-9234-123456789012/image
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: multipart/form-data; boundary=---FormBoundary

-----FormBoundary
Content-Disposition: form-data; name="profileImage"; filename="portrait.jpg"
Content-Type: image/jpeg

<binary data>
-----FormBoundary--
```

**Response `200 OK`**

```json
{
  "success": true,
  "message": "Image uploaded successfully",
  "data": {
    "id": "42345678-1234-4234-9234-123456789012",
    "profile_image_url": "/uploads/students/uuid-photo.jpg",
    ...
  },
  "timestamp": "2026-07-10T12:00:00.000Z"
}
```

**Error Responses**

| Status | Condition                      |
|--------|--------------------------------|
| 400    | Please provide an image file   |
| 400    | File too large (max 5 MB)     |
| 400    | Invalid file type (allowed: JPEG, PNG, GIF, WebP) |
| 404    | Student not found              |

---

## 3. Departments

All department endpoints require authentication.

### GET /departments

List departments with optional search, sorting, and pagination.

**Query Parameters**

| Parameter   | Type   | Default  | Valid Values                | Description                   |
|-------------|--------|----------|-----------------------------|-------------------------------|
| `search`    | string | —        | Any string                  | Search by name or code (ILIKE) |
| `page`      | int    | `1`      | ≥ 1                         | Page number                   |
| `limit`     | int    | `50`     | 1–100                       | Items per page                |
| `sortBy`    | string | `name`   | `name`, `code`, `created_at`| Sort field                    |
| `sortOrder` | string | `ASC`    | `ASC`, `DESC`               | Sort direction                |

```
GET /departments?search=computer&page=1&limit=10&sortBy=name&sortOrder=ASC
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response `200 OK`**

```json
{
  "success": true,
  "message": "Success",
  "data": [
    {
      "id": "22345678-1234-4234-9234-123456789012",
      "name": "Computer Science",
      "code": "CS",
      "description": "Department of Computer Science",
      "is_active": true,
      "student_count": 45,
      "created_at": "2026-07-10T12:00:00.000Z",
      "updated_at": "2026-07-10T12:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 5,
    "page": 1,
    "limit": 10,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  },
  "timestamp": "2026-07-10T12:00:00.000Z"
}
```

---

### GET /departments/all

Get a simplified list of active departments, ideal for populating dropdown menus.

```
GET /departments/all
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response `200 OK`**

```json
{
  "success": true,
  "message": "Success",
  "data": [
    { "id": "22345678-1234-4234-9234-123456789012", "name": "Computer Science", "code": "CS" },
    { "id": "32345678-1234-4234-9234-123456789012", "name": "Mathematics", "code": "MATH" }
  ],
  "timestamp": "2026-07-10T12:00:00.000Z"
}
```

---

### GET /departments/:id

Get a single department by UUID.

```
GET /departments/22345678-1234-4234-9234-123456789012
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response `200 OK`**

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "id": "22345678-1234-4234-9234-123456789012",
    "name": "Computer Science",
    "code": "CS",
    "description": "Department of Computer Science",
    "is_active": true,
    "student_count": 45,
    "created_at": "2026-07-10T12:00:00.000Z",
    "updated_at": "2026-07-10T12:00:00.000Z"
  },
  "timestamp": "2026-07-10T12:00:00.000Z"
}
```

**Error Responses**

| Status | Condition              |
|--------|------------------------|
| 404    | Department not found   |

---

### POST /departments

Create a new department.

**Request Body**

| Field         | Type   | Required | Description          |
|---------------|--------|----------|----------------------|
| `name`        | string | ✅       | Department name (unique) |
| `code`        | string | ✅       | Short code, e.g., CS, MATH (unique) |
| `description` | string | ❌       | Free text description |

```
POST /departments
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{
  "name": "Computer Science",
  "code": "CS",
  "description": "Department of Computer Science"
}
```

**Response `201 Created`**

```json
{
  "success": true,
  "message": "Department created successfully",
  "data": {
    "id": "22345678-1234-4234-9234-123456789012",
    "name": "Computer Science",
    "code": "CS",
    "description": "Department of Computer Science",
    "is_active": true,
    "created_at": "2026-07-10T12:00:00.000Z",
    "updated_at": "2026-07-10T12:00:00.000Z"
  },
  "timestamp": "2026-07-10T12:00:00.000Z"
}
```

**Error Responses**

| Status | Condition                           |
|--------|-------------------------------------|
| 400    | Name and code are required          |
| 400    | Department code already exists      |

---

### PUT /departments/:id

Update an existing department.

```
PUT /departments/22345678-1234-4234-9234-123456789012
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{
  "name": "Advanced Computer Science",
  "code": "ACS",
  "description": "Updated description",
  "isActive": true
}
```

**Response `200 OK`**

```json
{
  "success": true,
  "message": "Department updated successfully",
  "data": {
    "id": "22345678-1234-4234-9234-123456789012",
    "name": "Advanced Computer Science",
    "code": "ACS",
    ...
  },
  "timestamp": "2026-07-10T12:00:00.000Z"
}
```

**Request Body — optional fields**

| Field      | Type    | Description                    |
|------------|---------|--------------------------------|
| `name`     | string  | Updated department name        |
| `code`     | string  | Updated short code             |
| `description` | string | Updated description         |
| `isActive` | boolean | Toggle active/inactive status  |

**Error Responses**

| Status | Condition               |
|--------|-------------------------|
| 404    | Department not found    |

---

### DELETE /departments/:id

Permanently delete a department. This is a hard delete — the record is removed from the database. Departments with associated courses or students may fail to delete due to foreign key constraints.

```
DELETE /departments/22345678-1234-4234-9234-123456789012
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response `200 OK`**

```json
{
  "success": true,
  "message": "Department deleted successfully",
  "data": null,
  "timestamp": "2026-07-10T12:00:00.000Z"
}
```

**Error Responses**

| Status | Condition              |
|--------|------------------------|
| 404    | Department not found   |
| 500    | Foreign key constraint violation (department has students/courses) |

---

## 4. Courses

All course endpoints require authentication.

### GET /courses

List courses with optional search, filter by department, sorting, and pagination.

**Query Parameters**

| Parameter      | Type   | Default  | Valid Values                  | Description                    |
|----------------|--------|----------|-------------------------------|--------------------------------|
| `search`       | string | —        | Any string                    | Search by name or code (ILIKE) |
| `departmentId` | uuid   | —        | Valid department UUID         | Filter by department           |
| `page`         | int    | `1`      | ≥ 1                           | Page number                    |
| `limit`        | int    | `50`     | 1–100                         | Items per page                 |
| `sortBy`       | string | `name`   | `name`, `code`, `credits`, `created_at` | Sort field          |
| `sortOrder`    | string | `ASC`    | `ASC`, `DESC`                 | Sort direction                 |

```
GET /courses?search=programming&departmentId=22345678-1234-4234-9234-123456789012&page=1&limit=10
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response `200 OK`**

```json
{
  "success": true,
  "message": "Success",
  "data": [
    {
      "id": "32345678-1234-4234-9234-123456789012",
      "name": "Introduction to Programming",
      "code": "CS101",
      "description": "Learn the basics of programming",
      "credits": 3,
      "department_id": "22345678-1234-4234-9234-123456789012",
      "department_name": "Computer Science",
      "department_code": "CS",
      "is_active": true,
      "student_count": 25,
      "created_at": "2026-07-10T12:00:00.000Z",
      "updated_at": "2026-07-10T12:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 15,
    "page": 1,
    "limit": 10,
    "totalPages": 2,
    "hasNext": true,
    "hasPrev": false
  },
  "timestamp": "2026-07-10T12:00:00.000Z"
}
```

---

### GET /courses/all

Get a simplified list of active courses for dropdown menus. Optionally filter by department.

**Query Parameters**

| Parameter      | Type   | Description                              |
|----------------|--------|------------------------------------------|
| `departmentId` | uuid   | Optional — filter courses by department |

```
GET /courses/all
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

```
GET /courses/all?departmentId=22345678-1234-4234-9234-123456789012
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response `200 OK`**

```json
{
  "success": true,
  "message": "Success",
  "data": [
    {
      "id": "32345678-1234-4234-9234-123456789012",
      "name": "Introduction to Programming",
      "code": "CS101",
      "department_name": "Computer Science"
    }
  ],
  "timestamp": "2026-07-10T12:00:00.000Z"
}
```

---

### GET /courses/by-department/:departmentId

Get all active courses for a specific department. Shorthand for `GET /courses/all?departmentId=...`.

```
GET /courses/by-department/22345678-1234-4234-9234-123456789012
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response `200 OK`**

```json
{
  "success": true,
  "message": "Success",
  "data": [
    {
      "id": "32345678-1234-4234-9234-123456789012",
      "name": "Introduction to Programming",
      "code": "CS101",
      "credits": 3
    }
  ],
  "timestamp": "2026-07-10T12:00:00.000Z"
}
```

---

### GET /courses/:id

Get a single course by UUID.

```
GET /courses/32345678-1234-4234-9234-123456789012
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response `200 OK`**

Same course object as shown in the list endpoint.

**Error Responses**

| Status | Condition          |
|--------|---------------------|
| 404    | Course not found   |

---

### POST /courses

Create a new course.

**Request Body**

| Field          | Type   | Required | Description                           |
|----------------|--------|----------|---------------------------------------|
| `name`         | string | ✅       | Course name                           |
| `code`         | string | ✅       | Unique course code (e.g., CS101)      |
| `description`  | string | ❌       | Free text description                 |
| `credits`      | int    | ✅       | 1–6                                   |
| `departmentId` | uuid   | ✅       | Must reference an existing department |

```
POST /courses
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{
  "name": "Introduction to Programming",
  "code": "CS101",
  "description": "Learn programming fundamentals",
  "credits": 3,
  "departmentId": "22345678-1234-4234-9234-123456789012"
}
```

**Response `201 Created`**

```json
{
  "success": true,
  "message": "Course created successfully",
  "data": {
    "id": "32345678-1234-4234-9234-123456789012",
    "name": "Introduction to Programming",
    "code": "CS101",
    ...
  },
  "timestamp": "2026-07-10T12:00:00.000Z"
}
```

**Error Responses**

| Status | Condition                                  |
|--------|--------------------------------------------|
| 400    | Name, code, credits, and department are required |
| 400    | Course code already exists                |

---

### PUT /courses/:id

Update an existing course.

```
PUT /courses/32345678-1234-4234-9234-123456789012
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{
  "name": "Advanced Programming",
  "credits": 4,
  "isActive": true
}
```

**Response `200 OK`**

```json
{
  "success": true,
  "message": "Course updated successfully",
  "data": {
    "id": "32345678-1234-4234-9234-123456789012",
    "name": "Advanced Programming",
    "credits": 4,
    ...
  },
  "timestamp": "2026-07-10T12:00:00.000Z"
}
```

**Request Body — optional fields**

| Field          | Type    | Description              |
|----------------|---------|--------------------------|
| `name`         | string  | Updated course name      |
| `code`         | string  | Updated course code      |
| `description`  | string  | Updated description      |
| `credits`      | int     | Updated credits (1–6)    |
| `departmentId` | uuid    | Updated department       |
| `isActive`     | boolean | Toggle active/inactive   |

**Error Responses**

| Status | Condition           |
|--------|----------------------|
| 404    | Course not found    |

---

### DELETE /courses/:id

Permanently delete a course (hard delete).

```
DELETE /courses/32345678-1234-4234-9234-123456789012
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response `200 OK`**

```json
{
  "success": true,
  "message": "Course deleted successfully",
  "data": null,
  "timestamp": "2026-07-10T12:00:00.000Z"
}
```

**Error Responses**

| Status | Condition         |
|--------|--------------------|
| 404    | Course not found  |

---

## 5. Dashboard

All dashboard endpoints require authentication.

### GET /dashboard/stats

Get aggregated statistics for the dashboard overview.

```
GET /dashboard/stats
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response `200 OK`**

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "totalStudents": 150,
    "activeStudents": 120,
    "totalDepartments": 5,
    "totalCourses": 20,
    "byDepartment": [
      { "id": "dept-uuid", "name": "Computer Science", "code": "CS", "count": 45 },
      { "id": "dept-uuid", "name": "Mathematics", "code": "MATH", "count": 30 }
    ],
    "byStatus": [
      { "status": "active", "count": 120 },
      { "status": "inactive", "count": 15 },
      { "status": "graduated", "count": 10 },
      { "status": "suspended", "count": 5 }
    ],
    "byGender": [
      { "gender": "Male", "count": 80 },
      { "gender": "Female", "count": 65 },
      { "gender": "Other", "count": 5 }
    ],
    "recentStudents": [
      {
        "id": "student-uuid",
        "first_name": "John",
        "last_name": "Doe",
        "student_id": "STU260005",
        "first_name": "John",
        "department_name": "Computer Science",
        "status": "active",
        "profile_image_url": null,
        "enrollment_date": "2026-07-01",
        "created_at": "2026-07-10T12:00:00.000Z"
      }
    ]
  },
  "timestamp": "2026-07-10T12:00:00.000Z"
}
```

---

### GET /dashboard/departments

Get per-department statistics including student counts and course counts.

```
GET /dashboard/departments
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response `200 OK`**

```json
{
  "success": true,
  "message": "Success",
  "data": [
    {
      "id": "dept-uuid",
      "name": "Computer Science",
      "code": "CS",
      "student_count": 45,
      "active_student_count": 40,
      "course_count": 8
    }
  ],
  "timestamp": "2026-07-10T12:00:00.000Z"
}
```

---

### GET /dashboard/activity

Get the 10 most recently added students (activity feed).

```
GET /dashboard/activity
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response `200 OK`**

```json
{
  "success": true,
  "message": "Success",
  "data": [
    {
      "id": "student-uuid",
      "first_name": "Jane",
      "last_name": "Smith",
      "student_id": "STU260010",
      "status": "active",
      "department_name": "Computer Science",
      "created_at": "2026-07-10T12:00:00.000Z"
    }
  ],
  "timestamp": "2026-07-10T12:00:00.000Z"
}
```

---

### GET /dashboard/enrollment-trends

Get monthly enrollment counts for the past 12 months.

```
GET /dashboard/enrollment-trends
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response `200 OK`**

```json
{
  "success": true,
  "message": "Success",
  "data": [
    { "month": "2026-01-01T00:00:00.000Z", "count": 12 },
    { "month": "2026-02-01T00:00:00.000Z", "count": 8 },
    { "month": "2026-03-01T00:00:00.000Z", "count": 15 }
  ],
  "timestamp": "2026-07-10T12:00:00.000Z"
}
```

---

## 6. Common Responses

### Response Envelope

Every API response follows this envelope structure:

**Success:**
```json
{
  "success": true,
  "message": "Human-readable message",
  "data": { ... },
  "timestamp": "2026-07-10T12:00:00.000Z"
}
```

**Error:**
```json
{
  "success": false,
  "message": "Error description",
  "errors": [ ... ],
  "timestamp": "2026-07-10T12:00:00.000Z"
}
```

### Pagination Envelope

List endpoints include a `pagination` object:

```json
{
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### HTTP Status Codes

| Code | Meaning                      |
|------|------------------------------|
| 200  | Success                      |
| 201  | Created                      |
| 400  | Bad Request / Validation Error |
| 401  | Unauthorized (missing/invalid token) |
| 403  | Forbidden (insufficient permissions) |
| 404  | Resource not found           |
| 413  | Payload too large (file upload) |
| 429  | Too Many Requests (rate limited) |
| 500  | Internal Server Error        |

### Validation Error (400)

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "type": "field",
      "value": "invalid-email",
      "msg": "Please provide a valid email address",
      "path": "email",
      "location": "body"
    }
  ],
  "timestamp": "2026-07-10T12:00:00.000Z"
}
```

### Unauthorized (401)

```json
{
  "success": false,
  "message": "Access denied. No token provided.",
  "timestamp": "2026-07-10T12:00:00.000Z"
}
```

```json
{
  "success": false,
  "message": "Invalid token. Please log in again.",
  "timestamp": "2026-07-10T12:00:00.000Z"
}
```

### Not Found (404)

```json
{
  "success": false,
  "message": "Student not found",
  "timestamp": "2026-07-10T12:00:00.000Z"
}
```

### Rate Limited (429)

```json
{
  "success": false,
  "message": "Too many requests, please try again later."
}
```

### Server Error (500)

```json
{
  "success": false,
  "message": "Something went wrong",
  "timestamp": "2026-07-10T12:00:00.000Z"
}
```

---

## 7. Appendix: Validation Rules

### Auth

| Field      | Rules                                            |
|------------|--------------------------------------------------|
| `username` | Required, 3–50 chars, alphanumeric + underscores |
| `email`    | Required, valid email format                     |
| `password` | Required, min 6 chars, must contain uppercase, lowercase, and digit |
| `fullName` | Required, 2–100 chars                            |

### Student

| Field                   | Rules                                                    |
|-------------------------|----------------------------------------------------------|
| `firstName`             | Required, 2–50 chars, letters/spaces/hyphens/apostrophes |
| `lastName`              | Required, 2–50 chars, letters/spaces/hyphens/apostrophes |
| `email`                 | Required, valid email, must be unique globally           |
| `phone`                 | Optional, phone number format                            |
| `dateOfBirth`           | Optional, valid ISO date (YYYY-MM-DD)                    |
| `gender`                | Optional, one of: `Male`, `Female`, `Other`              |
| `departmentId`          | Required, must be a valid UUID referencing a department  |
| `courseId`              | Optional, must be a valid UUID referencing a course      |
| `status`                | Optional, one of: `active`, `inactive`, `graduated`, `suspended` (default: active) |
| `emergencyContactName`  | Optional, max 100 chars                                  |
| `emergencyContactPhone` | Optional, phone number format                            |
| `profileImage`          | Optional file, max 5 MB, types: JPEG, PNG, GIF, WebP    |

### Department / Course

| Field          | Rules                                              |
|----------------|-----------------------------------------------------|
| `name`         | Required (Department) or required (Course)          |
| `code`         | Required, must be unique                            |
| `credits`      | Required (Course only), integer 1–6                 |
| `departmentId` | Required (Course only), must reference a department |
