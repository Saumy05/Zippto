const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticate } = require('../../middleware/authMiddleware');
const { isUser } = require('../../middleware/roleMiddleware');
const {
  getWalletBalance,
  requestWalletWithdrawal,
  getUserWithdrawals,
  getWalletTransactions
} = require('../../controllers/userControllers/userWalletController');

// Validation rules
const withdrawalValidation = [
  body('amount').isFloat({ min: 100 }).withMessage('Minimum withdrawal amount is ₹100'),
  body('transferType').isIn(['upi', 'bank', 'bank_transfer']).withMessage('Transfer type must be UPI or Bank Transfer')
];

// Routes
router.get('/balance', authenticate, isUser, getWalletBalance);
router.post('/withdraw', authenticate, isUser, withdrawalValidation, requestWalletWithdrawal);
router.get('/withdrawals', authenticate, isUser, getUserWithdrawals);
router.get('/transactions', authenticate, isUser, getWalletTransactions);

module.exports = router;
