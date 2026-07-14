import { Router } from 'express';
import { body } from 'express-validator';
import AuthController from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { uploadImage, handleUploadError } from '../middleware/upload.js';
import { loginValidation, registerValidation } from '../validators/authValidator.js';

const router = Router();

// POST /api/auth/register - Register new admin user
router.post('/register', registerValidation, AuthController.register);

// POST /api/auth/login - Login user
router.post('/login', loginValidation, AuthController.login);

// GET /api/auth/profile - Get current user profile (protected)
router.get('/profile', authenticate, AuthController.getProfile);

// POST /api/auth/logout - Logout (protected)
router.post('/logout', authenticate, AuthController.logout);

// POST /api/auth/forgot-password - Request password reset
router.post('/forgot-password', [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
], AuthController.forgotPassword);

// POST /api/auth/reset-password - Reset password with token
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
], AuthController.resetPassword);

// PUT /api/auth/profile - Update profile (protected)
router.put('/profile', authenticate, [
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
], AuthController.updateProfile);

// POST /api/auth/profile/image - Upload profile image (protected)
router.post('/profile/image', authenticate, uploadImage, handleUploadError, AuthController.uploadProfileImage);

export default router;
