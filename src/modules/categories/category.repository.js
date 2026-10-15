const pool = require('../../config/database');

class CategoryRepository {
  async findAll({ search = '', isActive = null, page = 1, limit = 20 } = {}) {
    let where = 'WHERE 1=1';
    const params = [];

    if (search) {
      where += ' AND (c.name LIKE ? OR c.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (isActive !== null) {
      where += ' AND c.is_active = ?';
      params.push(isActive);
    }

    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM categories c ${where}`,
      params
    );
    const total = countResult[0].total;

    const offset = (page - 1) * limit;
    const [rows] = await pool.query(
      `SELECT c.*, COUNT(p.id) as product_count 
       FROM categories c 
       LEFT JOIN products p ON p.category_id = c.id 
       ${where} 
       GROUP BY c.id 
       ORDER BY c.name ASC 
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    return { data: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findAllActive() {
    const [rows] = await pool.execute(
      'SELECT id, name FROM categories WHERE is_active = TRUE ORDER BY name ASC'
    );
    return rows;
  }

  async findById(id) {
    const [rows] = await pool.query(
      `SELECT c.*, COUNT(p.id) as product_count 
       FROM categories c 
       LEFT JOIN products p ON p.category_id = c.id 
       WHERE c.id = ? 
       GROUP BY c.id`,
      [id]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  async findByName(name) {
    const [rows] = await pool.execute(
      'SELECT id, name FROM categories WHERE name = ?',
      [name]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  async create({ name, description }) {
    const [result] = await pool.execute(
      'INSERT INTO categories (name, description) VALUES (?, ?)',
      [name, description || null]
    );
    return result.insertId;
  }

  async update(id, { name, description }) {
    await pool.execute(
      'UPDATE categories SET name = ?, description = ? WHERE id = ?',
      [name, description || null, id]
    );
  }

  async updateStatus(id, isActive) {
    await pool.execute(
      'UPDATE categories SET is_active = ? WHERE id = ?',
      [isActive, id]
    );
  }

  async countProducts(categoryId) {
    const [rows] = await pool.execute(
      'SELECT COUNT(*) as total FROM products WHERE category_id = ?',
      [categoryId]
    );
    return rows[0].total;
  }
}

module.exports = new CategoryRepository();
