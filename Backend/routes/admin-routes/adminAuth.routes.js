const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  login,
  logout,
  updateProfile,
  getProfile
} = require('../../controllers/adminControllers/adminAuthController');
const { authenticate } = require('../../middleware/authMiddleware');
const { isAdmin } = require('../../middleware/roleMiddleware');

// Validation rules
const loginValidation = [
  body('email').optional().trim(),
  body('phone').optional().trim(),
  body('password').optional().trim(),
  body('otp').optional().trim()
];

// Routes
router.post('/login', loginValidation, login);
router.post('/logout', authenticate, isAdmin, logout);
router.put('/profile', authenticate, isAdmin, updateProfile);
router.get('/profile', authenticate, isAdmin, getProfile);

module.exports = router;

