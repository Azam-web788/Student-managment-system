import { body, param, query } from 'express-validator';

export const createStudentValidation = [
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('phone')
    .optional({ values: 'falsy' })
    .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/)
    .withMessage('Please provide a valid phone number'),
  body('dateOfBirth')
    .optional({ values: 'falsy' })
    .isDate()
    .withMessage('Please provide a valid date of birth'),
  body('gender')
    .optional({ values: 'falsy' })
    .isIn(['Male', 'Female', 'Other'])
    .withMessage('Gender must be Male, Female, or Other'),
  body('departmentId')
    .isUUID()
    .withMessage('Please select a valid department'),
  body('courseId')
    .optional({ values: 'falsy' })
    .isUUID()
    .withMessage('Please select a valid course'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'graduated', 'suspended'])
    .withMessage('Invalid status value'),
  body('emergencyContactName')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Emergency contact name too long'),
  body('emergencyContactPhone')
    .optional({ values: 'falsy' })
    .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/)
    .withMessage('Please provide a valid emergency contact phone number'),
];

export const updateStudentValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid student ID'),
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('phone')
    .optional({ values: 'falsy' })
    .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/)
    .withMessage('Please provide a valid phone number'),
  body('gender')
    .optional({ values: 'falsy' })
    .isIn(['Male', 'Female', 'Other'])
    .withMessage('Gender must be Male, Female, or Other'),
  body('departmentId')
    .optional()
    .isUUID()
    .withMessage('Please select a valid department'),
  body('courseId')
    .optional({ values: 'falsy' })
    .isUUID()
    .withMessage('Please select a valid course'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'graduated', 'suspended'])
    .withMessage('Invalid status value'),
];

export const studentListValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('sortBy')
    .optional()
    .isIn(['first_name', 'last_name', 'student_id', 'email', 'status', 'enrollment_date', 'created_at'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['ASC', 'DESC'])
    .withMessage('Sort order must be ASC or DESC'),
];
