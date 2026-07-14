import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import env from './config/env.js';
import { globalErrorHandler } from './middleware/errorHandler.js';
import { xssSanitize } from './middleware/sanitize.js';
import logger from './helpers/logger.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import departmentRoutes from './routes/departmentRoutes.js';
import courseRoutes from './routes/courseRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

// CORS
app.use(cors({
  origin: env.corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// General rate limiting — higher limit in development for testing
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.nodeEnv === 'production' ? 100 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
});

app.use('/api/', limiter);

// Strict rate limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.nodeEnv === 'production' ? 10 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts, please try again later.',
  },
});

app.use('/api/auth/login', authLimiter);

// XSS Sanitization
app.use(xssSanitize);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files (for uploaded images in development)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`, {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration,
      ip: req.ip,
    });
  });
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Student Management API is running',
    environment: env.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/courses', courseRoutes);

// Serve frontend in production
if (env.nodeEnv === 'production') {
  const frontendPath = path.join(__dirname, '..', 'frontend', 'dist');
  app.use(express.static(frontendPath));
  
  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(frontendPath, 'index.html'));
    }
  });
}

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Global error handler
app.use(globalErrorHandler);

// Database health check helper (also primes the pool with a warm connection)
async function checkDatabaseHealth() {
  try {
    const pool = (await import('./config/database.js')).default;
    await pool.query('SELECT 1');
    logger.info('Database connection verified successfully');
  } catch (err) {
    logger.error(`Database connection failed: ${err?.message || err || 'Unknown error'}`, { stack: err?.stack });
    logger.warn('Server will start, but database operations may fail. Fix your database configuration.');
  }
}

// Email configuration check
async function checkEmailConfig() {
  try {
    const { default: EmailService } = await import('./services/emailService.js');
    const transporter = await EmailService.getTransporter();
    if (!transporter) {
      logger.warn(
        '⚠️  Email is NOT configured. The following features will NOT work:\n' +
        '   • Password reset (Forgot Password)\n' +
        '   • Student welcome emails\n' +
        '\n' +
        '   To enable emails, add these to your .env file (for Gmail):\n' +
        '   EMAIL_SERVICE=gmail\n' +
        '   EMAIL_USER=your-email@gmail.com\n' +
        '   EMAIL_PASSWORD=your-16-char-app-password\n' +
        '\n' +
        '   Or configure a custom SMTP server with:\n' +
        '   EMAIL_HOST=smtp.example.com\n' +
        '   EMAIL_PORT=587\n' +
        '   EMAIL_USER=your-email@example.com\n' +
        '   EMAIL_PASSWORD=your-password'
      );
    }
  } catch (err) {
    // Email service check is non-critical — don't block startup
    logger.debug('Email config check skipped:', err.message);
  }
}

// Server startup - skip in test environment so supertest can manage the lifecycle
if (process.env.NODE_ENV !== 'test') {
  // Check database on startup
  checkDatabaseHealth();
  
  // Check email configuration (non-blocking)
  checkEmailConfig();

  const server = app.listen(env.port, () => {
    logger.info(`Server running in ${env.nodeEnv} mode on port ${env.port}`);
    logger.info(`API available at http://localhost:${env.port}/api`);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    if (reason instanceof Error) {
      logger.error('Unhandled Rejection:', {
        message: reason.message,
        stack: reason.stack,
        promise: promise,
      });
    } else {
      logger.error('Unhandled Rejection:', {
        reason: reason,
        promise: promise,
      });
    }
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', {
      message: error.message,
      stack: error.stack,
    });
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });
}

export default app;
