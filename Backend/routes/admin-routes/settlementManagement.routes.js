const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticate } = require('../../middleware/authMiddleware');
const { isAdmin, isSuperAdmin } = require('../../middleware/roleMiddleware');
const {
  getVendorBalances,
  getVendorLedger,
  getPendingSettlements,
  approveSettlement,
  rejectSettlement,
  getSettlementHistory,
  getSettlementDashboard,
  blockVendor,
  unblockVendor,
  updateCashLimit,
  // Withdrawals
  getWithdrawalRequests,
  approveWithdrawal,
  rejectWithdrawal
} = require('../../controllers/adminControllers/settlementController');

// Dashboard summary
router.get('/dashboard', authenticate, isAdmin, isSuperAdmin, getSettlementDashboard);

// Get all vendors with balances
router.get('/vendors', authenticate, isAdmin, isSuperAdmin, getVendorBalances);

// Get specific vendor's ledger
router.get('/vendors/:vendorId/ledger', authenticate, isAdmin, isSuperAdmin, getVendorLedger);

// Vendor management (blocking and limits)
router.post('/vendors/:vendorId/block', authenticate, isAdmin, isSuperAdmin, blockVendor);
router.post('/vendors/:vendorId/unblock', authenticate, isAdmin, isSuperAdmin, unblockVendor);
router.post('/vendors/:vendorId/cash-limit', authenticate, isAdmin, isSuperAdmin, updateCashLimit);

// Get all pending settlements
router.get('/pending', authenticate, isAdmin, isSuperAdmin, getPendingSettlements);

// Get settlement history
router.get('/history', authenticate, isAdmin, isSuperAdmin, getSettlementHistory);

// Approve settlement
router.post(
  '/:settlementId/approve',
  authenticate,
  isAdmin,
  isSuperAdmin,
  [body('adminNotes').optional().isString()],
  approveSettlement
);

// Reject settlement
router.post(
  '/:settlementId/reject',
  authenticate,
  isAdmin,
  isSuperAdmin,
  [body('rejectionReason').notEmpty().withMessage('Rejection reason is required')],
  rejectSettlement
);

// Withdrawals
router.get('/withdrawals', authenticate, isAdmin, isSuperAdmin, getWithdrawalRequests);
router.post('/withdrawals/:withdrawalId/approve', authenticate, isAdmin, isSuperAdmin, approveWithdrawal);
router.post('/withdrawals/:withdrawalId/reject', authenticate, isAdmin, isSuperAdmin, rejectWithdrawal);

module.exports = router;
