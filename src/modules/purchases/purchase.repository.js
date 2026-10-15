const pool = require('../../config/database');

class PurchaseRepository {
  async findAll({ search = '', status = null, supplierId = null, page = 1, limit = 20 } = {}) {
    let where = 'WHERE 1=1';
    const params = [];

    if (search) {
      where += ' AND (pu.purchase_number LIKE ? OR pu.supplier_invoice_number LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (status) { where += ' AND pu.status = ?'; params.push(status); }
    if (supplierId) { where += ' AND pu.supplier_id = ?'; params.push(supplierId); }

    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM purchases pu ${where}`, params
    );
    const total = countResult[0].total;
    const offset = (page - 1) * limit;

    const [rows] = await pool.query(
      `SELECT pu.*, s.name as supplier_name, u.name as user_name
       FROM purchases pu
       LEFT JOIN suppliers s ON s.id = pu.supplier_id
       LEFT JOIN users u ON u.id = pu.user_id
       ${where}
       ORDER BY pu.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );
    return { data: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT pu.*, s.name as supplier_name, u.name as user_name
       FROM purchases pu
       LEFT JOIN suppliers s ON s.id = pu.supplier_id
       LEFT JOIN users u ON u.id = pu.user_id
       WHERE pu.id = ?`, [id]
    );
    if (rows.length === 0) return null;

    const purchase = rows[0];
    const [items] = await pool.execute(
      `SELECT pi.*, p.name as product_name, p.sku as product_sku
       FROM purchase_items pi
       LEFT JOIN products p ON p.id = pi.product_id
       WHERE pi.purchase_id = ?`, [id]
    );
    purchase.items = items;
    return purchase;
  }

  async create(conn, data) {
    const [result] = await conn.execute(
      `INSERT INTO purchases (purchase_number, supplier_id, user_id, supplier_invoice_number, subtotal, discount, total, status, purchased_at, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', NOW(), ?)`,
      [data.purchase_number, data.supplier_id, data.user_id, data.supplier_invoice_number || null,
       data.subtotal, data.discount || 0, data.total, data.notes || null]
    );
    return result.insertId;
  }

  async createItems(conn, purchaseId, items) {
    for (const item of items) {
      await conn.execute(
        `INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_cost, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [purchaseId, item.product_id, item.quantity, item.unit_cost, item.quantity * item.unit_cost]
      );
    }
  }

  async findByIdForUpdate(conn, id) {
    const [rows] = await conn.execute(
      'SELECT * FROM purchases WHERE id = ? FOR UPDATE', [id]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  async getItemsByPurchaseId(conn, purchaseId) {
    const [items] = await conn.execute(
      'SELECT * FROM purchase_items WHERE purchase_id = ?', [purchaseId]
    );
    return items;
  }

  async updateStatus(conn, id, status, extraFields = {}) {
    let sql = 'UPDATE purchases SET status = ?';
    const params = [status];
    if (extraFields.received_at) { sql += ', received_at = ?'; params.push(extraFields.received_at); }
    sql += ' WHERE id = ?';
    params.push(id);
    await conn.execute(sql, params);
  }
}

module.exports = new PurchaseRepository();
