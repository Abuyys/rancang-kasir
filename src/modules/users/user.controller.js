const userService = require('./user.service');

class UserController {
  // GET /users - List
  async index(req, res, next) {
    try {
      const { search, role, status, page } = req.query;
      const result = await userService.getAll({
        search: search || '',
        role: role || null,
        status: status !== undefined ? status : null,
        page: parseInt(page) || 1,
        limit: 20,
      });

      res.render('users/index', {
        title: 'Manajemen Pengguna',
        users: result.data,
        pagination: { page: result.page, totalPages: result.totalPages, total: result.total },
        filters: { search, role, status },
      });
    } catch (err) { next(err); }
  }

  // GET /users/new - Form Create
  async createForm(req, res) {
    res.render('users/form', {
      title: 'Tambah Pengguna Baru',
      user: null,
    });
  }

  // POST /users - Create Action
  async create(req, res, next) {
    try {
      await userService.create({
        name: req.body.name,
        username: req.body.username,
        password: req.body.password,
        role: req.body.role,
        is_active: req.body.is_active !== undefined ? req.body.is_active : 1,
      }, req.session.user.id, req.ip);

      req.session.success_msg = 'Pengguna baru berhasil ditambahkan!';
      res.redirect('/users');
    } catch (err) {
      req.session.error_msg = err.message;
      res.redirect('/users/new');
    }
  }

  // GET /users/:id/edit - Form Edit
  async editForm(req, res, next) {
    try {
      const user = await userService.getById(req.params.id);
      res.render('users/form', {
        title: `Ubah Pengguna - ${user.name}`,
        user,
      });
    } catch (err) { next(err); }
  }

  // POST /users/:id - Update Action
  async update(req, res, next) {
    try {
      await userService.update(req.params.id, {
        name: req.body.name,
        role: req.body.role,
        is_active: req.body.is_active,
      }, req.session.user.id, req.ip);

      req.session.success_msg = 'Data pengguna berhasil diperbarui!';
      res.redirect('/users');
    } catch (err) {
      req.session.error_msg = err.message;
      res.redirect(`/users/${req.params.id}/edit`);
    }
  }

  // GET /users/:id/reset-password - Form Reset
  async resetPasswordForm(req, res, next) {
    try {
      const user = await userService.getById(req.params.id);
      res.render('users/reset-password', {
        title: `Reset Password - ${user.name}`,
        user,
      });
    } catch (err) { next(err); }
  }

  // POST /users/:id/reset-password - Reset Action
  async resetPassword(req, res, next) {
    try {
      await userService.resetPassword(req.params.id, req.body.new_password, req.session.user.id, req.ip);
      req.session.success_msg = 'Password pengguna berhasil direset!';
      res.redirect('/users');
    } catch (err) {
      req.session.error_msg = err.message;
      res.redirect(`/users/${req.params.id}/reset-password`);
    }
  }

  // POST /users/:id/toggle-status - Toggle Active Status
  async toggleStatus(req, res, next) {
    try {
      const user = await userService.toggleStatus(req.params.id, req.session.user.id, req.ip);
      req.session.success_msg = `Status akun ${user.username} diubah menjadi ${user.is_active ? 'Aktif' : 'Nonaktif'}.`;
      res.redirect('/users');
    } catch (err) {
      req.session.error_msg = err.message;
      res.redirect('/users');
    }
  }

  // === API ENDPOINTS ===

  async apiList(req, res) {
    try {
      const { search, role, status, page, limit } = req.query;
      const result = await userService.getAll({
        search: search || '', role: role || null, status: status !== undefined ? status : null,
        page: parseInt(page) || 1, limit: parseInt(limit) || 20,
      });
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async apiDetail(req, res) {
    try {
      const user = await userService.getById(req.params.id);
      res.json({ success: true, data: user });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  }

  async apiCreate(req, res) {
    try {
      const user = await userService.create(req.body, req.session.user.id, req.ip);
      res.status(201).json({ success: true, message: 'Pengguna dibuat.', data: user });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  }

  async apiUpdate(req, res) {
    try {
      const user = await userService.update(req.params.id, req.body, req.session.user.id, req.ip);
      res.json({ success: true, message: 'Pengguna diperbarui.', data: user });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  }

  async apiResetPassword(req, res) {
    try {
      const result = await userService.resetPassword(req.params.id, req.body.new_password, req.session.user.id, req.ip);
      res.json(result);
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  }

  async apiToggleStatus(req, res) {
    try {
      const user = await userService.toggleStatus(req.params.id, req.session.user.id, req.ip);
      res.json({ success: true, message: 'Status diperbarui.', data: user });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new UserController();
