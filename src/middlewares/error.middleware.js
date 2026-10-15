const env = require('../config/env');

/**
 * 404 Not Found handler
 */
function notFoundHandler(req, res, next) {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      message: 'Endpoint tidak ditemukan.',
    });
  }

  res.locals.currentUser = res.locals.currentUser || null;

  return res.status(404).render('errors/404', {
    title: 'Halaman Tidak Ditemukan',
    layout: 'layouts/main',
  });
}

/**
 * Global error handler
 * Must have 4 parameters for Express to recognize it as error handler
 */
function errorHandler(err, req, res, next) {
  console.error('❌ Error:', err.stack || err.message);

  const statusCode = err.statusCode || 500;
  const message = env.isProduction
    ? 'Terjadi kesalahan internal.'
    : err.message || 'Internal Server Error';

  if (req.path.startsWith('/api/') || req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(statusCode).json({
      success: false,
      message,
      ...(env.isDevelopment && { stack: err.stack }),
    });
  }

  res.locals.currentUser = res.locals.currentUser || null;

  return res.status(statusCode).render('errors/500', {
    title: 'Kesalahan Server',
    message,
    error: env.isDevelopment ? err : {},
    layout: 'layouts/main',
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
