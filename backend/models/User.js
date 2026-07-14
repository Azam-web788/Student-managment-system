import pool from '../config/database.js';

const User = {
  async findByEmail(email) {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0];
  },

  async findByUsername(username) {
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await pool.query(
      'SELECT id, username, email, full_name, role, is_active, last_login, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  },

  async create({ username, email, passwordHash, fullName, role }) {
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, email, full_name, role, created_at`,
      [username, email, passwordHash, fullName, role || 'admin']
    );
    return result.rows[0];
  },

  async updateLastLogin(id) {
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
  },

  async updateStatus(email, isActive) {
    await pool.query(
      'UPDATE users SET is_active = $1 WHERE email = $2',
      [isActive, email]
    );
  },

  async updatePassword(id, passwordHash) {
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [passwordHash, id]
    );
  },

  async updateProfile(id, { fullName }) {
    const result = await pool.query(
      'UPDATE users SET full_name = COALESCE($1, full_name) WHERE id = $2 RETURNING id, username, email, full_name, role',
      [fullName, id]
    );
    return result.rows[0];
  },

  async listAll() {
    const result = await pool.query(
      'SELECT id, username, email, full_name, role, is_active, last_login, created_at FROM users ORDER BY created_at DESC'
    );
    return result.rows;
  },
};

export default User;
