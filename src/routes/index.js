const express = require('express');
const router = express.Router();

const userRoutes = require('./userRoutes');
const authRoutes = require('./authRoutes');
const programRoutes = require('./programRoutes');
const studentRoutes = require('./studentRoutes');
const attendanceRoutes = require('./attendanceRoutes');

router.use('/users', userRoutes);
router.use('/auth', authRoutes);
router.use('/programs', programRoutes);
router.use('/students', studentRoutes);
router.use('/attendance', attendanceRoutes);

router.get('/', (req, res) => {
  res.json({
    message: 'API SOS Core System',
    version: '1.0.0'
  });
});

module.exports = router;
