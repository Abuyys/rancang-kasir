const pool = require('../../config/database');

class ShiftRepository {
  async findAll({ userId = null, status = null, page = 1, limit = 20 } = {}) {
    let where = 'WHERE 1=1';
    const params = [];
    if (userId) { where += ' AND cs.user_id = ?'; params.push(userId); }
    if (status) { where += ' AND cs.status = ?'; params.push(status); }

    const [countResult] = await pool.execute(`SELECT COUNT(*) as total FROM cashier_shifts cs ${where}`, params);
    const total = countResult[0].total;
    const offset = (page - 1) * limit;

    const [rows] = await pool.query(
      `SELECT cs.*, u.name as user_name FROM cashier_shifts cs LEFT JOIN users u ON u.id = cs.user_id ${where} ORDER BY cs.opened_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );
    return { data: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id) {
    const [rows] = await pool.execute(
      'SELECT cs.*, u.name as user_name FROM cashier_shifts cs LEFT JOIN users u ON u.id = cs.user_id WHERE cs.id = ?', [id]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  async findOpenShift(userId) {
    const [rows] = await pool.execute(
      'SELECT * FROM cashier_shifts WHERE user_id = ? AND status = "open"', [userId]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  async create(data) {
    const [result] = await pool.execute(
      'INSERT INTO cashier_shifts (user_id, opening_cash, opened_at, status) VALUES (?, ?, NOW(), "open")',
      [data.user_id, data.opening_cash]
    );
    return result.insertId;
  }

  async getShiftSummary(conn, shiftId) {
    // Total cash sales during this shift
    const [cashSales] = await conn.execute(
      `SELECT COALESCE(SUM(p.amount), 0) as total_cash
       FROM payments p
       JOIN sales s ON s.id = p.sale_id
       WHERE s.shift_id = ? AND s.status = 'completed' AND p.method = 'cash'`, [shiftId]
    );
    // Total all sales
    const [allSales] = await conn.execute(
      `SELECT COALESCE(SUM(total), 0) as total_sales, COUNT(*) as transaction_count
       FROM sales WHERE shift_id = ? AND status = 'completed'`, [shiftId]
    );
    return {
      totalCash: parseFloat(cashSales[0].total_cash),
      totalSales: parseFloat(allSales[0].total_sales),
      transactionCount: parseInt(allSales[0].transaction_count),
    };
  }

  async closeShift(conn, id, data) {
    await conn.execute(
      `UPDATE cashier_shifts SET closing_cash_expected = ?, closing_cash_actual = ?, cash_difference = ?, closed_at = NOW(), status = 'closed', notes = ? WHERE id = ?`,
      [data.closing_cash_expected, data.closing_cash_actual, data.cash_difference, data.notes || null, id]
    );
  }
}

module.exports = new ShiftRepository();
