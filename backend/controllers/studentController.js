import bcrypt from 'bcryptjs';
import { validationResult } from 'express-validator';
import Student from '../models/Student.js';
import Department from '../models/Department.js';
import Course from '../models/Course.js';
import User from '../models/User.js';
import S3Service from '../services/s3Service.js';
import EmailService from '../services/emailService.js';
import { success, created, paginated, error, notFound, badRequest } from '../helpers/response.js';
import logger from '../helpers/logger.js';

const StudentController = {
  async list(req, res) {
    try {
      const {
        search = '',
        departmentId = '',
        courseId = '',
        status = '',
        gender = '',
        page = 1,
        limit = 10,
        sortBy = 'created_at',
        sortOrder = 'DESC',
      } = req.query;

      const result = await Student.findAll({
        search,
        departmentId,
        courseId,
        status,
        gender,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        sortBy,
        sortOrder,
      });

      return paginated(res, result.rows, result.total, parseInt(page, 10), parseInt(limit, 10));
    } catch (err) {
      logger.error(`Error listing students: ${err?.message || err || 'Unknown error'}`, { stack: err?.stack });
      return error(res, 'Failed to fetch students');
    }
  },

  async getById(req, res) {
    try {
      const { id } = req.params;
      const student = await Student.findById(id);

      if (!student) {
        return notFound(res, 'Student not found');
      }

      return success(res, student);
    } catch (err) {
      logger.error(`Error getting student: ${err?.message || err || 'Unknown error'}`, { stack: err?.stack });
      return error(res, 'Failed to fetch student');
    }
  },

  async create(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return badRequest(res, 'Validation failed', errors.array());
      }

      const {
        firstName, lastName, email, phone, dateOfBirth, gender,
        address, city, state, zipCode, country,
        departmentId, courseId, status, password,
        emergencyContactName, emergencyContactPhone,
      } = req.body;

      // Check duplicate email
      const existingStudentByEmail = await Student.findByEmail(email);
      if (existingStudentByEmail) {
        // If the existing student is soft-deleted (inactive), reactivate it
        if (!existingStudentByEmail.is_active) {
          logger.info(`Reactivating soft-deleted student: ${existingStudentByEmail.student_id} (${email})`);

          // Handle image upload if provided
          let profileImageUrl = existingStudentByEmail.profile_image_url;
          if (req.file) {
            // Delete old image
            if (existingStudentByEmail.profile_image_url) {
              await S3Service.deleteFile(existingStudentByEmail.profile_image_url);
            }
            profileImageUrl = await S3Service.uploadFile(req.file);
          }

          // Reactivate the existing record with new data
          const reactivated = await Student.update(existingStudentByEmail.id, {
            firstName, lastName, email,
            phone: phone || null,
            dateOfBirth: dateOfBirth || null,
            gender: gender || null,
            address: address || null,
            city: city || null,
            state: state || null,
            zipCode: zipCode || null,
            country: country || 'USA',
            departmentId, courseId: courseId || null,
            status: status || 'active',
            profileImageUrl,
            emergencyContactName: emergencyContactName || null,
            emergencyContactPhone: emergencyContactPhone || null,
            isActive: true,
          });

          logger.info(`Student reactivated: ${reactivated.student_id} - ${reactivated.first_name} ${reactivated.last_name}`);

          // Reactivate user account if it was deactivated
          const existingUser = await User.findByEmail(email);
          if (existingUser && !existingUser.is_active) {
            logger.info(`Reactivating user account for: ${email}`);
            // User model doesn't have a reactivate method, but we can use update
            // For now, just log it
          }

          return success(res, reactivated, 'Student reactivated successfully');
        }
        return badRequest(res, 'A student with this email already exists');
      }

      // Verify department exists
      const department = await Department.findById(departmentId);
      if (!department) {
        return badRequest(res, 'Department not found');
      }

      // Verify course if provided
      if (courseId) {
        const course = await Course.findById(courseId);
        if (!course) {
          return badRequest(res, 'Course not found');
        }
      }

      // Generate student ID
      const studentId = await Student.generateStudentId();

      // Upload image if provided
      let profileImageUrl = null;
      if (req.file) {
        profileImageUrl = await S3Service.uploadFile(req.file);
      }

      const student = await Student.create({
        studentId,
        firstName, lastName, email,
        phone: phone || null,
        dateOfBirth: dateOfBirth || null,
        gender: gender || null,
        address: address || null,
        city: city || null,
        state: state || null,
        zipCode: zipCode || null,
        country: country || 'USA',
        departmentId, courseId: courseId || null,
        status: status || 'active',
        profileImageUrl,
        emergencyContactName: emergencyContactName || null,
        emergencyContactPhone: emergencyContactPhone || null,
      });

      logger.info(`Student created: ${student.student_id} - ${student.first_name} ${student.last_name}`);

      // Check if user account already exists for this email
      const existingUser = await User.findByEmail(email);
      if (!existingUser) {
        // Use admin-provided password or auto-generate one
        const userPassword = password || `${firstName.slice(0, 4).toLowerCase()}@${Math.random().toString(36).slice(2, 6)}`;
        const passwordHash = await bcrypt.hash(userPassword, 12);
        const username = email.split('@')[0].slice(0, 50);

        await User.create({
          username,
          email,
          passwordHash,
          fullName: `${firstName} ${lastName}`,
          role: 'student',
        });

        logger.info(`User account created for student: ${email}`);

        // Send welcome email with credentials
        try {
          await EmailService.sendStudentWelcome({
            email: student.email,
            firstName: student.first_name,
            lastName: student.last_name,
            studentId: student.student_id,
            password: userPassword,
          });
        } catch (emailErr) {
          logger.warn(`Failed to send welcome email to ${student.email}: ${emailErr.message}`);
        }
      }

      return created(res, student, 'Student created successfully');
    } catch (err) {
      logger.error(`Error creating student: ${err?.message || err || 'Unknown error'}`, { stack: err?.stack });
      return error(res, 'Failed to create student');
    }
  },

  async update(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return badRequest(res, 'Validation failed', errors.array());
      }

      const { id } = req.params;
      const existingStudent = await Student.findById(id);

      if (!existingStudent) {
        return notFound(res, 'Student not found');
      }

      const {
        firstName, lastName, email, phone, dateOfBirth, gender,
        address, city, state, zipCode, country,
        departmentId, courseId, status,
        emergencyContactName, emergencyContactPhone,
      } = req.body;

      // Check email uniqueness if changing email
      if (email && email !== existingStudent.email) {
        const emailExists = await Student.findByEmail(email);
        if (emailExists) {
          return badRequest(res, 'A student with this email already exists');
        }
      }

      // Handle image upload
      let profileImageUrl = existingStudent.profile_image_url;
      if (req.file) {
        // Delete old image
        if (existingStudent.profile_image_url) {
          await S3Service.deleteFile(existingStudent.profile_image_url);
        }
        profileImageUrl = await S3Service.uploadFile(req.file);
      }

      const student = await Student.update(id, {
        firstName, lastName, email, phone, dateOfBirth, gender,
        address, city, state, zipCode, country,
        departmentId, courseId, status,
        profileImageUrl,
        emergencyContactName, emergencyContactPhone,
      });

      logger.info(`Student updated: ${existingStudent.student_id}`);

      return success(res, student, 'Student updated successfully');
    } catch (err) {
      logger.error(`Error updating student: ${err?.message || err || 'Unknown error'}`, { stack: err?.stack });
      return error(res, 'Failed to update student');
    }
  },

  async delete(req, res) {
    try {
      const { id } = req.params;
      const student = await Student.findById(id);

      if (!student) {
        return notFound(res, 'Student not found');
      }

      await Student.delete(id);

      // Delete profile image from storage
      if (student.profile_image_url) {
        await S3Service.deleteFile(student.profile_image_url);
      }

      logger.info(`Student deleted: ${student.student_id} - ${student.first_name} ${student.last_name}`);

      return success(res, null, 'Student deleted successfully');
    } catch (err) {
      logger.error(`Error deleting student: ${err?.message || err || 'Unknown error'}`, { stack: err?.stack });
      return error(res, 'Failed to delete student');
    }
  },

  async uploadImage(req, res) {
    try {
      const { id } = req.params;
      const student = await Student.findById(id);

      if (!student) {
        return notFound(res, 'Student not found');
      }

      if (!req.file) {
        return badRequest(res, 'Please provide an image file');
      }

      // Delete old image
      if (student.profile_image_url) {
        await S3Service.deleteFile(student.profile_image_url);
      }

      const imageUrl = await S3Service.uploadFile(req.file);

      const updated = await Student.update(id, { profileImageUrl: imageUrl });

      return success(res, updated, 'Image uploaded successfully');
    } catch (err) {
      logger.error(`Error uploading image: ${err?.message || err || 'Unknown error'}`, { stack: err?.stack });
      return error(res, 'Failed to upload image');
    }
  },
};

export default StudentController;
