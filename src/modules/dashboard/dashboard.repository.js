const pool = require('../../config/database');

class DashboardRepository {
  async getTodayMetrics() {
    const [salesRows] = await pool.execute(
      `SELECT 
        COALESCE(SUM(total), 0) as revenue, 
        COUNT(*) as transactions,
        COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total ELSE 0 END), 0) as cash_revenue,
        COALESCE(SUM(CASE WHEN payment_method != 'cash' THEN total ELSE 0 END), 0) as non_cash_revenue
       FROM sales
       WHERE status = 'completed' AND DATE(created_at) = CURDATE()`
    );

    const [profitRows] = await pool.execute(
      `SELECT COALESCE(SUM((si.unit_price - si.unit_cost) * si.quantity - si.discount), 0) as profit
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       WHERE s.status = 'completed' AND DATE(s.created_at) = CURDATE()`
    );

    const [productCountRows] = await pool.execute(
      'SELECT COUNT(*) as total FROM products WHERE is_active = TRUE'
    );

    const [lowStockCountRows] = await pool.execute(
      'SELECT COUNT(*) as total FROM products WHERE is_active = TRUE AND stock <= min_stock'
    );

    const revenue = parseFloat(salesRows[0].revenue);
    const transactions = parseInt(salesRows[0].transactions);
    const cashRevenue = parseFloat(salesRows[0].cash_revenue);
    const nonCashRevenue = parseFloat(salesRows[0].non_cash_revenue);
    const profit = parseFloat(profitRows[0].profit);
    const avgOrderValue = transactions > 0 ? revenue / transactions : 0;

    return {
      revenue,
      transactions,
      cashRevenue,
      nonCashRevenue,
      profit,
      avgOrderValue,
      totalProducts: parseInt(productCountRows[0].total),
      lowStockCount: parseInt(lowStockCountRows[0].total),
    };
  }

  async getRecentTransactions(limit = 5) {
    const [rows] = await pool.query(
      `SELECT s.id, s.invoice_number, s.total, s.payment_method, s.status, s.created_at,
              u.name as cashier_name
       FROM sales s
       JOIN users u ON u.id = s.user_id
       ORDER BY s.created_at DESC
       LIMIT ?`,
      [parseInt(limit)]
    );
    return rows;
  }

  async getLowStockProducts(limit = 10) {
    const [rows] = await pool.query(
      `SELECT id, name, sku, stock, min_stock, unit, selling_price
       FROM products
       WHERE is_active = TRUE AND stock <= min_stock
       ORDER BY stock ASC
       LIMIT ?`,
      [parseInt(limit)]
    );
    return rows;
  }

  async getTopSellingProducts(days = 7, limit = 5) {
    const [rows] = await pool.query(
      `SELECT si.product_name_snapshot as name, si.sku_snapshot as sku,
              SUM(si.quantity) as total_qty, SUM(si.subtotal) as total_sales
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       WHERE s.status = 'completed' AND s.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY si.product_id, si.product_name_snapshot, si.sku_snapshot
       ORDER BY total_qty DESC
       LIMIT ?`,
      [parseInt(days), parseInt(limit)]
    );
    return rows;
  }

  async getSalesChartData(days = 7) {
    // Generate dates for the last N days
    const [rows] = await pool.query(
      `SELECT DATE(created_at) as sale_date,
              COALESCE(SUM(total), 0) as daily_revenue,
              COUNT(*) as daily_transactions
       FROM sales
       WHERE status = 'completed' AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY DATE(created_at)
       ORDER BY sale_date ASC`,
      [parseInt(days)]
    );
    return rows;
  }

  async getActiveShifts() {
    const [rows] = await pool.execute(
      `SELECT cs.*, u.name as cashier_name
       FROM cashier_shifts cs
       JOIN users u ON u.id = cs.user_id
       WHERE cs.status = 'open'
       ORDER BY cs.opened_at DESC`
    );
    return rows;
  }
}

module.exports = new DashboardRepository();
