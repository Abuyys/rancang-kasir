const { body } = require('express-validator');

const updateSettingsValidation = [
  body('store_name').notEmpty().withMessage('Nama toko wajib diisi.').trim(),
  body('store_phone').optional({ checkFalsy: true }).trim(),
  body('store_address').optional({ checkFalsy: true }).trim(),
  body('invoice_prefix').notEmpty().withMessage('Prefix faktur wajib diisi.').trim(),
  body('max_cashier_discount').isFloat({ min: 0, max: 100 }).withMessage('Batas diskon kasir harus antara 0% s/d 100%.'),
  body('default_min_stock').isFloat({ min: 0 }).withMessage('Batas stok minimum tidak boleh negatif.'),
  body('timezone').notEmpty().withMessage('Zona waktu wajib dipilih.'),
  body('currency').notEmpty().withMessage('Mata uang wajib dipilih.'),
];

module.exports = { updateSettingsValidation };
