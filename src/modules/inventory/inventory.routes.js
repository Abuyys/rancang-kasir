const express = require('express');
const router = express.Router();
const ctrl = require('./inventory.controller');
const { adjustmentValidation } = require('./inventory.validation');
const { handleValidation } = require('../../middlewares/validate.middleware');
const { requireAuth } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/role.middleware');

router.get('/inventory', requireAuth, requireRole('admin'), ctrl.index.bind(ctrl));
router.get('/inventory/movements', requireAuth, requireRole('admin'), ctrl.movements.bind(ctrl));
router.get('/inventory/adjustments', requireAuth, requireRole('admin'), ctrl.adjustmentForm.bind(ctrl));
router.post('/inventory/adjustments', requireAuth, requireRole('admin'), adjustmentValidation, handleValidation, ctrl.createAdjustment.bind(ctrl));

router.get('/api/inventory', requireAuth, requireRole('admin'), ctrl.apiIndex.bind(ctrl));
router.get('/api/inventory/movements', requireAuth, requireRole('admin'), ctrl.apiMovements.bind(ctrl));
router.post('/api/inventory/adjustments', requireAuth, requireRole('admin'), adjustmentValidation, handleValidation, ctrl.apiCreateAdjustment.bind(ctrl));

module.exports = router;
