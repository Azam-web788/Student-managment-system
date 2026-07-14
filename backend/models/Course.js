import pool from '../config/database.js';

const Course = {
  async findAll({ search = '', departmentId = '', page = 1, limit = 10, sortBy = 'name', sortOrder = 'ASC' } = {}) {
    const offset = (page - 1) * limit;
    const allowedSort = ['name', 'code', 'credits', 'created_at'];
    const sortColumn = allowedSort.includes(sortBy) ? sortBy : 'name';
    const order = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    let whereClause = 'WHERE c.is_active = true';
    const params = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (c.name ILIKE $${paramIndex} OR c.code ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (departmentId) {
      whereClause += ` AND c.department_id = $${paramIndex}`;
      params.push(departmentId);
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM courses c ${whereClause}`,
      params
    );
    const total = countResult.rows[0] ? parseInt(countResult.rows[0].count, 10) : 0;

    const result = await pool.query(
      `SELECT c.*, d.name as department_name, d.code as department_code,
        (SELECT COUNT(*) FROM students s WHERE s.course_id = c.id AND s.is_active = true) as student_count
       FROM courses c
       JOIN departments d ON c.department_id = d.id
       ${whereClause}
       ORDER BY c.${sortColumn} ${order}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return { rows: result.rows, total };
  },

  async findById(id) {
    const result = await pool.query(
      `SELECT c.*, d.name as department_name, d.code as department_code
       FROM courses c
       JOIN departments d ON c.department_id = d.id
       WHERE c.id = $1`,
      [id]
    );
    return result.rows[0];
  },

  async findByCode(code) {
    const result = await pool.query('SELECT * FROM courses WHERE code = $1', [code]);
    return result.rows[0];
  },

  async create({ name, code, description, credits, departmentId }) {
    const result = await pool.query(
      `INSERT INTO courses (name, code, description, credits, department_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, code, description, credits, departmentId]
    );
    return result.rows[0];
  },

  async update(id, { name, code, description, credits, departmentId, isActive }) {
    const result = await pool.query(
      `UPDATE courses 
       SET name = COALESCE($1, name),
           code = COALESCE($2, code),
           description = COALESCE($3, description),
           credits = COALESCE($4, credits),
           department_id = COALESCE($5, department_id),
           is_active = COALESCE($6, is_active)
       WHERE id = $7
       RETURNING *`,
      [name, code, description, credits, departmentId, isActive ?? null, id]
    );
    return result.rows[0];
  },

  async delete(id) {
    const result = await pool.query(
      'UPDATE courses SET is_active = false WHERE id = $1 RETURNING id',
      [id]
    );
    return result.rows[0];
  },

  async getByDepartment(departmentId) {
    const result = await pool.query(
      'SELECT id, name, code, credits FROM courses WHERE department_id = $1 AND is_active = true ORDER BY name',
      [departmentId]
    );
    return result.rows;
  },

  async getAllSimple() {
    const result = await pool.query(
      'SELECT c.id, c.name, c.code, d.name as department_name FROM courses c JOIN departments d ON c.department_id = d.id WHERE c.is_active = true ORDER BY c.name'
    );
    return result.rows;
  },
};

export default Course;
