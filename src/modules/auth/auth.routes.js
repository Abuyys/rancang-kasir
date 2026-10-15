const express = require('express');
const router = express.Router();

const authController = require('./auth.controller');
const { loginValidation } = require('./auth.validation');
const { handleValidation } = require('../../middlewares/validate.middleware');
const { requireAuth, redirectIfAuth } = require('../../middlewares/auth.middleware');

// ========== Web Routes ==========

// GET /auth/login - Show login page
router.get('/auth/login', redirectIfAuth, authController.loginPage);

// POST /auth/login - Process login
router.post('/auth/login', redirectIfAuth, loginValidation, handleValidation, authController.login.bind(authController));

// POST /auth/logout - Process logout
router.post('/auth/logout', authController.logout.bind(authController));

// ========== API Routes ==========

// POST /api/auth/login - API login
router.post('/api/auth/login', loginValidation, handleValidation, authController.login.bind(authController));

// POST /api/auth/logout - API logout
router.post('/api/auth/logout', requireAuth, authController.logout.bind(authController));

// GET /api/auth/me - Get current user
router.get('/api/auth/me', requireAuth, authController.me.bind(authController));

module.exports = router;
