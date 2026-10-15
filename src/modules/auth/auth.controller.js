const authService = require('./auth.service');

class AuthController {
  /**
   * GET /auth/login - Render login page
   */
  loginPage(req, res) {
    res.render('auth/login', {
      title: 'Login',
      layout: 'layouts/auth',
    });
  }

  /**
   * POST /auth/login - Process login
   */
  async login(req, res) {
    try {
      const { username, password } = req.body;

      // Authenticate
      const user = await authService.login(username, password);

      // Save to session
      req.session.user = {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
      };

      // Regenerate session ID for security (prevent session fixation)
      req.session.regenerate(function(err) {
        if (err) {
          console.error('Session regenerate error:', err);
        }

        // Re-save user to new session after regeneration
        req.session.user = {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role,
        };

        req.session.save(function(err) {
          if (err) {
            console.error('Session save error:', err);
          }

          // Check if there's a returnTo URL
          const returnTo = req.session.returnTo || '/dashboard';
          delete req.session.returnTo;

          // API request
          if (req.path.startsWith('/api/')) {
            return res.json({
              success: true,
              message: 'Login berhasil.',
              data: { user: req.session.user },
            });
          }

          return res.redirect(returnTo);
        });
      });
    } catch (err) {
      // API request
      if (req.path.startsWith('/api/')) {
        return res.status(err.statusCode || 500).json({
          success: false,
          message: err.message,
        });
      }

      // Web request - show error on login page
      req.session.error_msg = err.message;
      return res.redirect('/auth/login');
    }
  }

  /**
   * POST /auth/logout - Process logout
   */
  logout(req, res) {
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
      }

      res.clearCookie('minimarket_pos_sid');

      // API request
      if (req.path.startsWith('/api/')) {
        return res.json({
          success: true,
          message: 'Logout berhasil.',
        });
      }

      return res.redirect('/auth/login');
    });
  }

  /**
   * GET /api/auth/me - Get current user data
   */
  async me(req, res) {
    try {
      const user = await authService.getProfile(req.session.user.id);
      return res.json({
        success: true,
        data: { user },
      });
    } catch (err) {
      return res.status(err.statusCode || 500).json({
        success: false,
        message: err.message,
      });
    }
  }
}

module.exports = new AuthController();
