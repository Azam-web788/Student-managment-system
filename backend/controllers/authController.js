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

  async forgotPassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return badRequest(res, 'Validation failed', errors.array());
      }

      const { email } = req.body;
      const result = await AuthService.forgotPassword(email);
      return success(res, null, result.message);
    } catch (err) {
      logger.error(`Forgot password error: ${err?.message || err || 'Unknown error'}`, { stack: err?.stack });
      return error(res, 'Failed to process request', 500);
    }
  },

  async resetPassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return badRequest(res, 'Validation failed', errors.array());
      }

      const { token, password } = req.body;
      const result = await AuthService.resetPassword(token, password);
      return success(res, null, result.message);
    } catch (err) {
      if (err?.statusCode) {
        return error(res, err?.message || 'Reset failed', err.statusCode);
      }
      if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return badRequest(res, 'Invalid or expired reset token. Please request a new one.');
      }
      logger.error(`Reset password error: ${err?.message || err || 'Unknown error'}`, { stack: err?.stack });
      return error(res, 'Failed to reset password', 500);
    }
  },

  async updateProfile(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return badRequest(res, 'Validation failed', errors.array());
      }

      const { fullName } = req.body;
      const user = await AuthService.updateProfile(req.user.id, { fullName });
      return success(res, { user }, 'Profile updated successfully');
    } catch (err) {
      if (err?.statusCode) {
        return error(res, err?.message || 'Update failed', err.statusCode);
      }
      logger.error(`Profile update error: ${err?.message || err || 'Unknown error'}`, { stack: err?.stack });
      return error(res, 'Failed to update profile', 500);
    }
  },

  async uploadProfileImage(req, res) {
    try {
      if (!req.file) {
        return badRequest(res, 'Please provide an image file');
      }

      // Find student by the authenticated user's email
      const { default: Student } = await import('../models/Student.js');
      const { default: S3Service } = await import('../services/s3Service.js');

      const student = await Student.findByEmail(req.user.email);
      if (!student) {
        return badRequest(res, 'Student profile not found. Contact an administrator.');
      }

      // Delete old image if exists
      if (student.profile_image_url) {
        await S3Service.deleteFile(student.profile_image_url);
      }

      // Upload the new image
      const imageUrl = await S3Service.uploadFile(req.file);

      // Update student's profile image
      await Student.update(student.id, { profileImageUrl: imageUrl });

      logger.info(`Profile image updated for student: ${req.user.email} - ${imageUrl}`);

      return success(res, { profileImageUrl: imageUrl }, 'Profile image updated successfully');
    } catch (err) {
      logger.error(`Profile image upload error: ${err?.message || err || 'Unknown error'}`, { stack: err?.stack });
      return error(res, 'Failed to upload profile image', 500);
    }
  },
};

export default AuthController;
