const { body } = require('express-validator');

const createCategoryValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Nama kategori wajib diisi.')
    .isLength({ min: 2, max: 100 }).withMessage('Nama kategori harus antara 2-100 karakter.'),
  body('description')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 255 }).withMessage('Deskripsi maksimal 255 karakter.'),
];

const updateCategoryValidation = [...createCategoryValidation];

module.exports = { createCategoryValidation, updateCategoryValidation };
