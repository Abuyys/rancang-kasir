const purchaseService = require('./purchase.service');
const supplierService = require('../suppliers/supplier.service');
const productService = require('../products/product.service');
const categoryService = require('../categories/category.service');

class PurchaseController {
  async index(req, res, next) {
    try {
      const { search, status, supplier_id, page } = req.query;
      const result = await purchaseService.getAll({
        search, status: status || null, supplierId: supplier_id || null,
        page: parseInt(page) || 1, limit: 20,
      });
      const suppliers = await supplierService.getAllActive();
      res.render('purchases/index', {
        title: 'Pembelian', purchases: result.data, suppliers,
        pagination: { page: result.page, totalPages: result.totalPages, total: result.total },
        filters: { search, status, supplier_id },
      });
    } catch (err) { next(err); }
  }

  async createForm(req, res, next) {
    try {
      const suppliers = await supplierService.getAllActive();
      const productsResult = await productService.getAll({ isActive: true, limit: 1000 });
      res.render('purchases/form', {
        title: 'Buat Pembelian', suppliers, products: productsResult.data,
      });
    } catch (err) { next(err); }
  }

  async create(req, res, next) {
    try {
      // Parse items from form arrays
      const productIds = [].concat(req.body.product_id || []);
      const quantities = [].concat(req.body.quantity || []);
      const unitCosts = [].concat(req.body.unit_cost || []);

      const items = productIds.map((pid, i) => ({
        product_id: parseInt(pid),
        quantity: parseFloat(quantities[i]) || 0,
        unit_cost: parseFloat(unitCosts[i]) || 0,
      })).filter(item => item.product_id && item.quantity > 0);

      await purchaseService.create({
        supplier_id: req.body.supplier_id,
        supplier_invoice_number: req.body.supplier_invoice_number,
        discount: req.body.discount,
        notes: req.body.notes,
        items,
      }, req.session.user.id);

      req.session.success_msg = 'Pembelian berhasil dibuat.';
      return res.redirect('/purchases');
    } catch (err) {
      req.session.error_msg = err.message;
      return res.redirect('/purchases/create');
    }
  }

  async detail(req, res, next) {
    try {
      if (req.params.id === 'create' || req.params.id === 'new') {
        return this.createForm(req, res, next);
      }
      const purchase = await purchaseService.getById(req.params.id);
      res.render('purchases/detail', { title: `Pembelian ${purchase.purchase_number}`, purchase });
    } catch (err) {
      if (err.statusCode === 404 || err.message === 'Pembelian tidak ditemukan.') {
        req.session.error_msg = 'Pembelian tidak ditemukan atau data telah dihapus.';
        return res.redirect('/purchases');
      }
      next(err);
    }
  }

  async receive(req, res, next) {
    try {
      await purchaseService.receive(req.params.id, req.session.user.id);
      req.session.success_msg = 'Barang berhasil diterima dan stok telah diperbarui.';
    } catch (err) {
      req.session.error_msg = err.message;
    }
    return res.redirect(`/purchases/${req.params.id}`);
  }

  async cancel(req, res, next) {
    try {
      await purchaseService.cancel(req.params.id);
      req.session.success_msg = 'Pembelian berhasil dibatalkan.';
    } catch (err) {
      req.session.error_msg = err.message;
    }
    return res.redirect(`/purchases/${req.params.id}`);
  }

  // API
  async apiIndex(req, res, next) {
    try {
      const { search, status, supplier_id, page, limit } = req.query;
      const result = await purchaseService.getAll({
        search, status: status || null, supplierId: supplier_id || null,
        page: parseInt(page) || 1, limit: parseInt(limit) || 20,
      });
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  async apiReceive(req, res) {
    try {
      const purchase = await purchaseService.receive(req.params.id, req.session.user.id);
      res.json({ success: true, message: 'Barang diterima.', data: purchase });
    } catch (err) { res.status(err.statusCode || 500).json({ success: false, message: err.message }); }
  }
}

module.exports = new PurchaseController();
