const { body } = require('express-validator');

const createUserValidation = [
  body('name').notEmpty().withMessage('Nama pengguna wajib diisi.').trim(),
  body('username').notEmpty().withMessage('Username wajib diisi.').trim().isLength({ min: 3, max: 60 }).withMessage('Username minimal 3 karakter.'),
  body('password').notEmpty().withMessage('Password wajib diisi.').isLength({ min: 6 }).withMessage('Password minimal 6 karakter.'),
  body('role').isIn(['admin', 'cashier']).withMessage('Role pengguna tidak valid.'),
];

const updateUserValidation = [
  body('name').notEmpty().withMessage('Nama pengguna wajib diisi.').trim(),
  body('role').isIn(['admin', 'cashier']).withMessage('Role pengguna tidak valid.'),
  body('is_active').optional().isIn(['0', '1', true, false]),
];

const resetPasswordValidation = [
  body('new_password').notEmpty().withMessage('Password baru wajib diisi.').isLength({ min: 6 }).withMessage('Password minimal 6 karakter.'),
];

module.exports = { createUserValidation, updateUserValidation, resetPasswordValidation };
