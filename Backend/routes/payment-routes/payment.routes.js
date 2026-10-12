const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticate } = require('../../middleware/authMiddleware');
const { isUser } = require('../../middleware/roleMiddleware');
const { requireFlag } = require('../../utils/platformSettings');

const onlineEnabled = requireFlag('isOnlinePaymentEnabled', 'Online payments are currently disabled');
const walletEnabled = requireFlag('isWalletPaymentEnabled', 'Wallet payments are currently disabled');
const cashEnabled = requireFlag('isCashPaymentEnabled', 'Pay at home / cash payments are currently disabled');
const {
  createPaymentOrder,
  verifyPaymentWebhook,
  handleRazorpayWebhook,
  processWalletPayment,
  processRefund,
  getPaymentHistory,
  confirmPayAtHome,
  createPlanOrder,
  verifyPlanPayment,
  getUpgradeDetails
} = require('../../controllers/paymentControllers/paymentController');

// Validation rules
const createOrderValidation = [
  body('bookingId').isMongoId().withMessage('Valid booking ID is required')
];

const verifyPaymentValidation = [
  body('razorpay_order_id').trim().notEmpty().withMessage('Order ID is required'),
  body('razorpay_payment_id').trim().notEmpty().withMessage('Payment ID is required'),
  body('razorpay_signature').trim().notEmpty().withMessage('Signature is required')
];

const walletPaymentValidation = [
  body('bookingId').isMongoId().withMessage('Valid booking ID is required')
];

const refundValidation = [
  body('bookingId').isMongoId().withMessage('Valid booking ID is required'),
  body('amount').optional().isFloat({ min: 0 }).withMessage('Amount must be a positive number')
];

// Routes
// Server-to-Server Razorpay Webhook
router.post('/webhook', handleRazorpayWebhook);

router.post('/create-order', authenticate, isUser, onlineEnabled, createOrderValidation, createPaymentOrder);
router.post('/verify', authenticate, isUser, verifyPaymentValidation, verifyPaymentWebhook);
router.post('/wallet', authenticate, isUser, walletEnabled, walletPaymentValidation, processWalletPayment);
router.post('/refund', authenticate, isUser, refundValidation, processRefund);
router.post('/pay-at-home', authenticate, isUser, cashEnabled, walletPaymentValidation, confirmPayAtHome);
router.get('/history', authenticate, isUser, getPaymentHistory);
router.post('/plan/create-order', authenticate, isUser, createPlanOrder);
router.post('/plan/verify', authenticate, isUser, verifyPlanPayment);
router.get('/plan/upgrade-details', authenticate, isUser, getUpgradeDetails);

module.exports = router;

