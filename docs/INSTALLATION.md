# Installation Guide

## Prerequisites

- **Node.js** 20.x or higher
- **npm** 10.x or higher
- **PostgreSQL** 16.x or higher
- **Git**

## Step 1: Clone the Repository

```bash
git clone <repository-url>
cd student-management-system
```

## Step 2: Database Setup

### Option A: Local PostgreSQL

1. Install PostgreSQL from https://www.postgresql.org/download/
2. Create the database:
   ```bash
   createdb student_management
   ```

3. Or via psql:
   ```sql
   CREATE DATABASE student_management;
   ```

### Option B: Docker

```bash
docker run --name postgres-sms \
  -e POSTGRES_DB=student_management \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -d postgres:16
```

## Step 3: Backend Setup

```bash
cd backend

# Copy environment file
cp .env.example .env

# Edit .env with your database credentials
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=student_management
# DB_USER=postgres
# DB_PASSWORD=postgres

# Install dependencies
npm install

# Run database migrations
npm run migrate

# (Optional) Seed sample data
npm run seed

# Start development server
npm run dev
```

The backend will run on `http://localhost:5000`.

## Step 4: Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will run on `http://localhost:5173`.

## Step 5: Create Admin User

Register the initial admin user:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@example.com",
    "password": "Admin@123",
    "fullName": "System Administrator"
  }'
```

## Step 6: Login

Open `http://localhost:5173/login` in your browser and login with:
- Email: `admin@example.com`
- Password: `Admin@123`

## Step 7: Add Initial Data

1. Navigate to **Departments** page
2. Add departments (e.g., Computer Science, Mathematics, Physics)
3. Navigate to **Courses** page
4. Add courses under each department
5. Navigate to **Students** page
6. Add students

## Common Issues

### Database Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
Ensure PostgreSQL is running and the credentials in `.env` are correct.

### Port Already in Use
```
Error: listen EADDRINUSE :::5000
```
Kill the process using port 5000:
```bash
# Linux/Mac
kill -9 $(lsof -t -i:5000)

# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Module Not Found
```bash
npm install
```

### Migration Failed
Ensure the database exists before running migrations:
```bash
createdb student_management
# or via psql: CREATE DATABASE student_management;
```
