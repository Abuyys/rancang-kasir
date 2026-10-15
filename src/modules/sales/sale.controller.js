const pool = require('../../config/database');
const saleService = require('./sale.service');
const shiftService = require('../shifts/shift.service');

class SaleController {
  // GET /pos - POS Interface
  async posPage(req, res, next) {
    try {
      const openShift = await shiftService.getOpenShift(req.session.user.id);
      if (!openShift) {
        req.session.error_msg = 'Anda harus membuka shift terlebih dahulu.';
        return res.redirect('/shifts/open');
      }
      res.render('cashier/pos', { title: 'Kasir / POS', shift: openShift, layout: 'layouts/main' });
    } catch (err) { next(err); }
  }

  // POST /api/sales/checkout - Checkout
  async checkout(req, res) {
    try {
      const openShift = await shiftService.getOpenShift(req.session.user.id);
      if (!openShift) {
        return res.status(422).json({ success: false, message: 'Tidak ada shift terbuka.' });
      }

      // Parse items
      const items = req.body.items || [];
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(422).json({ success: false, message: 'Keranjang kosong.' });
      }

      const sale = await saleService.checkout({
        items: items.map(i => ({ product_id: parseInt(i.product_id), quantity: parseFloat(i.quantity) })),
        payment_method: req.body.payment_method,
        paid_amount: req.body.paid_amount,
        discount: req.body.discount,
        reference_number: req.body.reference_number,
      }, req.session.user.id, openShift.id);

      res.json({ success: true, message: 'Transaksi berhasil!', data: sale });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  }

  // GET /api/sales/:id - Sale detail
  async apiDetail(req, res) {
    try {
      const sale = await saleService.getById(req.params.id);
      res.json({ success: true, data: sale });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  }

  // GET /transactions - Transaction List
  async transactionsIndex(req, res, next) {
    try {
      const { search, status, start_date, end_date, user_id, page } = req.query;
      const isAdmin = req.session.user.role === 'admin';
      const targetUserId = isAdmin ? (user_id || null) : req.session.user.id;

      const result = await saleService.getAll({
        userId: targetUserId,
        status: status || null,
        search: search || '',
        startDate: start_date || null,
        endDate: end_date || null,
        page: parseInt(page) || 1,
        limit: 20,
      });

      let cashiers = [];
      if (isAdmin) {
        const [userRows] = await pool.execute('SELECT id, name FROM users ORDER BY name ASC');
        cashiers = userRows;
      }

      res.render('transactions/index', {
        title: 'Riwayat Transaksi',
        sales: result.data,
        pagination: { page: result.page, totalPages: result.totalPages, total: result.total },
        filters: { search, status, start_date, end_date, user_id: targetUserId },
        cashiers,
        isAdmin,
      });
    } catch (err) { next(err); }
  }

  // GET /transactions/:id - Transaction Detail
  async transactionDetail(req, res, next) {
    try {
      const sale = await saleService.getById(req.params.id);
      const isOwner = req.session.user.id === sale.user_id;
      const isAdmin = req.session.user.role === 'admin';

      if (!isAdmin && !isOwner) {
        req.session.error_msg = 'Anda tidak memiliki akses ke transaksi ini.';
        return res.redirect('/transactions');
      }

      res.render('transactions/detail', {
        title: `Detail Transaksi - ${sale.invoice_number}`,
        sale,
        isAdmin,
      });
    } catch (err) { next(err); }
  }

  // POST /transactions/:id/cancel - Web form cancellation
  async cancelTransaction(req, res, next) {
    try {
      if (req.session.user.role !== 'admin') {
        req.session.error_msg = 'Hanya admin yang dapat membatalkan transaksi.';
        return res.redirect(`/transactions/${req.params.id}`);
      }

      await saleService.cancel(req.params.id, req.session.user.id, req.body.reason);
      req.session.success_msg = 'Transaksi berhasil dibatalkan dan stok telah dipulihkan.';
      res.redirect(`/transactions/${req.params.id}`);
    } catch (err) {
      req.session.error_msg = err.message;
      res.redirect(`/transactions/${req.params.id}`);
    }
  }

  // POST /api/sales/:id/cancel - API endpoint
  async apiCancel(req, res) {
    try {
      if (req.session.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Hanya admin yang dapat membatalkan transaksi.' });
      }

      const sale = await saleService.cancel(req.params.id, req.session.user.id, req.body.reason);
      res.json({ success: true, message: 'Transaksi dibatalkan.', data: sale });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  }

  // GET /transactions/:id/receipt - Printable thermal receipt
  async receipt(req, res, next) {
    try {
      const sale = await saleService.getById(req.params.id);
      const settingService = require('../settings/setting.service');
      const settings = await settingService.getSettings();
      res.render('cashier/receipt', { title: `Struk ${sale.invoice_number}`, sale, settings, layout: false });
    } catch (err) { next(err); }
  }
}

module.exports = new SaleController();
