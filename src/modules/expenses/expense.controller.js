const expenseService = require('./expense.service');

class ExpenseController {
  // GET /expenses - Web List
  async index(req, res, next) {
    try {
      const { category, start_date, end_date, page } = req.query;
      const [result, categories, summary] = await Promise.all([
        expenseService.getAll({
          category: category || null,
          startDate: start_date || null,
          endDate: end_date || null,
          page: parseInt(page) || 1,
          limit: 20,
        }),
        expenseService.getCategories(),
        expenseService.getSummary({
          startDate: start_date || null,
          endDate: end_date || null,
        }),
      ]);

      res.render('expenses/index', {
        title: 'Pengeluaran Operasional',
        expenses: result.data,
        totalAmount: result.totalAmount,
        pagination: { page: result.page, totalPages: result.totalPages, total: result.total },
        filters: { category, start_date, end_date },
        categories,
        summary,
      });
    } catch (err) { next(err); }
  }

  // GET /expenses/new - Web Create Form
  async createForm(req, res, next) {
    try {
      const categories = await expenseService.getCategories();
      res.render('expenses/form', {
        title: 'Tambah Pengeluaran',
        expense: null,
        categories,
      });
    } catch (err) { next(err); }
  }

  // POST /expenses - Web Create Action
  async create(req, res, next) {
    try {
      await expenseService.create({
        user_id: req.session.user.id,
        category: req.body.category,
        amount: req.body.amount,
        description: req.body.description,
        expense_date: req.body.expense_date,
      }, req.ip);

      req.session.success_msg = 'Pengeluaran berhasil dicatat!';
      res.redirect('/expenses');
    } catch (err) {
      req.session.error_msg = err.message;
      res.redirect('/expenses/new');
    }
  }

  // GET /expenses/:id/edit - Web Edit Form
  async editForm(req, res, next) {
    try {
      const expense = await expenseService.getById(req.params.id);
      const categories = await expenseService.getCategories();
      res.render('expenses/form', {
        title: 'Ubah Pengeluaran',
        expense,
        categories,
      });
    } catch (err) { next(err); }
  }

  // POST /expenses/:id - Web Update Action
  async update(req, res, next) {
    try {
      await expenseService.update(req.params.id, {
        category: req.body.category,
        amount: req.body.amount,
        description: req.body.description,
        expense_date: req.body.expense_date,
      }, req.session.user.id, req.ip);

      req.session.success_msg = 'Pengeluaran berhasil diperbarui!';
      res.redirect('/expenses');
    } catch (err) {
      req.session.error_msg = err.message;
      res.redirect(`/expenses/${req.params.id}/edit`);
    }
  }

  // POST /expenses/:id/delete - Web Delete Action
  async delete(req, res, next) {
    try {
      await expenseService.delete(req.params.id, req.session.user.id, req.ip);
      req.session.success_msg = 'Pengeluaran berhasil dihapus.';
      res.redirect('/expenses');
    } catch (err) {
      req.session.error_msg = err.message;
      res.redirect('/expenses');
    }
  }

  // === API ENDPOINTS ===

  async apiList(req, res) {
    try {
      const { category, start_date, end_date, page, limit } = req.query;
      const result = await expenseService.getAll({
        category: category || null,
        startDate: start_date || null,
        endDate: end_date || null,
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
      });
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async apiCreate(req, res) {
    try {
      const expense = await expenseService.create({
        user_id: req.session.user.id,
        category: req.body.category,
        amount: req.body.amount,
        description: req.body.description,
        expense_date: req.body.expense_date,
      }, req.ip);
      res.status(201).json({ success: true, message: 'Pengeluaran dicatat.', data: expense });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  }

  async apiDetail(req, res) {
    try {
      const expense = await expenseService.getById(req.params.id);
      res.json({ success: true, data: expense });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  }

  async apiUpdate(req, res) {
    try {
      const expense = await expenseService.update(req.params.id, {
        category: req.body.category,
        amount: req.body.amount,
        description: req.body.description,
        expense_date: req.body.expense_date,
      }, req.session.user.id, req.ip);
      res.json({ success: true, message: 'Pengeluaran diperbarui.', data: expense });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  }

  async apiDelete(req, res) {
    try {
      await expenseService.delete(req.params.id, req.session.user.id, req.ip);
      res.json({ success: true, message: 'Pengeluaran dihapus.' });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new ExpenseController();
