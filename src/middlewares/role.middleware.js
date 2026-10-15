/**
 * Middleware factory: Require specific role(s)
 * Usage: requireRole('admin') or requireRole('admin', 'cashier')
 * Must be used AFTER requireAuth middleware
 * @param  {...string} roles - Allowed roles
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      if (req.path.startsWith('/api/')) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized.',
        });
      }
      return res.redirect('/auth/login');
    }

    const userRole = req.session.user.role;

    if (!roles.includes(userRole)) {
      if (req.path.startsWith('/api/')) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden. Anda tidak memiliki akses ke resource ini.',
        });
      }
      return res.status(403).render('errors/403', {
        title: 'Akses Ditolak',
        layout: 'layouts/main',
      });
    }

    return next();
  };
}

module.exports = {
  requireRole,
};
