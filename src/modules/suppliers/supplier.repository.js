const pool = require('../../config/database');

class SupplierRepository {
  async findAll({ search = '', isActive = null, page = 1, limit = 20 } = {}) {
    let where = 'WHERE 1=1';
    const params = [];

    if (search) {
      where += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (isActive !== null) {
      where += ' AND is_active = ?';
      params.push(isActive);
    }

    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM suppliers ${where}`, params
    );
    const total = countResult[0].total;
    const offset = (page - 1) * limit;

    const [rows] = await pool.query(
      `SELECT * FROM suppliers ${where} ORDER BY name ASC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );
    return { data: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findAllActive() {
    const [rows] = await pool.execute(
      'SELECT id, name FROM suppliers WHERE is_active = TRUE ORDER BY name ASC'
    );
    return rows;
  }

  async findById(id) {
    const [rows] = await pool.execute('SELECT * FROM suppliers WHERE id = ?', [id]);
    return rows.length > 0 ? rows[0] : null;
  }

  async create(data) {
    const [result] = await pool.execute(
      'INSERT INTO suppliers (name, phone, email, address, notes) VALUES (?, ?, ?, ?, ?)',
      [data.name, data.phone || null, data.email || null, data.address || null, data.notes || null]
    );
    return result.insertId;
  }

  async update(id, data) {
    await pool.execute(
      'UPDATE suppliers SET name = ?, phone = ?, email = ?, address = ?, notes = ? WHERE id = ?',
      [data.name, data.phone || null, data.email || null, data.address || null, data.notes || null, id]
    );
  }

  async updateStatus(id, isActive) {
    await pool.execute('UPDATE suppliers SET is_active = ? WHERE id = ?', [isActive, id]);
  }
}

module.exports = new SupplierRepository();
