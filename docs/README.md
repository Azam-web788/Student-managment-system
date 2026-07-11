# Student Management System

A production-ready, enterprise-grade Student Management System built with modern web technologies and designed for deployment on AWS.

## Features

- **Dashboard** - Live statistics with real-time PostgreSQL data
- **Student Management** - Complete CRUD with search, filter, sort, and pagination
- **Department Management** - Manage academic departments
- **Course Management** - Manage courses with department associations
- **Authentication** - Secure JWT-based authentication with bcrypt password hashing
- **Image Uploads** - Student profile images stored in AWS S3
- **Responsive UI** - Beautiful Material UI design for mobile, tablet, and desktop
- **Role-Based Access** - Admin and Super Admin roles
- **Audit Logging** - Track all system activities

## Technology Stack

### Frontend
- **React 19** with Vite
- **Material UI 7** - Enterprise-ready UI components
- **Redux Toolkit** - State management
- **React Router v7** - Client-side routing
- **Fetch API** - HTTP client (no Axios)
- **React Toastify** - Notifications

### Backend
- **Node.js** with Express.js
- **PostgreSQL** - Primary database
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Multer** - File upload handling
- **Winston** - Logging (CloudWatch compatible)
- **Helmet** - Security headers
- **Express Rate Limit** - Rate limiting

### Infrastructure (AWS)
- **Amazon VPC** - Isolated network
- **Application Load Balancer** - Traffic distribution
- **Auto Scaling Group** - Automatic scaling
- **Amazon RDS PostgreSQL** - Managed database
- **Amazon S3** - File storage
- **Route 53** - DNS management
- **ACM** - SSL/TLS certificates
- **KMS** - Encryption keys
- **CloudWatch** - Monitoring and logging

### DevOps
- **Terraform** - Infrastructure as Code
- **Packer** - Custom AMI building
- **GitHub Actions** - CI/CD pipeline
- **PM2** - Process manager

## Project Structure

```
student-management-system/
├── backend/                 # Express.js API server
│   ├── config/             # Configuration files
│   ├── controllers/        # Route controllers
│   ├── database/           # Schema and migrations
│   ├── helpers/            # Utility functions
│   ├── middleware/          # Express middleware
│   ├── models/             # Database models
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   ├── validators/         # Input validation
│   └── server.js           # Entry point
├── frontend/               # React SPA
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── layouts/       # Layout components
│   │   ├── pages/         # Page components
│   │   ├── redux/         # Redux store and slices
│   │   ├── services/      # API service layer
│   │   └── styles/        # Theme and styles
│   └── index.html
├── terraform/              # IaC for AWS deployment
├── packer/                 # Custom AMI builder
├── .github/                # GitHub Actions workflows
└── docs/                   # Documentation
```

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 16+
- npm or yarn

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Copy environment variables
cp .env.example .env

# Edit .env with your database credentials
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=student_management
# DB_USER=postgres
# DB_PASSWORD=your_password

# Install dependencies
npm install

# Run database migrations
npm run migrate

# Start development server
npm run dev
```

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:5173` and the backend API at `http://localhost:5000`.

### Create Admin User

After starting the backend, register an admin user by making a POST request:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@example.com",
    "password": "Admin123!",
    "fullName": "System Administrator"
  }'
```

## Environment Variables

### Backend (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5000 |
| `NODE_ENV` | Environment | development |
| `DB_HOST` | Database host | localhost |
| `DB_PORT` | Database port | 5432 |
| `DB_NAME` | Database name | student_management |
| `DB_USER` | Database user | postgres |
| `DB_PASSWORD` | Database password | - |
| `JWT_SECRET` | JWT signing secret | - |
| `JWT_EXPIRES_IN` | Token expiration | 7d |
| `AWS_REGION` | AWS region | us-east-1 |
| `S3_BUCKET_NAME` | S3 bucket for uploads | - |
| `CORS_ORIGIN` | Allowed CORS origin | http://localhost:5173 |
| `LOG_LEVEL` | Logging level | info |

## API Documentation

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Register admin user | No |
| POST | `/api/auth/login` | Login | No |
| GET | `/api/auth/profile` | Get user profile | Yes |
| POST | `/api/auth/logout` | Logout | Yes |

### Students

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/students` | List students (with search, filter, pagination) | Yes |
| GET | `/api/students/:id` | Get student by ID | Yes |
| POST | `/api/students` | Create student | Yes |
| PUT | `/api/students/:id` | Update student | Yes |
| DELETE | `/api/students/:id` | Soft delete student | Yes |
| POST | `/api/students/:id/image` | Upload student image | Yes |

### Departments

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/departments` | List departments | Yes |
| GET | `/api/departments/all` | Simple list for dropdowns | Yes |
| GET | `/api/departments/:id` | Get department | Yes |
| POST | `/api/departments` | Create department | Yes |
| PUT | `/api/departments/:id` | Update department | Yes |
| DELETE | `/api/departments/:id` | Delete department | Yes |

### Courses

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/courses` | List courses | Yes |
| GET | `/api/courses/all` | Simple list for dropdowns | Yes |
| GET | `/api/courses/by-department/:deptId` | Courses by department | Yes |
| GET | `/api/courses/:id` | Get course | Yes |
| POST | `/api/courses` | Create course | Yes |
| PUT | `/api/courses/:id` | Update course | Yes |
| DELETE | `/api/courses/:id` | Delete course | Yes |

### Dashboard

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/dashboard/stats` | Main statistics | Yes |
| GET | `/api/dashboard/departments` | Department stats | Yes |
| GET | `/api/dashboard/activity` | Recent activity | Yes |
| GET | `/api/dashboard/enrollment-trends` | Enrollment trends | Yes |

### Health

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/health` | Health check | No |

## Deployment

### Prerequisites
- AWS account with appropriate permissions
- Terraform installed (v1.5+)
- Packer installed
- GitHub repository with secrets configured

### Infrastructure Deployment

```bash
# Navigate to terraform directory
cd terraform

# Initialize Terraform
terraform init

# Review the plan
terraform plan

# Apply the infrastructure
terraform apply
```

### CI/CD Pipeline

The GitHub Actions workflow automatically:
1. Lints and tests the code
2. Builds a custom AMI with Packer
3. Plans Terraform changes
4. Applies infrastructure changes
5. Deploys the application
6. Verifies the deployment
7. Runs security scans

## Security Features

- **JWT Authentication** with expiration
- **Password Hashing** using bcrypt (12 rounds)
- **Helmet** security headers
- **CORS** configuration
- **Rate Limiting** on API endpoints
- **Input Validation** on all endpoints
- **SQL Injection Protection** via parameterized queries
- **XSS Protection** via input sanitization
- **File Upload Validation** (type and size)
- **Environment Variables** for sensitive data
- **KMS Encryption** for data at rest

## Monitoring & Logging

- **Winston Logger** with file and console transports
- **CloudWatch Log Groups** for application, access, and error logs
- **CloudWatch Metrics** for ALB, EC2, and RDS
- **CloudWatch Alarms** for error rates and resource utilization
- **CloudWatch Dashboard** for monitoring

## License

MIT License - see LICENSE file for details.
