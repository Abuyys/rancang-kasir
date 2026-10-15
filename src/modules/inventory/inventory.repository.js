const pool = require('../../config/database');

class InventoryRepository {
  async getStockSummary({ search = '', lowStock = false, page = 1, limit = 20 } = {}) {
    let where = 'WHERE p.is_active = TRUE';
    const params = [];

    if (search) {
      where += ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (lowStock) {
      where += ' AND p.stock <= p.min_stock';
    }

    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM products p ${where}`, params
    );
    const total = countResult[0].total;
    const offset = (page - 1) * limit;

    const [rows] = await pool.query(
      `SELECT p.id, p.sku, p.barcode, p.name, p.unit, p.stock, p.min_stock, p.cost_price, c.name as category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       ${where}
       ORDER BY ${lowStock ? 'p.stock ASC' : 'p.name ASC'}
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );
    return { data: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getMovements({ productId = null, movementType = null, page = 1, limit = 30 } = {}) {
    let where = 'WHERE 1=1';
    const params = [];

    if (productId) { where += ' AND sm.product_id = ?'; params.push(productId); }
    if (movementType) { where += ' AND sm.movement_type = ?'; params.push(movementType); }

    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM stock_movements sm ${where}`, params
    );
    const total = countResult[0].total;
    const offset = (page - 1) * limit;

    const [rows] = await pool.query(
      `SELECT sm.*, p.name as product_name, p.sku as product_sku, u.name as user_name
       FROM stock_movements sm
       LEFT JOIN products p ON p.id = sm.product_id
       LEFT JOIN users u ON u.id = sm.user_id
       ${where}
       ORDER BY sm.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );
    return { data: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getProductForUpdate(conn, productId) {
    const [rows] = await conn.execute(
      'SELECT id, name, stock FROM products WHERE id = ? FOR UPDATE', [productId]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  async updateStock(conn, productId, newStock) {
    await conn.execute('UPDATE products SET stock = ? WHERE id = ?', [newStock, productId]);
  }

  async createMovement(conn, data) {
    await conn.execute(
      `INSERT INTO stock_movements (product_id, user_id, movement_type, quantity_change, stock_before, stock_after, reference_type, reference_id, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [data.product_id, data.user_id, data.movement_type, data.quantity_change,
       data.stock_before, data.stock_after, data.reference_type || null,
       data.reference_id || null, data.note || null]
    );
  }
}

module.exports = new InventoryRepository();
