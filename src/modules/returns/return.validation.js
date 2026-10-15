const { body } = require('express-validator');

const createReturnValidation = [
  body('sale_id').notEmpty().withMessage('Transaksi wajib dipilih.'),
  body('reason').notEmpty().withMessage('Alasan retur wajib diisi.').trim(),
  body('items').custom((val) => {
    // Bisa datang sebagai objek dari form HTML atau array dari JSON
    if (!val || (typeof val !== 'object' && !Array.isArray(val))) {
      throw new Error('Data item tidak valid.');
    }
    return true;
  }),
];

module.exports = { createReturnValidation };
