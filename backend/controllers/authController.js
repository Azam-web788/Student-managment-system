import { validationResult } from 'express-validator';
import AuthService from '../services/authService.js';
import { success, created, error, badRequest } from '../helpers/response.js';
import logger from '../helpers/logger.js';

const AuthController = {
  async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return badRequest(res, 'Validation failed', errors.array());
      }

      const { username, email, password, fullName } = req.body;

      const result = await AuthService.register({
        username,
        email,
        password,
        fullName,
      });

      return created(res, {
        user: result.user,
        token: result.token,
      }, 'Registration successful');
    } catch (err) {
      if (err?.statusCode) {
        return error(res, err?.message || 'Registration failed', err.statusCode);
      }
      logger.error(`Registration error: ${err?.message || err || 'Unknown error'}`, { stack: err?.stack });
      return error(res, 'Registration failed', 500);
    }
  },

  async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return badRequest(res, 'Validation failed', errors.array());
      }

      const { email, password } = req.body;

      const result = await AuthService.login(email, password);

      return success(res, {
        user: result.user,
        token: result.token,
      }, 'Login successful');
    } catch (err) {
      if (err?.statusCode) {
        return error(res, err?.message || 'Login failed', err.statusCode);
      }
      logger.error(`Login error: ${err?.message || err || 'Unknown error'}`, { stack: err?.stack });
      return error(res, 'Login failed', 500);
    }
  },

  async getProfile(req, res) {
    try {
      return success(res, { user: req.user }, 'Profile retrieved successfully');
    } catch (err) {
      logger.error(`Profile error: ${err?.message || err || 'Unknown error'}`, { stack: err?.stack });
      return error(res, 'Failed to retrieve profile', 500);
    }
  },

  async logout(req, res) {
    try {
      // In a stateless JWT setup, logout is handled client-side
      // This endpoint exists for logging purposes
      logger.info(`User logged out: ${req.user.email}`);
      return success(res, null, 'Logged out successfully');
    } catch {
      return error(res, 'Logout failed', 500);
    }
  },
};

export default AuthController;
