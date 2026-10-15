const express = require('express');
const router = express.Router();
const ctrl = require('./purchase.controller');
const { createPurchaseValidation } = require('./purchase.validation');
const { handleValidation } = require('../../middlewares/validate.middleware');
const { requireAuth } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/role.middleware');

router.get('/purchases', requireAuth, requireRole('admin'), ctrl.index.bind(ctrl));
router.get('/purchases/create', requireAuth, requireRole('admin'), ctrl.createForm.bind(ctrl));
router.get('/purchases/new', requireAuth, requireRole('admin'), ctrl.createForm.bind(ctrl));
router.post('/purchases', requireAuth, requireRole('admin'), createPurchaseValidation, handleValidation, ctrl.create.bind(ctrl));
router.get('/purchases/:id', requireAuth, requireRole('admin'), ctrl.detail.bind(ctrl));
router.post('/purchases/:id/receive', requireAuth, requireRole('admin'), ctrl.receive.bind(ctrl));
router.post('/purchases/:id/cancel', requireAuth, requireRole('admin'), ctrl.cancel.bind(ctrl));

router.get('/api/purchases', requireAuth, requireRole('admin'), ctrl.apiIndex.bind(ctrl));
router.post('/api/purchases', requireAuth, requireRole('admin'), createPurchaseValidation, handleValidation, ctrl.create.bind(ctrl));
router.post('/api/purchases/:id/receive', requireAuth, requireRole('admin'), ctrl.apiReceive.bind(ctrl));

module.exports = router;
