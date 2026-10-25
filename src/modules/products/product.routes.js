const express = require('express');
const router = express.Router();
const ctrl = require('./product.controller');
const { createProductValidation, updateProductValidation } = require('./product.validation');
const { handleValidation } = require('../../middlewares/validate.middleware');
const { requireAuth } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/role.middleware');

// Web
router.get('/products', requireAuth, ctrl.index.bind(ctrl));
router.get('/products/create', requireAuth, requireRole('admin'), ctrl.createForm.bind(ctrl));
router.post('/products', requireAuth, requireRole('admin'), createProductValidation, handleValidation, ctrl.create.bind(ctrl));
router.get('/products/:id', requireAuth, ctrl.detail.bind(ctrl));
router.get('/products/:id/edit', requireAuth, requireRole('admin'), ctrl.editForm.bind(ctrl));
router.post('/products/:id', requireAuth, requireRole('admin'), updateProductValidation, handleValidation, ctrl.update.bind(ctrl));
router.post('/products/:id/toggle-status', requireAuth, requireRole('admin'), ctrl.toggleStatus.bind(ctrl));

// API
router.get('/api/products', requireAuth, ctrl.apiIndex.bind(ctrl));
// NOTE: /api/products/barcode/:code is handled by barcode.routes.js (active-only POS search)
router.get('/api/products/:id', requireAuth, ctrl.apiDetail.bind(ctrl));
router.post('/api/products', requireAuth, requireRole('admin'), createProductValidation, handleValidation, ctrl.apiCreate.bind(ctrl));
router.put('/api/products/:id', requireAuth, requireRole('admin'), updateProductValidation, handleValidation, ctrl.apiUpdate.bind(ctrl));
router.patch('/api/products/:id/status', requireAuth, requireRole('admin'), ctrl.apiToggleStatus.bind(ctrl));

module.exports = router;
