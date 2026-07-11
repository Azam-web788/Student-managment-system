import { Router } from 'express';
import DashboardController from '../controllers/dashboardController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/dashboard/stats - Get main dashboard statistics
router.get('/stats', DashboardController.getStats);

// GET /api/dashboard/departments - Get department statistics
router.get('/departments', DashboardController.getDepartmentStats);

// GET /api/dashboard/activity - Get recent activity
router.get('/activity', DashboardController.getRecentActivity);

// GET /api/dashboard/enrollment-trends - Get enrollment trends
router.get('/enrollment-trends', DashboardController.getEnrollmentTrends);

export default router;
