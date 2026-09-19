const express = require('express');
const router = express.Router();
const historyController = require('../controllers/historyController');
const { verifyToken } = require('../middleware/authMiddleware');

// Route dengan proteksi JWT
router.get('/', verifyToken, historyController.getHistory);
router.get('/filter', verifyToken, historyController.getHistoryByDate);
router.get('/actuator', verifyToken, historyController.getActuatorHistory);

module.exports = router;
