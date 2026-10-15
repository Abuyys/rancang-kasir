const express = require('express');
const router = express.Router();
const ctrl = require('./report.controller');
const { requireAuth } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/role.middleware');

// Web Routes (Admin Only)
router.get('/reports', requireAuth, requireRole('admin'), ctrl.index.bind(ctrl));
router.get('/reports/export/sales-csv', requireAuth, requireRole('admin'), ctrl.exportSalesCsv.bind(ctrl));
router.get('/reports/export/products-csv', requireAuth, requireRole('admin'), ctrl.exportProductsCsv.bind(ctrl));
router.get('/reports/export/expenses-csv', requireAuth, requireRole('admin'), ctrl.exportExpensesCsv.bind(ctrl));

// API Routes
router.get('/api/reports/summary', requireAuth, requireRole('admin'), ctrl.apiSummary.bind(ctrl));

module.exports = router;
