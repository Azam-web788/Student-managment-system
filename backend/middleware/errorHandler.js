import logger from '../helpers/logger.js';
import env from '../config/env.js';

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

function globalErrorHandler(err, req, res, _next) {
  // Log the error with full details
  logger.error(`${req.method} ${req.originalUrl} - ${err?.message || err || 'Unknown error'}`, {
    errorName: err?.name,
    errorCode: err?.code,
    errorDetail: err?.detail,
    errorConstraint: err?.constraint,
    stack: err?.stack,
    body: env.nodeEnv === 'development' ? req.body : undefined,
  });

  // Determine status code and message
  let statusCode = err?.statusCode || 500;
  let message = err?.message || 'Something went wrong';

  // Handle specific error types
  if (err?.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token. Please log in again.';
  } else if (err?.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Your token has expired. Please log in again.';
  } else if (err?.code === '23505') {
    // PostgreSQL unique violation
    statusCode = 400;
    const field = err?.constraint?.replace(/_[a-z]+$/, '') || 'field';
    message = `Duplicate value for ${field}. Please use another value.`;
  } else if (err?.code === '23503') {
    // PostgreSQL foreign key violation
    statusCode = 400;
    message = 'Referenced record not found. Please check your input.';
  } else if (err?.code === '22P02') {
    // PostgreSQL invalid input syntax
    statusCode = 400;
    message = 'Invalid input format. Please check your data.';
  } else if (!err?.statusCode || err?.statusCode >= 500) {
    // Hide internal error details in production
    if (env.nodeEnv !== 'development') {
      message = 'Something went wrong';
    }
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(env.nodeEnv === 'development' && { stack: err?.stack, detail: err?.detail }),
    timestamp: new Date().toISOString(),
  });
}

export { AppError, globalErrorHandler };
