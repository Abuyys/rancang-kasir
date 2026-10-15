const { body } = require('express-validator');

const expenseValidation = [
  body('category').notEmpty().withMessage('Kategori pengeluaran wajib diisi.').trim(),
  body('amount').notEmpty().withMessage('Nominal pengeluaran wajib diisi.').isFloat({ min: 0.01 }).withMessage('Nominal harus lebih dari 0.'),
  body('expense_date').notEmpty().withMessage('Tanggal pengeluaran wajib diisi.'),
  body('description').optional({ checkFalsy: true }).trim(),
];

module.exports = { expenseValidation };
