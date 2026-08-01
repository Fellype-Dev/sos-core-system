const express = require('express');
const router = express.Router();
const StudentController = require('../controllers/StudentController');
const authMiddleware = require('../middleware/auth');
const authorizeRoles = require('../middleware/authorize');
const { ALL_ROLES } = require('../utils/roles');

router.use(authMiddleware);
router.use(authorizeRoles(...ALL_ROLES));

router.get('/', (req, res, next) => StudentController.index(req, res, next));
router.get('/:id', (req, res, next) => StudentController.show(req, res, next));
router.post('/', (req, res, next) => StudentController.store(req, res, next));
router.put('/:id', (req, res, next) => StudentController.update(req, res, next));
// Exclusao apaga o historico de frequencia em cascata: restrita ao admin.
// Demais perfis devem usar a desativacao, que preserva o cadastro.
router.delete('/:id', authorizeRoles('admin'), (req, res, next) =>
  StudentController.destroy(req, res, next)
);

module.exports = router;
