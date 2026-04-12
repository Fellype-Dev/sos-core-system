const express = require('express');
const router = express.Router();

const userRoutes = require('./userRoutes');
const authRoutes = require('./authRoutes');
const programRoutes = require('./programRoutes');

router.use('/users', userRoutes);
router.use('/auth', authRoutes);
router.use('/programs', programRoutes);

router.get('/', (req, res) => {
  res.json({
    message: 'API SOS Core System',
    version: '1.0.0'
  });
});

module.exports = router;
