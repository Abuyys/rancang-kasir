const returnService = require('./return.service');

class ReturnController {
  // GET /returns - List of returns
  async index(req, res, next) {
    try {
      const { status, search, page } = req.query;
      const isAdmin = req.session.user.role === 'admin';
      const userId = isAdmin ? null : req.session.user.id;

      const result = await returnService.getAll({
        userId,
        status: status || null,
        search: search || '',
        page: parseInt(page) || 1,
        limit: 20,
      });

      res.render('returns/index', {
        title: 'Retur Penjualan',
        returns: result.data,
        pagination: { page: result.page, totalPages: result.totalPages, total: result.total },
        filters: { status, search },
        isAdmin,
      });
    } catch (err) { next(err); }
  }

  // GET /returns/new - Form create return
  async newForm(req, res, next) {
    try {
      const { sale_id, invoice } = req.query;
      let sale = null;

      if (sale_id || invoice) {
        try {
          sale = await returnService.getSaleForReturn(sale_id || invoice);
        } catch (e) {
          req.session.error_msg = e.message;
        }
      }

      res.render('returns/form', {
        title: 'Ajukan Retur Penjualan',
        sale,
        queryInvoice: invoice || (sale ? sale.invoice_number : ''),
      });
    } catch (err) { next(err); }
  }

  // POST /returns - Handle create return form
  async create(req, res, next) {
    try {
      let items = req.body.items || [];
      if (!Array.isArray(items) && typeof items === 'object') {
        items = Object.values(items);
      }

      const ret = await returnService.createReturn({
        sale_id: req.body.sale_id,
        items,
        reason: req.body.reason,
      }, req.session.user.id);

      req.session.success_msg = `Pengajuan retur ${ret.return_number} berhasil dibuat!`;
      res.redirect(`/returns/${ret.id}`);
    } catch (err) {
      req.session.error_msg = err.message;
      res.redirect(req.body.sale_id ? `/returns/new?sale_id=${req.body.sale_id}` : '/returns/new');
    }
  }

  // GET /returns/:id - Return detail
  async detail(req, res, next) {
    try {
      const ret = await returnService.getById(req.params.id);
      const isAdmin = req.session.user.role === 'admin';
      const isOwner = req.session.user.id === ret.user_id;

      if (!isAdmin && !isOwner) {
        req.session.error_msg = 'Anda tidak memiliki akses ke data retur ini.';
        return res.redirect('/returns');
      }

      res.render('returns/detail', {
        title: `Detail Retur - ${ret.return_number}`,
        ret,
        isAdmin,
      });
    } catch (err) { next(err); }
  }

  // POST /returns/:id/approve - Approve and complete return
  async approve(req, res, next) {
    try {
      if (req.session.user.role !== 'admin') {
        req.session.error_msg = 'Hanya admin yang dapat menyetujui retur.';
        return res.redirect(`/returns/${req.params.id}`);
      }

      await returnService.approveAndComplete(req.params.id, req.session.user.id);
      req.session.success_msg = 'Retur berhasil disetujui, refund dicatat, dan stok telah diperbarui.';
      res.redirect(`/returns/${req.params.id}`);
    } catch (err) {
      req.session.error_msg = err.message;
      res.redirect(`/returns/${req.params.id}`);
    }
  }

  // POST /returns/:id/reject - Reject return
  async reject(req, res, next) {
    try {
      if (req.session.user.role !== 'admin') {
        req.session.error_msg = 'Hanya admin yang dapat menolak retur.';
        return res.redirect(`/returns/${req.params.id}`);
      }

      await returnService.reject(req.params.id, req.session.user.id);
      req.session.success_msg = 'Pengajuan retur telah ditolak.';
      res.redirect(`/returns/${req.params.id}`);
    } catch (err) {
      req.session.error_msg = err.message;
      res.redirect(`/returns/${req.params.id}`);
    }
  }

  // === API ENDPOINTS ===

  async apiList(req, res) {
    try {
      const { status, search, page, limit } = req.query;
      const userId = req.session.user.role === 'admin' ? null : req.session.user.id;
      const result = await returnService.getAll({
        userId, status, search, page: parseInt(page) || 1, limit: parseInt(limit) || 20,
      });
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  }

  async apiDetail(req, res) {
    try {
      const ret = await returnService.getById(req.params.id);
      res.json({ success: true, data: ret });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  }

  async apiCreate(req, res) {
    try {
      let items = req.body.items || [];
      if (!Array.isArray(items) && typeof items === 'object') {
        items = Object.values(items);
      }
      const ret = await returnService.createReturn({
        sale_id: req.body.sale_id,
        items,
        reason: req.body.reason,
      }, req.session.user.id);

      res.status(201).json({ success: true, message: 'Retur berhasil diajukan.', data: ret });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  }

  async apiApprove(req, res) {
    try {
      if (req.session.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Hanya admin yang dapat menyetujui retur.' });
      }
      const ret = await returnService.approveAndComplete(req.params.id, req.session.user.id);
      res.json({ success: true, message: 'Retur disetujui dan diselesaikan.', data: ret });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  }

  async apiReject(req, res) {
    try {
      if (req.session.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Hanya admin yang dapat menolak retur.' });
      }
      const ret = await returnService.reject(req.params.id, req.session.user.id);
      res.json({ success: true, message: 'Retur ditolak.', data: ret });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new ReturnController();
