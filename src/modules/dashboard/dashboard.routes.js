const express = require('express');
const router = express.Router();
const ctrl = require('./dashboard.controller');
const { requireAuth } = require('../../middlewares/auth.middleware');

router.get('/dashboard', requireAuth, ctrl.index.bind(ctrl));
router.get('/api/dashboard/summary', requireAuth, ctrl.apiSummary.bind(ctrl));

module.exports = router;
