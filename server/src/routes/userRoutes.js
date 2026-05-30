const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const authMiddleware = require('../middleware/auth');
const authorizeRoles = require('../middleware/authorize');

router.use(authMiddleware);

router.get('/', authorizeRoles('admin', 'sede'), UserController.index);
router.get('/:id', authorizeRoles('admin', 'sede'), UserController.show);
router.post('/', authorizeRoles('admin'), UserController.store);
router.put('/:id', authorizeRoles('admin'), UserController.update);
router.delete('/:id', authorizeRoles('admin'), UserController.destroy);

module.exports = router;
