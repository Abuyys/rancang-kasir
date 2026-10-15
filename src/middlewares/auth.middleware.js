/**
 * Middleware: Require authenticated user
 * Redirects to login page if not authenticated
 */
function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }

  // Check if API request
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized. Silakan login terlebih dahulu.',
    });
  }

  // Store intended URL for redirect after login
  req.session.returnTo = req.originalUrl;
  return res.redirect('/auth/login');
}

/**
 * Middleware: Redirect if already authenticated
 * Used for login page - redirect to dashboard if already logged in
 */
function redirectIfAuth(req, res, next) {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }
  return next();
}

module.exports = {
  requireAuth,
  redirectIfAuth,
};
