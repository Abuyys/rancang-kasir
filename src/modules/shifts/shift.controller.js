const shiftService = require('./shift.service');

class ShiftController {
  async index(req, res, next) {
    try {
      const { status, page } = req.query;
      const userId = req.session.user.role === 'admin' ? null : req.session.user.id;
      const result = await shiftService.getAll({ userId, status: status || null, page: parseInt(page) || 1, limit: 20 });
      const openShift = await shiftService.getOpenShift(req.session.user.id);
      res.render('shifts/index', {
        title: 'Shift Kasir', shifts: result.data, openShift,
        pagination: { page: result.page, totalPages: result.totalPages, total: result.total },
        filters: { status },
      });
    } catch (err) { next(err); }
  }

  async openForm(req, res, next) {
    try {
      const openShift = await shiftService.getOpenShift(req.session.user.id);
      if (openShift) { req.session.error_msg = 'Anda sudah memiliki shift terbuka.'; return res.redirect('/shifts'); }
      res.render('shifts/open', { title: 'Buka Shift' });
    } catch (err) { next(err); }
  }

  async openShift(req, res, next) {
    try {
      await shiftService.openShift(req.session.user.id, req.body.opening_cash);
      req.session.success_msg = 'Shift berhasil dibuka!';
      return res.redirect('/shifts');
    } catch (err) {
      req.session.error_msg = err.message;
      return res.redirect('/shifts/open');
    }
  }

  async closeForm(req, res, next) {
    try {
      const data = await shiftService.getShiftForClose(req.params.id, req.session.user.id);
      res.render('shifts/close', { title: 'Tutup Shift', ...data });
    } catch (err) {
      req.session.error_msg = err.message;
      return res.redirect('/shifts');
    }
  }

  async closeShift(req, res, next) {
    try {
      await shiftService.closeShift(req.params.id, req.session.user.id, req.body.closing_cash_actual, req.body.notes);
      req.session.success_msg = 'Shift berhasil ditutup.';
      return res.redirect('/shifts');
    } catch (err) {
      req.session.error_msg = err.message;
      return res.redirect(`/shifts/${req.params.id}/close`);
    }
  }

  // API
  async apiOpen(req, res) {
    try {
      const shift = await shiftService.openShift(req.session.user.id, req.body.opening_cash);
      res.status(201).json({ success: true, message: 'Shift dibuka.', data: shift });
    } catch (err) { res.status(err.statusCode || 500).json({ success: false, message: err.message }); }
  }

  async apiClose(req, res) {
    try {
      const shift = await shiftService.closeShift(req.body.shift_id || req.params.id, req.session.user.id, req.body.closing_cash_actual, req.body.notes);
      res.json({ success: true, message: 'Shift ditutup.', data: shift });
    } catch (err) { res.status(err.statusCode || 500).json({ success: false, message: err.message }); }
  }

  async apiGetOpen(req, res) {
    const shift = await shiftService.getOpenShift(req.session.user.id);
    res.json({ success: true, data: shift });
  }
}

module.exports = new ShiftController();
