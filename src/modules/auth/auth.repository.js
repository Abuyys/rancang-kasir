const pool = require('../../config/database');

class AuthRepository {
  /**
   * Find user by username
   * @param {string} username
   * @returns {Promise<object|null>}
   */
  async findByUsername(username) {
    const [rows] = await pool.execute(
      'SELECT id, name, username, password_hash, role, is_active, last_login_at FROM users WHERE username = ?',
      [username]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Find user by ID
   * @param {number} id
   * @returns {Promise<object|null>}
   */
  async findById(id) {
    const [rows] = await pool.execute(
      'SELECT id, name, username, role, is_active, last_login_at, created_at FROM users WHERE id = ?',
      [id]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Update last login timestamp
   * @param {number} userId
   */
  async updateLastLogin(userId) {
    await pool.execute(
      'UPDATE users SET last_login_at = NOW() WHERE id = ?',
      [userId]
    );
  }
}

module.exports = new AuthRepository();
