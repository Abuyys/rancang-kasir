const pool = require('../../config/database');

class ReportRepository {
  async getPeriodSummary(startDate, endDate) {
    // 1. Sales & Transactions
    const [salesRows] = await pool.execute(
      `SELECT COALESCE(SUM(subtotal), 0) as gross_sales,
              COALESCE(SUM(discount), 0) as total_discount,
              COALESCE(SUM(total), 0) as net_sales,
              COUNT(*) as transaction_count
       FROM sales
       WHERE status != 'cancelled'
         AND DATE(created_at) >= ?
         AND DATE(created_at) <= ?`,
      [startDate, endDate]
    );

    // 2. Returns (Refunds)
    const [returnRows] = await pool.execute(
      `SELECT COALESCE(SUM(total_refund), 0) as total_refund,
              COUNT(*) as return_count
       FROM returns
       WHERE status = 'completed'
         AND DATE(created_at) >= ?
         AND DATE(created_at) <= ?`,
      [startDate, endDate]
    );

    // 3. Gross Profit from sales items
    const [profitRows] = await pool.execute(
      `SELECT COALESCE(SUM((si.unit_price - si.unit_cost) * si.quantity - si.discount), 0) as gross_profit
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       WHERE s.status != 'cancelled'
         AND DATE(s.created_at) >= ?
         AND DATE(s.created_at) <= ?`,
      [startDate, endDate]
    );

    // 4. Purchases (Received) - Correct column is `total`, not `total_cost`
    const [purchaseRows] = await pool.execute(
      `SELECT COALESCE(SUM(total), 0) as total_purchases,
              COUNT(*) as purchase_count
       FROM purchases
       WHERE status = 'received'
         AND DATE(received_at) >= ?
         AND DATE(received_at) <= ?`,
      [startDate, endDate]
    );

    // 5. Operating Expenses
    const [expenseRows] = await pool.execute(
      `SELECT COALESCE(SUM(amount), 0) as total_expenses,
              COUNT(*) as expense_count
       FROM expenses
       WHERE DATE(expense_date) >= ?
         AND DATE(expense_date) <= ?`,
      [startDate, endDate]
    );

    const grossSales = parseFloat(salesRows[0].gross_sales);
    const totalDiscount = parseFloat(salesRows[0].total_discount);
    const netSales = parseFloat(salesRows[0].net_sales);
    const transactionCount = parseInt(salesRows[0].transaction_count);
    const totalRefund = parseFloat(returnRows[0].total_refund);
    const returnCount = parseInt(returnRows[0].return_count);
    const grossProfit = parseFloat(profitRows[0].gross_profit) - totalRefund;
    const totalPurchases = parseFloat(purchaseRows[0].total_purchases);
    const purchaseCount = parseInt(purchaseRows[0].purchase_count);
    const totalExpenses = parseFloat(expenseRows[0].total_expenses);
    const expenseCount = parseInt(expenseRows[0].expense_count);
    const netProfit = grossProfit - totalExpenses; // Laba Bersih = Laba Kotor - Beban Operasional

    return {
      grossSales,
      totalDiscount,
      netSales,
      transactionCount,
      totalRefund,
      returnCount,
      adjustedNetSales: Math.max(0, netSales - totalRefund),
      grossProfit: Math.max(0, grossProfit),
      totalPurchases,
      purchaseCount,
      totalExpenses,
      expenseCount,
      netProfit,
      avgTransactionValue: transactionCount > 0 ? netSales / transactionCount : 0,
    };
  }

  async getSalesByCashier(startDate, endDate) {
    const [rows] = await pool.execute(
      `SELECT u.id as user_id, u.name as cashier_name,
              COUNT(s.id) as transaction_count,
              COALESCE(SUM(s.total), 0) as total_sales
       FROM sales s
       JOIN users u ON u.id = s.user_id
       WHERE s.status != 'cancelled'
         AND DATE(s.created_at) >= ?
         AND DATE(s.created_at) <= ?
       GROUP BY u.id, u.name
       ORDER BY total_sales DESC`,
      [startDate, endDate]
    );
    return rows;
  }

