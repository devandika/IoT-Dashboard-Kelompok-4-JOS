const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');
const { verifyToken } = require('../middleware/authMiddleware');

// GET /api/devices - Dapat diakses publik/dashboard terautentikasi
router.get('/', deviceController.getDevices);

// POST, PUT, DELETE - Membutuhkan token autentikasi
router.post('/', verifyToken, deviceController.addDevice);
router.put('/:id', verifyToken, deviceController.updateDevice);
router.delete('/:id', verifyToken, deviceController.deleteDevice);

module.exports = router;
