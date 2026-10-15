const settingService = require('./setting.service');

class SettingController {
  // GET /settings - Web Settings Page
  async index(req, res, next) {
    try {
      const settings = await settingService.getSettings();
      res.render('settings/index', {
        title: 'Pengaturan Sistem & Toko',
        settings,
      });
    } catch (err) { next(err); }
  }

  // POST /settings - Update Settings
  async update(req, res, next) {
    try {
      await settingService.updateSettings(req.body, req.session.user.id, req.ip);
      req.session.success_msg = 'Pengaturan toko berhasil diperbarui!';
      res.redirect('/settings');
    } catch (err) {
      req.session.error_msg = err.message;
      res.redirect('/settings');
    }
  }

  // GET /settings/audit-logs - Web Audit Logs Page
  async auditLogs(req, res, next) {
    try {
      const { action, entity_type, start_date, end_date, page } = req.query;
      const result = await settingService.getAuditLogs({
        action: action || null,
        entityType: entity_type || null,
        startDate: start_date || null,
        endDate: end_date || null,
        page: parseInt(page) || 1,
        limit: 25,
      });

      res.render('settings/audit-logs', {
        title: 'Log Audit Aktivitas Sistem',
        logs: result.data,
        pagination: { page: result.page, totalPages: result.totalPages, total: result.total },
        filters: { action, entity_type, start_date, end_date },
      });
    } catch (err) { next(err); }
  }

  // === API ENDPOINTS ===

  async apiGet(req, res) {
    try {
      const settings = await settingService.getSettings();
      res.json({ success: true, data: settings });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async apiUpdate(req, res) {
    try {
      const settings = await settingService.updateSettings(req.body, req.session.user.id, req.ip);
      res.json({ success: true, message: 'Pengaturan diperbarui.', data: settings });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  }

  async apiAuditLogs(req, res) {
    try {
      const { action, entity_type, start_date, end_date, page, limit } = req.query;
      const result = await settingService.getAuditLogs({
        action: action || null,
        entityType: entity_type || null,
        startDate: start_date || null,
        endDate: end_date || null,
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 25,
      });
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new SettingController();
