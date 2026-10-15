const reportService = require('./report.service');

class ReportController {
  async index(req, res, next) {
    try {
      const { start_date, end_date } = req.query;
      const data = await reportService.getReportData({
        startDate: start_date,
        endDate: end_date,
      });

      res.render('reports/index', {
        title: 'Laporan Toko',
        ...data,
      });
    } catch (err) {
      next(err);
    }
  }

  async exportSalesCsv(req, res, next) {
    try {
      const { start_date, end_date } = req.query;
      const { csv, filename } = await reportService.exportSalesCsv({
        startDate: start_date,
        endDate: end_date,
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(csv);
    } catch (err) {
      next(err);
    }
  }

  async exportProductsCsv(req, res, next) {
    try {
      const { csv, filename } = await reportService.exportProductsCsv();

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(csv);
    } catch (err) {
      next(err);
    }
  }

  async exportExpensesCsv(req, res, next) {
    try {
      const { start_date, end_date } = req.query;
      const { csv, filename } = await reportService.exportExpensesCsv({
        startDate: start_date,
        endDate: end_date,
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(csv);
    } catch (err) {
      next(err);
    }
  }

  async apiSummary(req, res) {
    try {
      const { start_date, end_date } = req.query;
      const data = await reportService.getReportData({
        startDate: start_date,
        endDate: end_date,
      });
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new ReportController();
