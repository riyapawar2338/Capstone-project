// routes/authRoutes.js
const express = require('express');
const router  = express.Router();
const { login, logout, getMe, register } = require('./authController');
const { protect, authorize }             = require('./auth');
const { loginRules, validate }           = require('./validate');

// POST /api/auth/login
router.post('/login', loginRules, validate, login);

// POST /api/auth/logout  (protected)
router.post('/logout', protect, logout);

// GET  /api/auth/me  (protected)
router.get('/me', protect, getMe);

// POST /api/auth/register  (superadmin only)
router.post('/register', protect, authorize('superadmin'), register);

module.exports = router;