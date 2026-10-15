const pool = require('../../config/database');

class SaleRepository {
  async findAll({ userId = null, status = null, search = '', startDate = null, endDate = null, page = 1, limit = 20 } = {}) {
    let where = 'WHERE 1=1';
    const params = [];

    if (userId) {
      where += ' AND s.user_id = ?';
      params.push(userId);
    }
    if (status) {
      where += ' AND s.status = ?';
      params.push(status);
    }
    if (search) {
      where += ' AND s.invoice_number LIKE ?';
      params.push(`%${search}%`);
    }
    if (startDate) {
      where += ' AND DATE(s.created_at) >= ?';
      params.push(startDate);
    }
    if (endDate) {
      where += ' AND DATE(s.created_at) <= ?';
      params.push(endDate);
    }

    const [countResult] = await pool.execute(`SELECT COUNT(*) as total FROM sales s ${where}`, params);
    const total = countResult[0].total;
    const offset = (page - 1) * limit;

    const [rows] = await pool.query(
      `SELECT s.*, u.name as cashier_name, cb.name as cancelled_by_name
       FROM sales s
       LEFT JOIN users u ON u.id = s.user_id
       LEFT JOIN users cb ON cb.id = s.cancelled_by
       ${where}
       ORDER BY s.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    return { data: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id) {
    const isNumeric = !isNaN(id) && !isNaN(parseFloat(id));
    let query = `
      SELECT s.*, u.name as cashier_name, cb.name as cancelled_by_name
      FROM sales s
      LEFT JOIN users u ON u.id = s.user_id
      LEFT JOIN users cb ON cb.id = s.cancelled_by
      WHERE ${isNumeric ? 's.id = ? OR s.invoice_number = ?' : 's.invoice_number = ?'}
    `;
    const params = isNumeric ? [id, id] : [id];

    const [rows] = await pool.execute(query, params);
    if (rows.length === 0) return null;

    const sale = rows[0];
    const [items] = await pool.execute(
      'SELECT si.*, p.stock as current_stock FROM sale_items si LEFT JOIN products p ON p.id = si.product_id WHERE si.sale_id = ?',
      [sale.id]
    );
    const [payments] = await pool.execute('SELECT * FROM payments WHERE sale_id = ?', [sale.id]);
    const [returns] = await pool.execute(
      `SELECT r.*, u.name as requester_name, ab.name as approver_name
       FROM returns r
       LEFT JOIN users u ON u.id = r.user_id
       LEFT JOIN users ab ON ab.id = r.approved_by
       WHERE r.sale_id = ? ORDER BY r.created_at DESC`,
      [sale.id]
    );

    sale.items = items;
    sale.payments = payments;
    sale.returns = returns;
    return sale;
  }

  async createSale(conn, data) {
    const [result] = await conn.execute(
      `INSERT INTO sales (invoice_number, user_id, shift_id, subtotal, discount, tax, total, paid_amount, change_amount, payment_method, status, created_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 'completed', NOW())`,
      [data.invoice_number, data.user_id, data.shift_id, data.subtotal, data.discount, data.total, data.paid_amount, data.change_amount, data.payment_method]
    );
    return result.insertId;
  }

  async createSaleItem(conn, saleId, item) {
    await conn.execute(
      `INSERT INTO sale_items (sale_id, product_id, product_name_snapshot, sku_snapshot, quantity, unit_price, unit_cost, discount, subtotal)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [saleId, item.product_id, item.product_name_snapshot, item.sku_snapshot, item.quantity, item.unit_price, item.unit_cost, item.discount || 0, item.subtotal]
    );
  }

  async createPayment(conn, data) {
    await conn.execute(
      'INSERT INTO payments (sale_id, method, amount, reference_number, paid_at) VALUES (?, ?, ?, ?, NOW())',
      [data.sale_id, data.method, data.amount, data.reference_number || null]
    );
  }

  async cancelSale(conn, saleId, userId, reason) {
    await conn.execute(
      `UPDATE sales
       SET status = 'cancelled', cancelled_at = NOW(), cancelled_by = ?, cancel_reason = ?
       WHERE id = ?`,
      [userId, reason, saleId]
    );
  }
}

module.exports = new SaleRepository();
