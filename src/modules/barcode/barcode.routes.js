const express = require('express');
const router = express.Router();
const barcodeCtrl = require('./barcode.controller');
const { requireAuth } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/role.middleware');
const { handleValidation } = require('../../middlewares/validate.middleware');
const { updateBarcodeValidation } = require('./barcode.validation');

// Public POS & Image endpoints (Admin & Kasir)
router.get('/api/products/barcode/:code', requireAuth, barcodeCtrl.apiSearch.bind(barcodeCtrl));
router.get('/api/products/:id/barcode/image', requireAuth, barcodeCtrl.apiProductBarcodeImage.bind(barcodeCtrl));
router.get('/api/barcode/render', requireAuth, barcodeCtrl.apiRenderDynamic.bind(barcodeCtrl));

// Admin only endpoints
router.get('/api/barcode/next-internal', requireAuth, requireRole('admin'), barcodeCtrl.apiNextInternalBarcode.bind(barcodeCtrl));
router.post('/api/products/:id/barcode/generate', requireAuth, requireRole('admin'), barcodeCtrl.apiGenerate.bind(barcodeCtrl));
router.post('/api/products/barcode/generate-bulk', requireAuth, requireRole('admin'), barcodeCtrl.apiGenerateBulk.bind(barcodeCtrl));
router.put('/api/products/:id/barcode', requireAuth, requireRole('admin'), updateBarcodeValidation, handleValidation, barcodeCtrl.apiUpdate.bind(barcodeCtrl));
router.get('/labels/print', requireAuth, requireRole('admin'), barcodeCtrl.printLabelsPage.bind(barcodeCtrl));

module.exports = router;
