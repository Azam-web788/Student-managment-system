import { Router } from 'express';
import AuthController from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
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

export default router;
