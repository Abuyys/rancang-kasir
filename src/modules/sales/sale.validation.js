const { body } = require('express-validator');

const checkoutValidation = [
  body('payment_method').notEmpty().isIn(['cash', 'debit', 'credit', 'qris', 'transfer', 'other']).withMessage('Metode pembayaran tidak valid.'),
  body('paid_amount').notEmpty().withMessage('Jumlah pembayaran wajib diisi.').isFloat({ min: 0 }),
  body('discount').optional({ checkFalsy: true }).isFloat({ min: 0 }),
  body('reference_number').optional({ checkFalsy: true }).trim(),
];

module.exports = { checkoutValidation };
