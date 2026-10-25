const productService = require('./product.service');
const categoryService = require('../categories/category.service');

class ProductController {
  async index(req, res, next) {
    try {
      const { search, category_id, status, barcode_status, page } = req.query;
      const isActive = status === 'active' ? true : status === 'inactive' ? false : null;
      const result = await productService.getAll({
        search,
        categoryId: category_id || null,
        isActive,
        barcodeStatus: barcode_status || null,
        page: parseInt(page) || 1,
        limit: 20,
      });
      const categories = await categoryService.getAllActive();
      res.render('products/index', {
        title: 'Produk',
        products: result.data,
        categories,
        pagination: { page: result.page, totalPages: result.totalPages, total: result.total },
        filters: { search, category_id, status, barcode_status },
      });
    } catch (err) { next(err); }
  }

  async createForm(req, res, next) {
    try {
      const categories = await categoryService.getAllActive();
      res.render('products/form', { title: 'Tambah Produk', product: null, categories });
    } catch (err) { next(err); }
  }

  async create(req, res, next) {
    try {
      await productService.create(req.body, req.session?.user?.id, req.ip);
      req.session.success_msg = 'Produk berhasil ditambahkan.';
      return res.redirect('/products');
    } catch (err) {
      if ([409, 422].includes(err.statusCode)) {
        req.session.error_msg = err.message;
        return res.redirect('/products/create');
      }
      next(err);
    }
  }

  async detail(req, res, next) {
    try {
      const product = await productService.getById(req.params.id);
      res.render('products/detail', { title: product.name, product });
    } catch (err) { next(err); }
  }

  async editForm(req, res, next) {
    try {
      const product = await productService.getById(req.params.id);
      const categories = await categoryService.getAllActive();
      res.render('products/form', { title: 'Edit Produk', product, categories });
    } catch (err) { next(err); }
  }

  async update(req, res, next) {
    try {
      await productService.update(req.params.id, req.body, req.session?.user?.id, req.ip);
      req.session.success_msg = 'Produk berhasil diperbarui.';
      return res.redirect('/products');
    } catch (err) {
      if ([409, 422, 404].includes(err.statusCode)) {
        req.session.error_msg = err.message;
        return res.redirect(`/products/${req.params.id}/edit`);
      }
      next(err);
    }
  }

  async toggleStatus(req, res, next) {
    try {
      await productService.toggleStatus(req.params.id);
      req.session.success_msg = 'Status produk berhasil diubah.';
    } catch (err) {
      req.session.error_msg = err.message;
    }
    return res.redirect('/products');
  }

  // ===== API =====
  async apiIndex(req, res, next) {
    try {
      const { search, category_id, status, page, limit } = req.query;
      const isActive = status === 'active' ? true : status === 'inactive' ? false : null;
      const result = await productService.getAll({
        search, categoryId: category_id || null, isActive,
        page: parseInt(page) || 1, limit: parseInt(limit) || 20,
      });
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  async apiDetail(req, res) {
    try {
      const product = await productService.getById(req.params.id);
      res.json({ success: true, data: product });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  }

  async apiCreate(req, res) {
    try {
      const product = await productService.create(req.body);
      res.status(201).json({ success: true, message: 'Produk berhasil ditambahkan.', data: product });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  }

  async apiUpdate(req, res) {
    try {
      const product = await productService.update(req.params.id, req.body);
      res.json({ success: true, message: 'Produk berhasil diperbarui.', data: product });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  }

  async apiToggleStatus(req, res) {
    try {
      const product = await productService.toggleStatus(req.params.id);
      res.json({ success: true, message: 'Status produk berhasil diubah.', data: product });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  }

  async apiSearchBarcode(req, res) {
    try {
      const product = await productService.getByBarcode(req.params.code);
      res.json({ success: true, data: product });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new ProductController();
