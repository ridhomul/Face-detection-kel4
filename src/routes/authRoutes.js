const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Register new user
router.post('/register', authController.registerUser);

// User login
router.post('/login', authController.loginUser);

// Get login history
router.get('/history', authController.getLoginHistory);

// Verify token and get user info
router.get('/user', authController.getUserProfile);

module.exports = router;