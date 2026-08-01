const express = require('express');
const router = express.Router();
const ClassGroupController = require('../controllers/ClassGroupController');
const authMiddleware = require('../middleware/auth');
const authorizeRoles = require('../middleware/authorize');
const { ALL_ROLES } = require('../utils/roles');

router.use(authMiddleware);
router.use(authorizeRoles(...ALL_ROLES));

router.get('/', (req, res, next) => ClassGroupController.index(req, res, next));
router.post('/', (req, res, next) => ClassGroupController.store(req, res, next));
router.put('/:id', (req, res, next) => ClassGroupController.update(req, res, next));
router.delete('/:id', (req, res, next) => ClassGroupController.destroy(req, res, next));

module.exports = router;
