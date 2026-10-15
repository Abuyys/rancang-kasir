const inventoryService = require('./inventory.service');
const productService = require('../products/product.service');

class InventoryController {
  async index(req, res, next) {
    try {
      const { search, low_stock, page } = req.query;
      const result = await inventoryService.getStockSummary({
        search, lowStock: low_stock === '1', page: parseInt(page) || 1, limit: 30,
      });
      res.render('inventory/index', {
        title: 'Persediaan', stocks: result.data,
        pagination: { page: result.page, totalPages: result.totalPages, total: result.total },
        filters: { search, low_stock },
      });
    } catch (err) { next(err); }
  }

  async movements(req, res, next) {
    try {
      const { product_id, type, page } = req.query;
      const result = await inventoryService.getMovements({
        productId: product_id || null, movementType: type || null,
        page: parseInt(page) || 1, limit: 30,
      });
      res.render('inventory/movements', {
        title: 'Riwayat Pergerakan Stok', movements: result.data,
        pagination: { page: result.page, totalPages: result.totalPages, total: result.total },
        filters: { product_id, type },
      });
    } catch (err) { next(err); }
  }

  async adjustmentForm(req, res, next) {
    try {
      const productsResult = await productService.getAll({ isActive: true, limit: 1000 });
      res.render('inventory/adjustment', {
        title: 'Penyesuaian Stok', products: productsResult.data,
      });
    } catch (err) { next(err); }
  }

  async createAdjustment(req, res, next) {
    try {
      const result = await inventoryService.createAdjustment({
        product_id: req.body.product_id,
        type: req.body.type,
        quantity: req.body.quantity,
        reason: req.body.reason,
        user_id: req.session.user.id,
      });
      req.session.success_msg = `Stok ${result.product_name} berhasil disesuaikan. ${result.stockBefore} \u2192 ${result.stockAfter}`;
      return res.redirect('/inventory');
    } catch (err) {
      req.session.error_msg = err.message;
      return res.redirect('/inventory/adjustments');
    }
  }

  // API
  async apiIndex(req, res, next) {
    try {
      const { search, low_stock, page, limit } = req.query;
      const result = await inventoryService.getStockSummary({
        search, lowStock: low_stock === '1',
        page: parseInt(page) || 1, limit: parseInt(limit) || 30,
      });
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  async apiMovements(req, res, next) {
    try {
      const { product_id, type, page, limit } = req.query;
      const result = await inventoryService.getMovements({
        productId: product_id || null, movementType: type || null,
        page: parseInt(page) || 1, limit: parseInt(limit) || 30,
      });
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  async apiCreateAdjustment(req, res) {
    try {
      const result = await inventoryService.createAdjustment({
        ...req.body, user_id: req.session.user.id,
      });
      res.json({ success: true, message: 'Stok berhasil disesuaikan.', data: result });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new InventoryController();
