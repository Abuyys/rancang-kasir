const { body } = require('express-validator');

const createPurchaseValidation = [
  body('supplier_id').notEmpty().withMessage('Supplier wajib dipilih.').isInt({ min: 1 }),
  body('supplier_invoice_number').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  body('discount').optional({ checkFalsy: true }).isFloat({ min: 0 }).withMessage('Diskon tidak boleh negatif.'),
  body('notes').optional({ checkFalsy: true }).trim(),
];

module.exports = { createPurchaseValidation };
