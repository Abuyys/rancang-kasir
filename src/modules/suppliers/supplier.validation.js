const { body } = require('express-validator');

const supplierValidation = [
  body('name').trim().notEmpty().withMessage('Nama supplier wajib diisi.').isLength({ max: 150 }),
  body('phone').optional({ checkFalsy: true }).trim().isLength({ max: 40 }),
  body('email').optional({ checkFalsy: true }).trim().isEmail().withMessage('Format email tidak valid.'),
  body('address').optional({ checkFalsy: true }).trim(),
  body('notes').optional({ checkFalsy: true }).trim(),
];

module.exports = { supplierValidation };
