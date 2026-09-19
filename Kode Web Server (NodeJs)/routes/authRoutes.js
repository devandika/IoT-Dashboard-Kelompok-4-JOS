const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

router.post('/login', authController.login);
router.post('/register', authController.register);

// Route yang dilindungi hanya untuk admin
router.get('/users', verifyToken, verifyAdmin, authController.getUsers);
router.post('/users', verifyToken, verifyAdmin, authController.createUser);
router.put('/users/:id', verifyToken, verifyAdmin, authController.updateUser);
router.delete('/users/:id', verifyToken, verifyAdmin, authController.deleteUser);
router.post('/ping', verifyToken, authController.pingUser);
router.post('/change-password', verifyToken, authController.changePassword);

module.exports = router;
