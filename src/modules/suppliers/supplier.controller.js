const supplierService = require('./supplier.service');

class SupplierController {
  async index(req, res, next) {
    try {
      const { search, status, page } = req.query;
      const isActive = status === 'active' ? true : status === 'inactive' ? false : null;
      const result = await supplierService.getAll({ search, isActive, page: parseInt(page) || 1, limit: 20 });
      res.render('suppliers/index', {
        title: 'Supplier', suppliers: result.data,
        pagination: { page: result.page, totalPages: result.totalPages, total: result.total },
        filters: { search, status },
      });
    } catch (err) { next(err); }
  }

  async createForm(req, res) {
    res.render('suppliers/form', { title: 'Tambah Supplier', supplier: null });
  }

  async create(req, res, next) {
    try {
      await supplierService.create(req.body);
      req.session.success_msg = 'Supplier berhasil ditambahkan.';
      return res.redirect('/suppliers');
    } catch (err) { next(err); }
  }

  async editForm(req, res, next) {
    try {
      const supplier = await supplierService.getById(req.params.id);
      res.render('suppliers/form', { title: 'Edit Supplier', supplier });
    } catch (err) { next(err); }
  }

  async update(req, res, next) {
    try {
      await supplierService.update(req.params.id, req.body);
      req.session.success_msg = 'Supplier berhasil diperbarui.';
      return res.redirect('/suppliers');
    } catch (err) {
      req.session.error_msg = err.message;
      return res.redirect(`/suppliers/${req.params.id}/edit`);
    }
  }

  async toggleStatus(req, res) {
    try {
      await supplierService.toggleStatus(req.params.id);
      req.session.success_msg = 'Status supplier berhasil diubah.';
    } catch (err) { req.session.error_msg = err.message; }
    return res.redirect('/suppliers');
  }

  // API
  async apiIndex(req, res, next) {
    try {
      const { search, status, page, limit } = req.query;
      const isActive = status === 'active' ? true : status === 'inactive' ? false : null;
      const result = await supplierService.getAll({ search, isActive, page: parseInt(page) || 1, limit: parseInt(limit) || 20 });
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  async apiCreate(req, res) {
    try {
      const supplier = await supplierService.create(req.body);
      res.status(201).json({ success: true, data: supplier });
    } catch (err) { res.status(err.statusCode || 500).json({ success: false, message: err.message }); }
  }

  async apiUpdate(req, res) {
    try {
      const supplier = await supplierService.update(req.params.id, req.body);
      res.json({ success: true, data: supplier });
    } catch (err) { res.status(err.statusCode || 500).json({ success: false, message: err.message }); }
  }
}

module.exports = new SupplierController();
