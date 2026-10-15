const { body } = require('express-validator');

const createProductValidation = [
  body('category_id').notEmpty().withMessage('Kategori wajib dipilih.').isInt({ min: 1 }).withMessage('Kategori tidak valid.'),
  body('sku').trim().notEmpty().withMessage('SKU wajib diisi.').isLength({ min: 2, max: 80 }).withMessage('SKU harus antara 2-80 karakter.'),
  body('barcode').optional({ checkFalsy: true }).trim().isLength({ max: 100 }).withMessage('Barcode maksimal 100 karakter.'),
  body('name').trim().notEmpty().withMessage('Nama produk wajib diisi.').isLength({ min: 2, max: 180 }).withMessage('Nama produk harus antara 2-180 karakter.'),
  body('unit').optional({ checkFalsy: true }).trim().isLength({ max: 30 }).withMessage('Satuan maksimal 30 karakter.'),
  body('cost_price').optional({ checkFalsy: true }).isFloat({ min: 0 }).withMessage('Harga modal tidak boleh negatif.'),
  body('selling_price').notEmpty().withMessage('Harga jual wajib diisi.').isFloat({ min: 0.01 }).withMessage('Harga jual harus lebih dari 0.'),
  body('min_stock').optional({ checkFalsy: true }).isFloat({ min: 0 }).withMessage('Stok minimum tidak boleh negatif.'),
];

const updateProductValidation = [...createProductValidation];

module.exports = { createProductValidation, updateProductValidation };
