import { Router } from 'express';
import StudentController from '../controllers/studentController.js';
import { authenticate } from '../middleware/auth.js';
import { uploadImage, handleUploadError } from '../middleware/upload.js';
import { createStudentValidation, updateStudentValidation, studentListValidation } from '../validators/studentValidator.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/students - List students with search, filter, pagination
router.get('/', studentListValidation, StudentController.list);



// GET /api/students/:id - Get single student
router.get('/:id', StudentController.getById);

// POST /api/students - Create new student
router.post(
  '/',
  uploadImage,
  handleUploadError,
  createStudentValidation,
  StudentController.create
);

// PUT /api/students/:id - Update student
router.put(
  '/:id',
  uploadImage,
  handleUploadError,
  updateStudentValidation,
  StudentController.update
);

// DELETE /api/students/:id - Delete student (soft delete)
router.delete('/:id', StudentController.delete);

// POST /api/students/:id/image - Upload student image
router.post(
  '/:id/image',
  uploadImage,
  handleUploadError,
  StudentController.uploadImage
);

export default router;
