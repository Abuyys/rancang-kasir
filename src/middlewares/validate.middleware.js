const { validationResult } = require('express-validator');

/**
 * Middleware: Handle express-validator validation results
 * Returns 422 with errors if validation fails
 */
function handleValidation(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => ({
      field: err.path,
      message: err.msg,
    }));

    // API request
    if (req.path.startsWith('/api/') || req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(422).json({
        success: false,
        message: 'Validasi gagal.',
        errors: errorMessages,
      });
    }

    // Web request - flash errors and redirect back
    req.session.error_msg = errorMessages.map(e => e.message).join(', ');
    return res.redirect('back');
  }

  return next();
}

module.exports = {
  handleValidation,
};
