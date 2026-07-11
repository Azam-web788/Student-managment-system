import Student from '../models/Student.js';
import pool from '../config/database.js';
import { success, error } from '../helpers/response.js';
import logger from '../helpers/logger.js';

const DashboardController = {
  async getStats(req, res) {
    try {
      const studentStats = await Student.getStats();
      const departmentsCount = await Student.getDepartmentsCount();
      const coursesCount = await Student.getCoursesCount();

      return success(res, {
        totalStudents: studentStats.totalStudents,
        activeStudents: studentStats.activeStudents,
        totalDepartments: departmentsCount,
        totalCourses: coursesCount,
        byDepartment: studentStats.byDepartment,
        byStatus: studentStats.byStatus,
        byGender: studentStats.byGender,
        recentStudents: studentStats.recentStudents,
      });
    } catch (err) {
      logger.error(`Error fetching dashboard stats: ${err?.message || err || 'Unknown error'}`, { stack: err?.stack });
      return error(res, 'Failed to fetch dashboard statistics');
    }
  },

  async getDepartmentStats(req, res) {
    try {
      const result = await pool.query(
        `SELECT 
          d.id, d.name, d.code,
          COUNT(s.id) FILTER (WHERE s.is_active = true) as student_count,
          COUNT(s.id) FILTER (WHERE s.status = 'active' AND s.is_active = true) as active_student_count,
          COUNT(c.id) as course_count
        FROM departments d
        LEFT JOIN students s ON s.department_id = d.id
        LEFT JOIN courses c ON c.department_id = d.id AND c.is_active = true
        WHERE d.is_active = true
        GROUP BY d.id, d.name, d.code
        ORDER BY student_count DESC`
      );

      return success(res, result.rows);
    } catch (err) {
      logger.error(`Error fetching department stats: ${err?.message || err || 'Unknown error'}`, { stack: err?.stack });
      return error(res, 'Failed to fetch department statistics');
    }
  },

  async getRecentActivity(req, res) {
    try {
      const result = await pool.query(
        `SELECT 
          s.id, s.first_name, s.last_name, s.student_id, s.status,
          d.name as department_name,
          s.created_at
        FROM students s
        LEFT JOIN departments d ON s.department_id = d.id
        WHERE s.is_active = true
        ORDER BY s.created_at DESC
        LIMIT 10`
      );

      return success(res, result.rows);
    } catch (err) {
      logger.error(`Error fetching recent activity: ${err?.message || err || 'Unknown error'}`, { stack: err?.stack });
      return error(res, 'Failed to fetch recent activity');
    }
  },

  async getEnrollmentTrends(req, res) {
    try {
      const result = await pool.query(
        `SELECT 
          DATE_TRUNC('month', enrollment_date) as month,
          COUNT(*) as count
        FROM students
        WHERE is_active = true
          AND enrollment_date >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', enrollment_date)
        ORDER BY month ASC`
      );

      return success(res, result.rows);
    } catch (err) {
      logger.error(`Error fetching enrollment trends: ${err?.message || err || 'Unknown error'}`, { stack: err?.stack });
      return error(res, 'Failed to fetch enrollment trends');
    }
  },
};

export default DashboardController;
