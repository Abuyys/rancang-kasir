const categoryService = require('./category.service');

class CategoryController {
  async index(req, res, next) {
    try {
      const { search, status, page } = req.query;
      const isActive = status === 'active' ? true : status === 'inactive' ? false : null;
      const result = await categoryService.getAll({
        search, isActive, page: parseInt(page) || 1, limit: 20,
      });
      res.render('categories/index', {
        title: 'Kategori', categories: result.data,
        pagination: { page: result.page, totalPages: result.totalPages, total: result.total },
        filters: { search, status },
      });
    } catch (err) { next(err); }
  }

  async createForm(req, res) {
    res.render('categories/form', { title: 'Tambah Kategori', category: null });
  }

  async create(req, res, next) {
    try {
      const { name, description } = req.body;
      await categoryService.create({ name, description });
      req.session.success_msg = 'Kategori berhasil ditambahkan.';
      return res.redirect('/categories');
    } catch (err) {
      if (err.statusCode === 409) {
        req.session.error_msg = err.message;
        return res.redirect('/categories/create');
      }
      next(err);
    }
  }

  async editForm(req, res, next) {
    try {
      const category = await categoryService.getById(req.params.id);
      res.render('categories/form', { title: 'Edit Kategori', category });
    } catch (err) { next(err); }
  }

  async update(req, res, next) {
    try {
      const { name, description } = req.body;
      await categoryService.update(req.params.id, { name, description });
      req.session.success_msg = 'Kategori berhasil diperbarui.';
      return res.redirect('/categories');
    } catch (err) {
      if ([409, 404].includes(err.statusCode)) {
        req.session.error_msg = err.message;
        return res.redirect(`/categories/${req.params.id}/edit`);
      }
      next(err);
    }
  }

  async toggleStatus(req, res, next) {
    try {
      await categoryService.toggleStatus(req.params.id);
      req.session.success_msg = 'Status kategori berhasil diubah.';
    } catch (err) {
      req.session.error_msg = err.message;
    }
    return res.redirect('/categories');
  }

  // ===== API =====
  async apiIndex(req, res, next) {
    try {
      const { search, status, page, limit } = req.query;
      const isActive = status === 'active' ? true : status === 'inactive' ? false : null;
      const result = await categoryService.getAll({
        search, isActive, page: parseInt(page) || 1, limit: parseInt(limit) || 20,
      });
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  async apiCreate(req, res) {
    try {
      const category = await categoryService.create(req.body);
      res.status(201).json({ success: true, message: 'Kategori berhasil ditambahkan.', data: category });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  }

  async apiUpdate(req, res) {
    try {
      const category = await categoryService.update(req.params.id, req.body);
      res.json({ success: true, message: 'Kategori berhasil diperbarui.', data: category });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  }

  async apiToggleStatus(req, res) {
    try {
      const category = await categoryService.toggleStatus(req.params.id);
      res.json({ success: true, message: 'Status kategori berhasil diubah.', data: category });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new CategoryController();
