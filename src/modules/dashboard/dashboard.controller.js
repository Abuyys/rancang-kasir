const dashboardService = require('./dashboard.service');

class DashboardController {
  async index(req, res, next) {
    try {
      const summary = await dashboardService.getDashboardSummary();
      res.render('dashboard/index', {
        title: 'Dashboard',
        ...summary,
      });
    } catch (err) {
      next(err);
    }
  }

  async apiSummary(req, res) {
    try {
      const summary = await dashboardService.getDashboardSummary();
      res.json({ success: true, data: summary });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new DashboardController();
