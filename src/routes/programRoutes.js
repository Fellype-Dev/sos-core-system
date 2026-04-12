const express = require('express');
const router = express.Router();
const ProgramController = require('../controllers/ProgramController');

router.get('/', ProgramController.index);

module.exports = router;
