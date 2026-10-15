const reportRepository = require('./report.repository');

class ReportService {
  getDateRangeDefaults(startDate, endDate) {
    const today = new Date();
    const end = endDate || today.toISOString().split('T')[0];

    // Default start date: 30 days ago
    let start = startDate;
    if (!start) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 29);
      start = thirtyDaysAgo.toISOString().split('T')[0];
    }

    return { startDate: start, endDate: end };
  }

  async getReportData({ startDate, endDate }) {
    const dates = this.getDateRangeDefaults(startDate, endDate);

    const [summary, cashiers, products, purchases, returns, expensesByCategory, recentExpenses] = await Promise.all([
      reportRepository.getPeriodSummary(dates.startDate, dates.endDate),
      reportRepository.getSalesByCashier(dates.startDate, dates.endDate),
      reportRepository.getProductPerformance(dates.startDate, dates.endDate, 20),
      reportRepository.getPurchasesSummary(dates.startDate, dates.endDate, 20),
      reportRepository.getReturnsSummary(dates.startDate, dates.endDate, 20),
      reportRepository.getExpensesByCategory(dates.startDate, dates.endDate),
      reportRepository.getRecentExpenses(dates.startDate, dates.endDate, 20),
    ]);

    return {
      dates,
      summary,
      cashiers,
      products,
      purchases,
      returns,
      expensesByCategory,
      recentExpenses,
    };
  }

  escapeCsvField(field) {
    if (field === null || field === undefined) return '""';
    const str = String(field).replace(/"/g, '""');
    return `"${str}"`;
  }

  async exportSalesCsv({ startDate, endDate }) {
    const dates = this.getDateRangeDefaults(startDate, endDate);
    const rows = await reportRepository.getAllSalesForExport(dates.startDate, dates.endDate);

    const headers = ['No. Invoice', 'Tanggal', 'Kasir', 'Metode Pembayaran', 'Subtotal', 'Diskon', 'Total', 'Status'];
    const lines = [headers.join(',')];

    rows.forEach(r => {
      const line = [
        this.escapeCsvField(r.invoice_number),
        this.escapeCsvField(new Date(r.created_at).toLocaleString('id-ID')),
        this.escapeCsvField(r.cashier_name || '-'),
        this.escapeCsvField(r.payment_method),
        this.escapeCsvField(r.subtotal),
        this.escapeCsvField(r.discount),
        this.escapeCsvField(r.total),
        this.escapeCsvField(r.status),
      ];
      lines.push(line.join(','));
    });

    return {
      csv: lines.join('\r\n'),
      filename: `laporan-penjualan-${dates.startDate}-sd-${dates.endDate}.csv`,
    };
  }

  async exportProductsCsv() {
    const rows = await reportRepository.getAllProductsForExport();
    const headers = ['SKU', 'Nama Produk', 'Kategori', 'Harga Modal', 'Harga Jual', 'Stok Saat Ini', 'Batas Minimum', 'Satuan', 'Status'];
    const lines = [headers.join(',')];

    rows.forEach(p => {
      const line = [
        this.escapeCsvField(p.sku),
        this.escapeCsvField(p.name),
        this.escapeCsvField(p.category_name || '-'),
        this.escapeCsvField(p.cost_price),
        this.escapeCsvField(p.selling_price),
        this.escapeCsvField(p.stock),
        this.escapeCsvField(p.min_stock),
        this.escapeCsvField(p.unit),
        this.escapeCsvField(p.is_active ? 'Aktif' : 'Nonaktif'),
      ];
      lines.push(line.join(','));
    });

    const todayStr = new Date().toISOString().split('T')[0];
    return {
      csv: lines.join('\r\n'),
      filename: `katalog-produk-stok-${todayStr}.csv`,
    };
  }

  async exportExpensesCsv({ startDate, endDate }) {
    const dates = this.getDateRangeDefaults(startDate, endDate);
    const rows = await reportRepository.getAllExpensesForExport(dates.startDate, dates.endDate);

    const headers = ['Tanggal', 'Kategori', 'Nominal (Rp)', 'Keterangan', 'Pencatat'];
    const lines = [headers.join(',')];

    rows.forEach(r => {
      const line = [
        this.escapeCsvField(new Date(r.expense_date).toLocaleDateString('id-ID')),
        this.escapeCsvField(r.category),
        this.escapeCsvField(r.amount),
        this.escapeCsvField(r.description || '-'),
        this.escapeCsvField(r.recorded_by || '-'),
      ];
      lines.push(line.join(','));
    });

    return {
      csv: lines.join('\r\n'),
      filename: `laporan-pengeluaran-${dates.startDate}-sd-${dates.endDate}.csv`,
    };
  }
}

module.exports = new ReportService();