  async getProductPerformance(startDate, endDate, limit = 20) {
    const [rows] = await pool.query(
      `SELECT si.product_id, si.product_name_snapshot as name, si.sku_snapshot as sku,
              SUM(si.quantity) as total_quantity_sold,
              SUM(si.subtotal) as total_revenue,
              SUM((si.unit_price - si.unit_cost) * si.quantity - si.discount) as total_profit
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       WHERE s.status != 'cancelled'
         AND DATE(s.created_at) >= ?
         AND DATE(s.created_at) <= ?
       GROUP BY si.product_id, si.product_name_snapshot, si.sku_snapshot
       ORDER BY total_quantity_sold DESC
       LIMIT ?`,
      [startDate, endDate, parseInt(limit)]
    );
    return rows;
  }

  async getPurchasesSummary(startDate, endDate, limit = 20) {
    // Correct columns are `p.supplier_invoice_number` and `p.total`
    const [rows] = await pool.query(
      `SELECT p.purchase_number, sup.name as supplier_name,
              p.supplier_invoice_number as invoice_number, p.received_at, p.total
       FROM purchases p
       LEFT JOIN suppliers sup ON sup.id = p.supplier_id
       WHERE p.status = 'received'
         AND DATE(p.received_at) >= ?
         AND DATE(p.received_at) <= ?
       ORDER BY p.received_at DESC
       LIMIT ?`,
      [startDate, endDate, parseInt(limit)]
    );
    return rows;
  }

  async getReturnsSummary(startDate, endDate, limit = 20) {
    const [rows] = await pool.query(
      `SELECT r.return_number, s.invoice_number, u.name as requester_name,
              r.total_refund, r.status, r.created_at, r.reason
       FROM returns r
       JOIN sales s ON s.id = r.sale_id
       LEFT JOIN users u ON u.id = r.user_id
       WHERE DATE(r.created_at) >= ?
         AND DATE(r.created_at) <= ?
       ORDER BY r.created_at DESC
       LIMIT ?`,
      [startDate, endDate, parseInt(limit)]
    );
    return rows;
  }

  async getAllSalesForExport(startDate, endDate) {
    const [rows] = await pool.execute(
      `SELECT s.invoice_number, s.created_at, u.name as cashier_name,
              s.payment_method, s.subtotal, s.discount, s.total, s.status
       FROM sales s
       LEFT JOIN users u ON u.id = s.user_id
       WHERE DATE(s.created_at) >= ? AND DATE(s.created_at) <= ?
       ORDER BY s.created_at DESC`,
      [startDate, endDate]
    );
    return rows;
  }

  async getAllProductsForExport() {
    const [rows] = await pool.execute(
      `SELECT p.sku, p.name, c.name as category_name, p.cost_price, p.selling_price,
              p.stock, p.min_stock, p.unit, p.is_active
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       ORDER BY p.name ASC`
    );
    return rows;
  }

  async getExpensesByCategory(startDate, endDate) {
    const [rows] = await pool.execute(
      `SELECT category,
              COALESCE(SUM(amount), 0) as total_amount,
              COUNT(*) as count
       FROM expenses
       WHERE DATE(expense_date) >= ?
         AND DATE(expense_date) <= ?
       GROUP BY category
       ORDER BY total_amount DESC`,
      [startDate, endDate]
    );
    return rows;
  }

  async getRecentExpenses(startDate, endDate, limit = 20) {
    const [rows] = await pool.query(
      `SELECT e.id, e.category, e.amount, e.description, e.expense_date, u.name as user_name
       FROM expenses e
       LEFT JOIN users u ON u.id = e.user_id
       WHERE DATE(e.expense_date) >= ?
         AND DATE(e.expense_date) <= ?
       ORDER BY e.expense_date DESC, e.id DESC
       LIMIT ?`,
      [startDate, endDate, parseInt(limit)]
    );
    return rows;
  }

  async getAllExpensesForExport(startDate, endDate) {
    const [rows] = await pool.execute(
      `SELECT e.expense_date, e.category, e.amount, e.description, u.name as recorded_by
       FROM expenses e
       LEFT JOIN users u ON u.id = e.user_id
       WHERE DATE(e.expense_date) >= ? AND DATE(e.expense_date) <= ?
       ORDER BY e.expense_date DESC`,
      [startDate, endDate]
    );
    return rows;
  }
}

module.exports = new ReportRepository();
