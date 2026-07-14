import pool from '../config/database.js';

const Student = {
  async findAll({
    search = '',
    departmentId = '',
    courseId = '',
    status = '',
    gender = '',
    page = 1,
    limit = 10,
    sortBy = 'created_at',
    sortOrder = 'DESC',
  } = {}) {
    const offset = (page - 1) * limit;
    const allowedSort = ['first_name', 'last_name', 'student_id', 'email', 'status', 'enrollment_date', 'created_at'];
    const sortColumn = allowedSort.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    let whereClause = 'WHERE s.is_active = true';
    const params = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (
        s.first_name ILIKE $${paramIndex} OR 
        s.last_name ILIKE $${paramIndex} OR 
        s.student_id ILIKE $${paramIndex} OR 
        s.email ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (departmentId) {
      whereClause += ` AND s.department_id = $${paramIndex}`;
      params.push(departmentId);
      paramIndex++;
    }

    if (courseId) {
      whereClause += ` AND s.course_id = $${paramIndex}`;
      params.push(courseId);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND s.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (gender) {
      whereClause += ` AND s.gender = $${paramIndex}`;
      params.push(gender);
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM students s ${whereClause}`,
      params
    );
    const total = countResult.rows[0] ? parseInt(countResult.rows[0].count, 10) : 0;

    const result = await pool.query(
      `SELECT s.*, 
        d.name as department_name, 
        d.code as department_code,
        c.name as course_name,
        c.code as course_code
       FROM students s
       LEFT JOIN departments d ON s.department_id = d.id
       LEFT JOIN courses c ON s.course_id = c.id
       ${whereClause}
       ORDER BY s.${sortColumn} ${order}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return { rows: result.rows, total };
  },

  async findById(id) {
    const result = await pool.query(
      `SELECT s.*, 
        d.name as department_name, 
        d.code as department_code,
        c.name as course_name,
        c.code as course_code
       FROM students s
       LEFT JOIN departments d ON s.department_id = d.id
       LEFT JOIN courses c ON s.course_id = c.id
       WHERE s.id = $1`,
      [id]
    );
    return result.rows[0];
  },

  async findByStudentId(studentId) {
    const result = await pool.query(
      'SELECT * FROM students WHERE student_id = $1',
      [studentId]
    );
    return result.rows[0];
  },

  async findByEmail(email) {
    const result = await pool.query(
      'SELECT * FROM students WHERE email = $1',
      [email]
    );
    return result.rows[0];
  },

  async generateStudentId() {
    const year = new Date().getFullYear().toString().slice(-2);
    const result = await pool.query(
      `SELECT COUNT(*) FROM students WHERE student_id LIKE $1`,
      [`STU${year}%`]
    );
    const count = result.rows[0] ? parseInt(result.rows[0].count, 10) : 0;
    const seq = String(count + 1).padStart(4, '0');
    return `STU${year}${seq}`;
  },

  async create({
    studentId, firstName, lastName, email, phone, dateOfBirth, gender,
    address, city, state, zipCode, country, departmentId, courseId,
    enrollmentDate, status, profileImageUrl, emergencyContactName, emergencyContactPhone,
  }) {
    const result = await pool.query(
      `INSERT INTO students (
        student_id, first_name, last_name, email, phone, date_of_birth, gender,
        address, city, state, zip_code, country, department_id, course_id,
        enrollment_date, status, profile_image_url, emergency_contact_name, emergency_contact_phone
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *`,
      [
        studentId, firstName, lastName, email, phone, dateOfBirth, gender,
        address, city, state, zipCode, country, departmentId, courseId,
        enrollmentDate || new Date(), status || 'active', profileImageUrl || null,
        emergencyContactName || null, emergencyContactPhone || null,
      ]
    );
    return result.rows[0];
  },

  async update(id, fields) {
    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    const fieldMap = {
      firstName: 'first_name',
      lastName: 'last_name',
      email: 'email',
      phone: 'phone',
      dateOfBirth: 'date_of_birth',
      gender: 'gender',
      address: 'address',
      city: 'city',
      state: 'state',
      zipCode: 'zip_code',
      country: 'country',
      departmentId: 'department_id',
      courseId: 'course_id',
      status: 'status',
      profileImageUrl: 'profile_image_url',
      emergencyContactName: 'emergency_contact_name',
      emergencyContactPhone: 'emergency_contact_phone',
      isActive: 'is_active',
    };

    for (const [key, column] of Object.entries(fieldMap)) {
      if (fields[key] !== undefined) {
        setClauses.push(`${column} = $${paramIndex}`);
        values.push(fields[key]);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) return null;

    values.push(id);
    const result = await pool.query(
      `UPDATE students SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );
    return result.rows[0];
  },

  async delete(id) {
    const result = await pool.query(
      'UPDATE students SET is_active = false WHERE id = $1 RETURNING id',
      [id]
    );
    return result.rows[0];
  },

  async getStats() {
    const total = await pool.query(
      "SELECT COUNT(*) FROM students WHERE is_active = true"
    );

    const active = await pool.query(
      "SELECT COUNT(*) FROM students WHERE status = 'active' AND is_active = true"
    );

    const byDepartment = await pool.query(
      `SELECT d.id, d.name, d.code, COUNT(s.id) as count
       FROM departments d
       LEFT JOIN students s ON s.department_id = d.id AND s.is_active = true
       GROUP BY d.id, d.name, d.code
       ORDER BY count DESC`
    );

    const byStatus = await pool.query(
      `SELECT status, COUNT(*) as count
       FROM students WHERE is_active = true
       GROUP BY status`
    );

    const byGender = await pool.query(
      `SELECT gender, COUNT(*) as count
       FROM students WHERE is_active = true AND gender IS NOT NULL
       GROUP BY gender`
    );

    const recentStudents = await pool.query(
      `SELECT s.*, d.name as department_name
       FROM students s
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE s.is_active = true
       ORDER BY s.created_at DESC
       LIMIT 5`
    );

    return {
      totalStudents: parseInt(total.rows[0].count, 10),
      activeStudents: parseInt(active.rows[0].count, 10),
      byDepartment: byDepartment.rows,
      byStatus: byStatus.rows,
      byGender: byGender.rows,
      recentStudents: recentStudents.rows,
    };
  },

  async getDepartmentsCount() {
    const result = await pool.query(
      'SELECT COUNT(*) FROM departments WHERE is_active = true'
    );
    return parseInt(result.rows[0].count, 10);
  },

  async getCoursesCount() {
    const result = await pool.query(
      'SELECT COUNT(*) FROM courses WHERE is_active = true'
    );
    return parseInt(result.rows[0].count, 10);
  },
};

export default Student;
