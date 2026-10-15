const pool = require('../../config/database');

class ExpenseRepository {
  async findAll({ category = null, startDate = null, endDate = null, page = 1, limit = 20 } = {}) {
    let where = 'WHERE 1=1';
    const params = [];

    if (category) {
      where += ' AND e.category = ?';
      params.push(category);
    }
    if (startDate) {
      where += ' AND DATE(e.expense_date) >= ?';
      params.push(startDate);
    }
    if (endDate) {
      where += ' AND DATE(e.expense_date) <= ?';
      params.push(endDate);
    }

    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total, COALESCE(SUM(amount), 0) as total_amount FROM expenses e ${where}`,
      params
    );
    const total = countResult[0].total;
    const totalAmount = parseFloat(countResult[0].total_amount);
    const offset = (page - 1) * limit;

    const [rows] = await pool.query(
      `SELECT e.*, u.name as user_name
       FROM expenses e
       LEFT JOIN users u ON u.id = e.user_id
       ${where}
       ORDER BY e.expense_date DESC, e.id DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    return { data: rows, total, totalAmount, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT e.*, u.name as user_name
       FROM expenses e
       LEFT JOIN users u ON u.id = e.user_id
       WHERE e.id = ?`,
      [id]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  async create(data) {
    const [result] = await pool.execute(
      `INSERT INTO expenses (user_id, category, amount, description, expense_date, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [data.user_id, data.category, data.amount, data.description || null, data.expense_date]
    );
    return result.insertId;
  }

  async update(id, data) {
    await pool.execute(
      `UPDATE expenses
       SET category = ?, amount = ?, description = ?, expense_date = ?
       WHERE id = ?`,
      [data.category, data.amount, data.description || null, data.expense_date, id]
    );
  }

  async delete(id) {
    await pool.execute('DELETE FROM expenses WHERE id = ?', [id]);
  }

  async getCategories() {
    const [rows] = await pool.execute(
      'SELECT DISTINCT category FROM expenses ORDER BY category ASC'
    );
    return rows.map(r => r.category);
  }

  async getSummary({ startDate = null, endDate = null } = {}) {
    let where = 'WHERE 1=1';
    const params = [];
    if (startDate) {
      where += ' AND DATE(expense_date) >= ?';
      params.push(startDate);
    }
    if (endDate) {
      where += ' AND DATE(expense_date) <= ?';
      params.push(endDate);
    }

    const [todayRows] = await pool.execute(
      'SELECT COALESCE(SUM(amount), 0) as today_total, COUNT(*) as today_count FROM expenses WHERE DATE(expense_date) = CURDATE()'
    );

    const [topCategoryRows] = await pool.query(
      `SELECT category, SUM(amount) as total, COUNT(*) as count
       FROM expenses
       ${where}
       GROUP BY category
       ORDER BY total DESC
       LIMIT 3`,
      params
    );

    return {
      todayTotal: parseFloat(todayRows[0].today_total),
      todayCount: parseInt(todayRows[0].today_count),
      topCategories: topCategoryRows.map(r => ({
        category: r.category,
        total: parseFloat(r.total),
        count: parseInt(r.count)
      }))
    };
  }
}

module.exports = new ExpenseRepository();
