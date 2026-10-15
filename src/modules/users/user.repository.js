const pool = require('../../config/database');

class UserRepository {
  async findAll({ search = '', role = null, status = null, page = 1, limit = 20 } = {}) {
    let where = 'WHERE 1=1';
    const params = [];

    if (search) {
      where += ' AND (u.name LIKE ? OR u.username LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (role) {
      where += ' AND u.role = ?';
      params.push(role);
    }
    if (status !== null && status !== undefined && status !== '') {
      where += ' AND u.is_active = ?';
      params.push(status === 'active' || status === '1' || status === true ? 1 : 0);
    }

    const [countResult] = await pool.execute(`SELECT COUNT(*) as total FROM users u ${where}`, params);
    const total = countResult[0].total;
    const offset = (page - 1) * limit;

    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.username, u.role, u.is_active, u.last_login_at, u.created_at,
              COUNT(s.id) as total_sales_count
       FROM users u
       LEFT JOIN sales s ON s.user_id = u.id AND s.status != 'cancelled'
       ${where}
       GROUP BY u.id
       ORDER BY u.role ASC, u.name ASC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    return { data: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id) {
    const [rows] = await pool.execute(
      'SELECT id, name, username, role, is_active, last_login_at, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  async findByUsername(username) {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  async create(data) {
    const [result] = await pool.execute(
      `INSERT INTO users (name, username, password_hash, role, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [data.name, data.username, data.password_hash, data.role, data.is_active !== undefined ? data.is_active : 1]
    );
    return result.insertId;
  }

  async update(id, data) {
    await pool.execute(
      `UPDATE users
       SET name = ?, role = ?, is_active = ?, updated_at = NOW()
       WHERE id = ?`,
      [data.name, data.role, data.is_active ? 1 : 0, id]
    );
  }

  async updatePassword(id, passwordHash) {
    await pool.execute(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [passwordHash, id]
    );
  }

  async toggleStatus(id, isActive) {
    await pool.execute(
      'UPDATE users SET is_active = ?, updated_at = NOW() WHERE id = ?',
      [isActive ? 1 : 0, id]
    );
  }
}

module.exports = new UserRepository();
