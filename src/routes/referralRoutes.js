const express = require('express');
const router = express.Router();
const ReferralController = require('../controllers/ReferralController');
const authMiddleware = require('../middleware/auth');
const authorizeRoles = require('../middleware/authorize');

router.use(authMiddleware);
router.use(authorizeRoles('admin', 'sede', 'coordenador'));

router.get('/', (req, res, next) => ReferralController.index(req, res, next));
router.get('/:id', (req, res, next) => ReferralController.show(req, res, next));
router.post('/', (req, res, next) => ReferralController.store(req, res, next));
router.put('/:id', (req, res, next) => ReferralController.update(req, res, next));
router.delete('/:id', (req, res, next) => ReferralController.destroy(req, res, next));

module.exports = router;
