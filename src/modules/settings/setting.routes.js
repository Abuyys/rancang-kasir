const express = require('express');
const router = express.Router();
const ctrl = require('./setting.controller');
const { updateSettingsValidation } = require('./setting.validation');
const { handleValidation } = require('../../middlewares/validate.middleware');
const { requireAuth } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/role.middleware');

// Web Routes (Admin Only)
router.get('/settings', requireAuth, requireRole('admin'), ctrl.index.bind(ctrl));
router.post('/settings', requireAuth, requireRole('admin'), updateSettingsValidation, handleValidation, ctrl.update.bind(ctrl));
router.get('/settings/audit-logs', requireAuth, requireRole('admin'), ctrl.auditLogs.bind(ctrl));

// API Routes
router.get('/api/settings', requireAuth, requireRole('admin'), ctrl.apiGet.bind(ctrl));
router.put('/api/settings', requireAuth, requireRole('admin'), updateSettingsValidation, handleValidation, ctrl.apiUpdate.bind(ctrl));
router.get('/api/audit-logs', requireAuth, requireRole('admin'), ctrl.apiAuditLogs.bind(ctrl));

module.exports = router;
