const { body } = require('express-validator');

const adjustmentValidation = [
  body('product_id').notEmpty().withMessage('Produk wajib dipilih.').isInt({ min: 1 }),
  body('type').notEmpty().isIn(['in', 'out']).withMessage('Tipe harus "in" atau "out".'),
  body('quantity').notEmpty().withMessage('Jumlah wajib diisi.').isFloat({ min: 0.001 }).withMessage('Jumlah harus lebih dari 0.'),
  body('reason').trim().notEmpty().withMessage('Alasan penyesuaian wajib diisi.').isLength({ max: 255 }),
];

module.exports = { adjustmentValidation };
