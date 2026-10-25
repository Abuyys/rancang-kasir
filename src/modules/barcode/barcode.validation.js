const { body, param, query } = require('express-validator');
const eanHelper = require('../../utils/ean13');

const updateBarcodeValidation = [
  body('barcode')
    .trim()
    .notEmpty()
    .withMessage('Barcode wajib diisi.')
    .custom((value) => {
      const validation = eanHelper.validateBarcode(value);
      if (!validation.valid) {
        throw new Error(validation.error || 'Format atau check-digit barcode tidak valid.');
      }
      return true;
    }),
];

module.exports = {
  updateBarcodeValidation,
};
