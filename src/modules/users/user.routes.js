const express = require('express');
const router = express.Router();
const ctrl = require('./user.controller');
const { createUserValidation, updateUserValidation, resetPasswordValidation } = require('./user.validation');
const { handleValidation } = require('../../middlewares/validate.middleware');
const { requireAuth } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/role.middleware');

// All user management routes require admin role
router.get('/users', requireAuth, requireRole('admin'), ctrl.index.bind(ctrl));
router.get('/users/new', requireAuth, requireRole('admin'), ctrl.createForm.bind(ctrl));
router.post('/users', requireAuth, requireRole('admin'), createUserValidation, handleValidation, ctrl.create.bind(ctrl));
router.get('/users/:id/edit', requireAuth, requireRole('admin'), ctrl.editForm.bind(ctrl));
router.post('/users/:id', requireAuth, requireRole('admin'), updateUserValidation, handleValidation, ctrl.update.bind(ctrl));
router.get('/users/:id/reset-password', requireAuth, requireRole('admin'), ctrl.resetPasswordForm.bind(ctrl));
router.post('/users/:id/reset-password', requireAuth, requireRole('admin'), resetPasswordValidation, handleValidation, ctrl.resetPassword.bind(ctrl));
router.post('/users/:id/toggle-status', requireAuth, requireRole('admin'), ctrl.toggleStatus.bind(ctrl));

// API Routes
router.get('/api/users', requireAuth, requireRole('admin'), ctrl.apiList.bind(ctrl));
router.post('/api/users', requireAuth, requireRole('admin'), createUserValidation, handleValidation, ctrl.apiCreate.bind(ctrl));
router.get('/api/users/:id', requireAuth, requireRole('admin'), ctrl.apiDetail.bind(ctrl));
router.put('/api/users/:id', requireAuth, requireRole('admin'), updateUserValidation, handleValidation, ctrl.apiUpdate.bind(ctrl));
router.post('/api/users/:id/reset-password', requireAuth, requireRole('admin'), resetPasswordValidation, handleValidation, ctrl.apiResetPassword.bind(ctrl));
router.patch('/api/users/:id/status', requireAuth, requireRole('admin'), ctrl.apiToggleStatus.bind(ctrl));

module.exports = router;
