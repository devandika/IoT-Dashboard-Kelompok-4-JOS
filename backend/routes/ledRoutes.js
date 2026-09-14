const express = require('express');
const router = express.Router();
const ledController = require('../controllers/ledController');
const { verifyToken } = require('../middleware/authMiddleware');

// Route dengan proteksi JWT
router.post('/', verifyToken, ledController.controlLed);

module.exports = router;
