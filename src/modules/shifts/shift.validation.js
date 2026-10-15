const { body } = require('express-validator');

const openShiftValidation = [
  body('opening_cash').notEmpty().withMessage('Uang modal awal wajib diisi.').isFloat({ min: 0 }).withMessage('Nominal tidak valid.'),
];

const closeShiftValidation = [
  body('closing_cash_actual').notEmpty().withMessage('Uang kas aktual wajib diisi.').isFloat({ min: 0 }).withMessage('Nominal tidak valid.'),
  body('notes').optional({ checkFalsy: true }).trim(),
];

module.exports = { openShiftValidation, closeShiftValidation };
