const express = require('express');
const router = express.Router();
const ctrl = require('./supplier.controller');
const { supplierValidation } = require('./supplier.validation');
const { handleValidation } = require('../../middlewares/validate.middleware');
const { requireAuth } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/role.middleware');

router.get('/suppliers', requireAuth, requireRole('admin'), ctrl.index.bind(ctrl));
router.get('/suppliers/create', requireAuth, requireRole('admin'), ctrl.createForm.bind(ctrl));
router.post('/suppliers', requireAuth, requireRole('admin'), supplierValidation, handleValidation, ctrl.create.bind(ctrl));
router.get('/suppliers/:id/edit', requireAuth, requireRole('admin'), ctrl.editForm.bind(ctrl));
router.post('/suppliers/:id', requireAuth, requireRole('admin'), supplierValidation, handleValidation, ctrl.update.bind(ctrl));
router.post('/suppliers/:id/toggle-status', requireAuth, requireRole('admin'), ctrl.toggleStatus.bind(ctrl));

router.get('/api/suppliers', requireAuth, requireRole('admin'), ctrl.apiIndex.bind(ctrl));
router.post('/api/suppliers', requireAuth, requireRole('admin'), supplierValidation, handleValidation, ctrl.apiCreate.bind(ctrl));
router.put('/api/suppliers/:id', requireAuth, requireRole('admin'), supplierValidation, handleValidation, ctrl.apiUpdate.bind(ctrl));

module.exports = router;
