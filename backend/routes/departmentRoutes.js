import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import Department from '../models/Department.js';
import { success, created, paginated, error, notFound, badRequest } from '../helpers/response.js';
import logger from '../helpers/logger.js';

const router = Router();
router.use(authenticate);

// GET /api/departments - List all departments
router.get('/', async (req, res) => {
  try {
    const { search = '', page = 1, limit = 50, sortBy = 'name', sortOrder = 'ASC' } = req.query;
    const result = await Department.findAll({ search, page: parseInt(page), limit: parseInt(limit), sortBy, sortOrder });
    return paginated(res, result.rows, result.total, parseInt(page), parseInt(limit));
  } catch (err) {
    logger.error(`Error listing departments: ${err?.message || err || 'Unknown error'}`, { stack: err?.stack });
    return error(res, 'Failed to fetch departments');
  }
});

// GET /api/departments/all - Simple list for dropdowns
router.get('/all', async (req, res) => {
  try {
    const departments = await Department.getAllSimple();
    return success(res, departments);
  } catch (err) {
    logger.error(`Error fetching all departments: ${err?.message || err || 'Unknown error'}`, { stack: err?.stack });
    return error(res, 'Failed to fetch departments');
  }
});

// GET /api/departments/:id - Get single department
router.get('/:id', async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) return notFound(res, 'Department not found');
    return success(res, department);
  } catch (err) {
    logger.error(`Error fetching department: ${err?.message || err || 'Unknown error'}`, { stack: err?.stack });
    return error(res, 'Failed to fetch department');
  }
});

// POST /api/departments - Create department
router.post('/', async (req, res) => {
  try {
    const { name, code, description } = req.body;
    if (!name || !code) return badRequest(res, 'Name and code are required');

    const existing = await Department.findByCode(code);
    if (existing) return badRequest(res, 'Department code already exists');

    const department = await Department.create({ name, code, description });
    return created(res, department, 'Department created successfully');
  } catch (err) {
    logger.error(`Error creating department: ${err?.message || err || 'Unknown error'}`, { stack: err?.stack });
    return error(res, 'Failed to create department');
  }
});

// PUT /api/departments/:id - Update department
router.put('/:id', async (req, res) => {
  try {
    const { name, code, description, isActive } = req.body;
    const department = await Department.update(req.params.id, { name, code, description, isActive });
    if (!department) return notFound(res, 'Department not found');
    return success(res, department, 'Department updated successfully');
  } catch (err) {
    logger.error(`Error updating department: ${err?.message || err || 'Unknown error'}`, { stack: err?.stack });
    return error(res, 'Failed to update department');
  }
});

// DELETE /api/departments/:id - Delete department
router.delete('/:id', async (req, res) => {
  try {
    const result = await Department.delete(req.params.id);
    if (!result) return notFound(res, 'Department not found');
    return success(res, null, 'Department deleted successfully');
  } catch (err) {
    logger.error(`Error deleting department: ${err?.message || err || 'Unknown error'}`, { stack: err?.stack });
    return error(res, 'Failed to delete department');
  }
});

export default router;
