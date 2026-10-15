const express = require('express');
const router = express.Router();
const ctrl = require('./shift.controller');
const { openShiftValidation, closeShiftValidation } = require('./shift.validation');
const { handleValidation } = require('../../middlewares/validate.middleware');
const { requireAuth } = require('../../middlewares/auth.middleware');

router.get('/shifts', requireAuth, ctrl.index.bind(ctrl));
router.get('/shifts/open', requireAuth, ctrl.openForm.bind(ctrl));
router.post('/shifts/open', requireAuth, openShiftValidation, handleValidation, ctrl.openShift.bind(ctrl));
router.get('/shifts/:id/close', requireAuth, ctrl.closeForm.bind(ctrl));
router.post('/shifts/:id/close', requireAuth, closeShiftValidation, handleValidation, ctrl.closeShift.bind(ctrl));

router.post('/api/shifts/open', requireAuth, openShiftValidation, handleValidation, ctrl.apiOpen.bind(ctrl));
router.post('/api/shifts/:id/close', requireAuth, closeShiftValidation, handleValidation, ctrl.apiClose.bind(ctrl));
router.get('/api/shifts/current', requireAuth, ctrl.apiGetOpen.bind(ctrl));

module.exports = router;
