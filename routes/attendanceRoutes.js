const express = require('express');
const { getAttendance } = require('../controllers/attendanceController');
const { authMiddleware, adminMiddleware } = require('../middlewares/authMiddleware');
const router = express.Router();

router.get('/', authMiddleware, getAttendance);
router.get('/all', authMiddleware, adminMiddleware, getAttendance); 

module.exports = router;