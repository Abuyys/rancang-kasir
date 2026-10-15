const { body } = require('express-validator');

const loginValidation = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username wajib diisi.')
    .isLength({ min: 3, max: 60 }).withMessage('Username harus antara 3-60 karakter.'),

  body('password')
    .notEmpty().withMessage('Password wajib diisi.')
    .isLength({ min: 4, max: 128 }).withMessage('Password harus antara 4-128 karakter.'),
];

module.exports = {
  loginValidation,
};
