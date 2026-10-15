const express = require('express');
const router = express.Router();
const ctrl = require('./category.controller');
const { createCategoryValidation, updateCategoryValidation } = require('./category.validation');
const { handleValidation } = require('../../middlewares/validate.middleware');
const { requireAuth } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/role.middleware');

// Web
router.get('/categories', requireAuth, ctrl.index.bind(ctrl));
router.get('/categories/create', requireAuth, requireRole('admin'), ctrl.createForm.bind(ctrl));
router.post('/categories', requireAuth, requireRole('admin'), createCategoryValidation, handleValidation, ctrl.create.bind(ctrl));
router.get('/categories/:id/edit', requireAuth, requireRole('admin'), ctrl.editForm.bind(ctrl));
router.post('/categories/:id', requireAuth, requireRole('admin'), updateCategoryValidation, handleValidation, ctrl.update.bind(ctrl));
router.post('/categories/:id/toggle-status', requireAuth, requireRole('admin'), ctrl.toggleStatus.bind(ctrl));

// API
router.get('/api/categories', requireAuth, ctrl.apiIndex.bind(ctrl));
router.post('/api/categories', requireAuth, requireRole('admin'), createCategoryValidation, handleValidation, ctrl.apiCreate.bind(ctrl));
router.put('/api/categories/:id', requireAuth, requireRole('admin'), updateCategoryValidation, handleValidation, ctrl.apiUpdate.bind(ctrl));
router.patch('/api/categories/:id/status', requireAuth, requireRole('admin'), ctrl.apiToggleStatus.bind(ctrl));

module.exports = router;
