const pool = require('../../config/database');

class ReturnRepository {
  async findAll({ userId = null, status = null, search = '', page = 1, limit = 20 } = {}) {
    let where = 'WHERE 1=1';
    const params = [];

    if (userId) {
      where += ' AND r.user_id = ?';
      params.push(userId);
    }
    if (status) {
      where += ' AND r.status = ?';
      params.push(status);
    }
    if (search) {
      where += ' AND (r.return_number LIKE ? OR s.invoice_number LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total
       FROM returns r
       LEFT JOIN sales s ON s.id = r.sale_id
       ${where}`,
      params
    );
    const total = countResult[0].total;
    const offset = (page - 1) * limit;

    const [rows] = await pool.query(
      `SELECT r.*, s.invoice_number, u.name as requester_name, ab.name as approver_name
       FROM returns r
       LEFT JOIN sales s ON s.id = r.sale_id
       LEFT JOIN users u ON u.id = r.user_id
       LEFT JOIN users ab ON ab.id = r.approved_by
       ${where}
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    return { data: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT r.*, s.invoice_number, s.total as sale_total, s.created_at as sale_date,
              u.name as requester_name, ab.name as approver_name
       FROM returns r
       LEFT JOIN sales s ON s.id = r.sale_id
       LEFT JOIN users u ON u.id = r.user_id
       LEFT JOIN users ab ON ab.id = r.approved_by
       WHERE r.id = ?`,
      [id]
    );

    if (rows.length === 0) return null;
    const ret = rows[0];

    const [items] = await pool.execute(
      `SELECT ri.*, si.product_id, si.product_name_snapshot, si.sku_snapshot,
              si.unit_price, si.quantity as original_quantity
       FROM return_items ri
       LEFT JOIN sale_items si ON si.id = ri.sale_item_id
       WHERE ri.return_id = ?`,
      [id]
    );

    ret.items = items;
    return ret;
  }

  async getAlreadyReturnedQuantities(saleId) {
    const [rows] = await pool.execute(
      `SELECT ri.sale_item_id, SUM(ri.quantity) as returned_qty
       FROM return_items ri
       JOIN returns r ON r.id = ri.return_id
       WHERE r.sale_id = ? AND r.status IN ('requested', 'approved', 'completed')
       GROUP BY ri.sale_item_id`,
      [saleId]
    );

    const map = {};
    rows.forEach(r => {
      map[r.sale_item_id] = parseFloat(r.returned_qty);
    });
    return map;
  }

  async createReturn(conn, data) {
    const [result] = await conn.execute(
      `INSERT INTO returns (return_number, sale_id, user_id, approved_by, total_refund, reason, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        data.return_number,
        data.sale_id,
        data.user_id,
        data.approved_by || null,
        data.total_refund,
        data.reason,
        data.status || 'requested',
      ]
    );
    return result.insertId;
  }

  async createReturnItem(conn, returnId, item) {
    await conn.execute(
      `INSERT INTO return_items (return_id, sale_item_id, quantity, refund_amount, restock)
       VALUES (?, ?, ?, ?, ?)`,
      [returnId, item.sale_item_id, item.quantity, item.refund_amount, item.restock ? 1 : 0]
    );
  }

  async updateStatus(conn, returnId, status, approvedBy) {
    await conn.execute(
      `UPDATE returns
       SET status = ?, approved_by = ?, updated_at = NOW()
       WHERE id = ?`,
      [status, approvedBy, returnId]
    );
  }
}

module.exports = new ReturnRepository();
