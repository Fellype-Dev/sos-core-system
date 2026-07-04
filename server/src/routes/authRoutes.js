const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const authMiddleware = require('../middleware/auth');
const authorizeRoles = require('../middleware/authorize');
const { loginLimiter } = require('../middleware/rateLimiter');

router.post('/register', authMiddleware, authorizeRoles('admin'), AuthController.register);
router.post('/login', loginLimiter, AuthController.login);
router.get('/me', authMiddleware, AuthController.me);
router.post('/switch-program', authMiddleware, AuthController.switchProgram);

module.exports = router;
