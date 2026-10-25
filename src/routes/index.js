const express = require('express');
const router = express.Router();

const { requireAuth } = require('../middlewares/auth.middleware');

// Module routes
const authRoutes = require('../modules/auth/auth.routes');
const dashboardRoutes = require('../modules/dashboard/dashboard.routes');
const categoryRoutes = require('../modules/categories/category.routes');
const productRoutes = require('../modules/products/product.routes');
const supplierRoutes = require('../modules/suppliers/supplier.routes');
const purchaseRoutes = require('../modules/purchases/purchase.routes');
const inventoryRoutes = require('../modules/inventory/inventory.routes');
const shiftRoutes = require('../modules/shifts/shift.routes');
const saleRoutes = require('../modules/sales/sale.routes');
const returnRoutes = require('../modules/returns/return.routes');
const reportRoutes = require('../modules/reports/report.routes');
const expenseRoutes = require('../modules/expenses/expense.routes');
const userRoutes = require('../modules/users/user.routes');
const settingRoutes = require('../modules/settings/setting.routes');
const barcodeRoutes = require('../modules/barcode/barcode.routes');

router.use('/', authRoutes);
router.use('/', dashboardRoutes);
router.use('/', categoryRoutes);
router.use('/', productRoutes);
router.use('/', barcodeRoutes);
router.use('/', supplierRoutes);
router.use('/', purchaseRoutes);
router.use('/', inventoryRoutes);
router.use('/', shiftRoutes);
router.use('/', saleRoutes);
router.use('/', returnRoutes);
router.use('/', reportRoutes);
router.use('/', expenseRoutes);
router.use('/', userRoutes);
router.use('/', settingRoutes);

// Home redirect
router.get('/', (req, res) => {
  if (req.session && req.session.user) return res.redirect('/dashboard');
  return res.redirect('/auth/login');
});

module.exports = router;
