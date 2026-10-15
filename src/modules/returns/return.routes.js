const express = require('express');
const router = express.Router();
const ctrl = require('./return.controller');
const { createReturnValidation } = require('./return.validation');
const { handleValidation } = require('../../middlewares/validate.middleware');
const { requireAuth } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/role.middleware');

// Web Routes
router.get('/returns', requireAuth, ctrl.index.bind(ctrl));
router.get('/returns/new', requireAuth, ctrl.newForm.bind(ctrl));
router.post('/returns', requireAuth, createReturnValidation, handleValidation, ctrl.create.bind(ctrl));
router.get('/returns/:id', requireAuth, ctrl.detail.bind(ctrl));
router.post('/returns/:id/approve', requireAuth, requireRole('admin'), ctrl.approve.bind(ctrl));
router.post('/returns/:id/reject', requireAuth, requireRole('admin'), ctrl.reject.bind(ctrl));

// API Endpoints
router.get('/api/returns', requireAuth, ctrl.apiList.bind(ctrl));
router.get('/api/returns/:id', requireAuth, ctrl.apiDetail.bind(ctrl));
router.post('/api/returns', requireAuth, createReturnValidation, handleValidation, ctrl.apiCreate.bind(ctrl));
router.post('/api/returns/:id/approve', requireAuth, requireRole('admin'), ctrl.apiApprove.bind(ctrl));
router.post('/api/returns/:id/complete', requireAuth, requireRole('admin'), ctrl.apiApprove.bind(ctrl));
router.post('/api/returns/:id/reject', requireAuth, requireRole('admin'), ctrl.apiReject.bind(ctrl));

module.exports = router;
