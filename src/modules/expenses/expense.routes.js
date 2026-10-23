const express = require('express');
const router = express.Router();
const ctrl = require('./expense.controller');
const { expenseValidation } = require('./expense.validation');
const { handleValidation } = require('../../middlewares/validate.middleware');
const { requireAuth } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/role.middleware');

// All expense routes require admin role
router.get('/expenses', requireAuth, requireRole('admin'), ctrl.index.bind(ctrl));
router.get('/expenses/new', requireAuth, requireRole('admin'), ctrl.createForm.bind(ctrl));
router.get('/expenses/create', requireAuth, requireRole('admin'), ctrl.createForm.bind(ctrl));
router.post('/expenses', requireAuth, requireRole('admin'), expenseValidation, handleValidation, ctrl.create.bind(ctrl));
router.get('/expenses/:id/edit', requireAuth, requireRole('admin'), ctrl.editForm.bind(ctrl));
router.post('/expenses/:id', requireAuth, requireRole('admin'), expenseValidation, handleValidation, ctrl.update.bind(ctrl));
router.post('/expenses/:id/delete', requireAuth, requireRole('admin'), ctrl.delete.bind(ctrl));

// API Routes
router.get('/api/expenses', requireAuth, requireRole('admin'), ctrl.apiList.bind(ctrl));
router.post('/api/expenses', requireAuth, requireRole('admin'), expenseValidation, handleValidation, ctrl.apiCreate.bind(ctrl));
router.get('/api/expenses/:id', requireAuth, requireRole('admin'), ctrl.apiDetail.bind(ctrl));
router.put('/api/expenses/:id', requireAuth, requireRole('admin'), expenseValidation, handleValidation, ctrl.apiUpdate.bind(ctrl));
router.delete('/api/expenses/:id', requireAuth, requireRole('admin'), ctrl.apiDelete.bind(ctrl));

module.exports = router;
