import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import Course from '../models/Course.js';
import { success, created, paginated, error, notFound, badRequest } from '../helpers/response.js';
import logger from '../helpers/logger.js';

const router = Router();
router.use(authenticate);

// GET /api/courses - List courses
router.get('/', async (req, res) => {
  try {
    const { search = '', departmentId = '', page = 1, limit = 50, sortBy = 'name', sortOrder = 'ASC' } = req.query;
    const result = await Course.findAll({
      search, departmentId, page: parseInt(page), limit: parseInt(limit), sortBy, sortOrder,
    });
    return paginated(res, result.rows, result.total, parseInt(page), parseInt(limit));
  } catch (err) {
    logger.error(`Error listing courses: ${err?.message || err || 'Unknown error'}`, { stack: err?.stack });
    return error(res, 'Failed to fetch courses');
  }
});

// GET /api/courses/all - Simple list for dropdowns
router.get('/all', async (req, res) => {
  try {
    const { departmentId } = req.query;
    const courses = departmentId
      ? await Course.getByDepartment(departmentId)
      : await Course.getAllSimple();
    return success(res, courses);
  } catch (err) {
    logger.error(`Error fetching all courses: ${err?.message || err || 'Unknown error'}`, { stack: err?.stack });
    return error(res, 'Failed to fetch courses');
  }
});

// GET /api/courses/by-department/:departmentId
router.get('/by-department/:departmentId', async (req, res) => {
  try {
    const courses = await Course.getByDepartment(req.params.departmentId);
    return success(res, courses);
  } catch (err) {
    logger.error(`Error fetching courses by department: ${err?.message || err || 'Unknown error'}`, { stack: err?.stack });
    return error(res, 'Failed to fetch courses');
  }
});

// GET /api/courses/:id - Get single course
router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return notFound(res, 'Course not found');
    return success(res, course);
  } catch (err) {
    logger.error(`Error fetching course: ${err?.message || err || 'Unknown error'}`, { stack: err?.stack });
    return error(res, 'Failed to fetch course');
  }
});

// POST /api/courses - Create course
router.post('/', async (req, res) => {
  try {
    const { name, code, description, credits, departmentId } = req.body;
    if (!name || !code || !credits || !departmentId) {
      return badRequest(res, 'Name, code, credits, and department are required');
    }

    const existing = await Course.findByCode(code);
    if (existing) return badRequest(res, 'Course code already exists');

    const course = await Course.create({ name, code, description, credits, departmentId });
    return created(res, course, 'Course created successfully');
  } catch (err) {
    logger.error(`Error creating course: ${err?.message || err || 'Unknown error'}`, { stack: err?.stack });
    return error(res, 'Failed to create course');
  }
});

// PUT /api/courses/:id - Update course
router.put('/:id', async (req, res) => {
  try {
    const { name, code, description, credits, departmentId, isActive } = req.body;
    const course = await Course.update(req.params.id, { name, code, description, credits, departmentId, isActive });
    if (!course) return notFound(res, 'Course not found');
    return success(res, course, 'Course updated successfully');
  } catch (err) {
    logger.error(`Error updating course: ${err?.message || err || 'Unknown error'}`, { stack: err?.stack });
    return error(res, 'Failed to update course');
  }
});

// DELETE /api/courses/:id - Delete course
router.delete('/:id', async (req, res) => {
  try {
    const result = await Course.delete(req.params.id);
    if (!result) return notFound(res, 'Course not found');
    return success(res, null, 'Course deleted successfully');
  } catch (err) {
    logger.error(`Error deleting course: ${err?.message || err || 'Unknown error'}`, { stack: err?.stack });
    return error(res, 'Failed to delete course');
  }
});

export default router;
