import pool from '../config/database.js';

const Department = {
  async findAll({ search = '', page = 1, limit = 10, sortBy = 'name', sortOrder = 'ASC' } = {}) {
    const offset = (page - 1) * limit;
    const allowedSort = ['name', 'code', 'created_at'];
    const sortColumn = allowedSort.includes(sortBy) ? sortBy : 'name';
    const order = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    let whereClause = 'WHERE d.is_active = true';
    const params = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (d.name ILIKE $${paramIndex} OR d.code ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM departments d ${whereClause}`,
      params
    );
    const total = countResult.rows[0] ? parseInt(countResult.rows[0].count, 10) : 0;

    const result = await pool.query(
      `SELECT d.*, 
        (SELECT COUNT(*) FROM students s WHERE s.department_id = d.id AND s.is_active = true) as student_count
       FROM departments d 
       ${whereClause}
       ORDER BY d.${sortColumn} ${order}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return { rows: result.rows, total };
  },

  async findById(id) {
    const result = await pool.query(
      `SELECT d.*, 
        (SELECT COUNT(*) FROM students s WHERE s.department_id = d.id) as student_count
       FROM departments d WHERE d.id = $1`,
      [id]
    );
    return result.rows[0];
  },

  async findByCode(code) {
    const result = await pool.query(
      'SELECT * FROM departments WHERE code = $1',
      [code]
    );
    return result.rows[0];
  },

  async findByName(name) {
    const result = await pool.query(
      'SELECT * FROM departments WHERE name = $1',
      [name]
    );
    return result.rows[0];
  },

  async findByCodeOrName(code, name) {
    const result = await pool.query(
      'SELECT * FROM departments WHERE code = $1 OR name = $2',
      [code, name]
    );
    return result.rows;
  },

  async create({ name, code, description }) {
    const result = await pool.query(
      `INSERT INTO departments (name, code, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, code, description]
    );
    return result.rows[0];
  },

  async update(id, { name, code, description, isActive }) {
    const result = await pool.query(
      `UPDATE departments 
       SET name = COALESCE($1, name),
           code = COALESCE($2, code),
           description = COALESCE($3, description),
           is_active = COALESCE($4, is_active)
       WHERE id = $5
       RETURNING *`,
      [name, code, description, isActive ?? null, id]
    );
    return result.rows[0];
  },

  async delete(id) {
    const result = await pool.query(
      'UPDATE departments SET is_active = false WHERE id = $1 RETURNING id',
      [id]
    );
    return result.rows[0];
  },

  async getAllSimple() {
    const result = await pool.query(
      'SELECT id, name, code FROM departments WHERE is_active = true ORDER BY name'
    );
    return result.rows;
  },
};

export default Department;
