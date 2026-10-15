const express = require('express');
const router = express.Router();
const ctrl = require('./sale.controller');
const { requireAuth } = require('../../middlewares/auth.middleware');

// POS Interface
router.get('/pos', requireAuth, ctrl.posPage.bind(ctrl));
router.post('/api/sales/checkout', requireAuth, ctrl.checkout.bind(ctrl));
router.get('/api/sales/:id', requireAuth, ctrl.apiDetail.bind(ctrl));
router.post('/api/sales/:id/cancel', requireAuth, ctrl.apiCancel.bind(ctrl));

// Transactions Management (Web Views)
router.get('/transactions', requireAuth, ctrl.transactionsIndex.bind(ctrl));
router.get('/transactions/:id', requireAuth, ctrl.transactionDetail.bind(ctrl));
router.post('/transactions/:id/cancel', requireAuth, ctrl.cancelTransaction.bind(ctrl));
router.get('/transactions/:id/receipt', requireAuth, ctrl.receipt.bind(ctrl));

module.exports = router;
