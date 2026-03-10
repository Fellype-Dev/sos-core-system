const { query } = require('../config/database');

class User {
  static async findAll() {
    const result = await query('SELECT id, name, email, created_at FROM users ORDER BY created_at DESC');
    return result.rows;
  }

  static async findById(id) {
    const result = await query('SELECT id, name, email, created_at FROM users WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
  }

  static async create(userData) {
    const { name, email, password } = userData;
    const result = await query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email, created_at',
      [name, email, password]
    );
    return result.rows[0];
  }

  static async update(id, userData) {
    const { name, email } = userData;
    const result = await query(
      'UPDATE users SET name = $1, email = $2, updated_at = NOW() WHERE id = $3 RETURNING id, name, email, updated_at',
      [name, email, id]
    );
    return result.rows[0];
  }

  static async delete(id) {
    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    return result.rows[0];
  }
}

module.exports = User;
