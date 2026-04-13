const express = require('express');
const router = express.Router();
const AttendanceController = require('../controllers/AttendanceController');
const authMiddleware = require('../middleware/auth');
const authorizeRoles = require('../middleware/authorize');

router.use(authMiddleware);
router.use(authorizeRoles('admin', 'sede', 'coordenador'));

router.get('/', (req, res, next) => AttendanceController.show(req, res, next));
router.post('/', (req, res, next) => AttendanceController.store(req, res, next));

module.exports = router;
