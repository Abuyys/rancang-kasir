const pool = require('../../config/database');

class ProductRepository {
  async findAll({ search = '', categoryId = null, isActive = null, page = 1, limit = 20 } = {}) {
    let where = 'WHERE 1=1';
    const params = [];

    if (search) {
      where += ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (categoryId) {
      where += ' AND p.category_id = ?';
      params.push(categoryId);
    }
    if (isActive !== null) {
      where += ' AND p.is_active = ?';
      params.push(isActive);
    }

    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM products p ${where}`, params
    );
    const total = countResult[0].total;

    const offset = (page - 1) * limit;
    const [rows] = await pool.query(
      `SELECT p.*, c.name as category_name 
       FROM products p 
       LEFT JOIN categories c ON c.id = p.category_id 
       ${where} 
       ORDER BY p.name ASC 
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    return { data: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT p.*, c.name as category_name 
       FROM products p 
       LEFT JOIN categories c ON c.id = p.category_id 
       WHERE p.id = ?`, [id]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  async findBySku(sku) {
    const [rows] = await pool.execute('SELECT id, sku FROM products WHERE sku = ?', [sku]);
    return rows.length > 0 ? rows[0] : null;
  }

  async findByBarcode(barcode) {
    const [rows] = await pool.execute(
      `SELECT p.*, c.name as category_name 
       FROM products p 
       LEFT JOIN categories c ON c.id = p.category_id 
       WHERE p.barcode = ?`, [barcode]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  async create(data) {
    const [result] = await pool.execute(
      `INSERT INTO products (category_id, sku, barcode, name, unit, cost_price, selling_price, stock, min_stock, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.category_id, data.sku, data.barcode || null, data.name,
        data.unit || 'pcs', data.cost_price || 0, data.selling_price,
        data.stock || 0, data.min_stock || 0,
        data.is_active !== undefined ? data.is_active : true,
      ]
    );
    return result.insertId;
  }

  async update(id, data) {
    await pool.execute(
      `UPDATE products SET 
        category_id = ?, sku = ?, barcode = ?, name = ?, unit = ?, 
        cost_price = ?, selling_price = ?, min_stock = ?, is_active = ? 
       WHERE id = ?`,
      [
        data.category_id, data.sku, data.barcode || null, data.name,
        data.unit || 'pcs', data.cost_price || 0, data.selling_price,
        data.min_stock || 0, data.is_active !== undefined ? data.is_active : true, id,
      ]
    );
  }

  async updateStatus(id, isActive) {
    await pool.execute('UPDATE products SET is_active = ? WHERE id = ?', [isActive, id]);
  }
}

module.exports = new ProductRepository();
