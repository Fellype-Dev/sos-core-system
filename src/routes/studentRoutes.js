const express = require('express');
const router = express.Router();
const StudentController = require('../controllers/StudentController');
const authMiddleware = require('../middleware/auth');
const authorizeRoles = require('../middleware/authorize');

router.use(authMiddleware);
router.use(authorizeRoles('admin', 'sede', 'coordenador'));

router.get('/', (req, res, next) => StudentController.index(req, res, next));
router.get('/:id', (req, res, next) => StudentController.show(req, res, next));
router.post('/', (req, res, next) => StudentController.store(req, res, next));
router.put('/:id', (req, res, next) => StudentController.update(req, res, next));
router.delete('/:id', (req, res, next) => StudentController.destroy(req, res, next));

module.exports = router;
