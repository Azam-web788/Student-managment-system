import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import pool from '../config/database.js';
import { unauthorized, forbidden } from '../helpers/response.js';
import logger from '../helpers/logger.js';

/**
 * Verify JWT token and attach user to request
 */
export async function authenticate(req, res, next) {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      logger.warn('Authentication failed: No token provided', {
        ip: req.ip,
        path: req.originalUrl,
      });
      return unauthorized(res, 'Access denied. No token provided.');
    }

    const decoded = jwt.verify(token, env.jwt.secret);

    const result = await pool.query(
      'SELECT id, username, email, full_name, role, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return unauthorized(res, 'User no longer exists.');
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return unauthorized(res, 'Account has been deactivated.');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return unauthorized(res, 'Invalid token.');
    }
    if (error.name === 'TokenExpiredError') {
      return unauthorized(res, 'Token has expired.');
    }
    logger.error(`Authentication error: ${error?.message || error || 'Unknown error'}`, { stack: error?.stack });
    return unauthorized(res, 'Authentication failed.');
  }
}

/**
 * Authorize by role
 */
export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return unauthorized(res, 'Authentication required.');
    }
    if (!roles.includes(req.user.role)) {
      logger.warn(`Authorization failed: User ${req.user.id} with role ${req.user.role} attempted to access ${req.originalUrl}`);
      return forbidden(res, 'You do not have permission to perform this action.');
    }
    next();
  };
}
