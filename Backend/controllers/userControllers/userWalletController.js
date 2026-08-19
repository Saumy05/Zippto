const User = require('../../models/User');
const Transaction = require('../../models/Transaction');
const Withdrawal = require('../../models/Withdrawal');
const { validationResult } = require('express-validator');

/**
 * Get wallet balance and financial overview
 * GET /api/user/wallet/balance
 */
const getWalletBalance = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select('wallet name email phone').lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const currentBalance = user.wallet?.balance || 0;

    // Fetch aggregate transaction stats for this user
    const [stats, pendingWithdrawalsData] = await Promise.all([
      Transaction.aggregate([
        { $match: { userId: user._id, status: 'completed' } },
        {
          $group: {
            _id: '$type',
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]),
      Withdrawal.aggregate([
        { $match: { userId: user._id, status: 'pending' } },
        {
          $group: {
            _id: null,
            totalPending: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    let totalEarned = 0; // Referrals, cashbacks, refunds
    let totalSpent = 0;  // Bookings paid via wallet

    stats.forEach(item => {
      if (['credit', 'refund', 'referral_bonus', 'cashback'].includes(item._id)) {
        totalEarned += item.totalAmount;
      } else if (['debit', 'payment'].includes(item._id)) {
        totalSpent += item.totalAmount;
      }
    });

    const pendingWithdrawalAmount = pendingWithdrawalsData[0]?.totalPending || 0;

    res.status(200).json({
      success: true,
      data: {
        balance: currentBalance,
        totalEarned,
        totalSpent,
        pendingWithdrawalAmount,
        currency: 'INR'
      }
    });
  } catch (error) {
    console.error('Get wallet balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wallet balance. Please try again.'
    });
  }
};

/**
 * Request Wallet Withdrawal (Transfer to Bank Account or UPI)
 * POST /api/user/wallet/withdraw
 */
const requestWalletWithdrawal = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0]?.msg || 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user.id;
    const { amount, transferType, upiId, accountNumber, ifscCode, accountHolderName, bankName } = req.body;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 100) {
      return res.status(400).json({
        success: false,
        message: 'Minimum withdrawal amount is ₹100'
      });
    }

    // Validate transfer destination details
    let bankDetails = {};
    if (transferType === 'upi') {
      if (!upiId || !/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upiId.trim())) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid UPI ID (e.g. name@upi or mobile@bank)'
        });
      }
      bankDetails.upiId = upiId.trim();
    } else if (transferType === 'bank' || transferType === 'bank_transfer') {
      if (!accountNumber || accountNumber.trim().length < 8) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid bank account number'
        });
      }
      if (!ifscCode || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode.trim().toUpperCase())) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid 11-character IFSC code (e.g. SBIN0001234)'
        });
      }
      if (!accountHolderName || accountHolderName.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Please enter the account holder name'
        });
      }
      bankDetails = {
        accountNumber: accountNumber.trim(),
        ifscCode: ifscCode.trim().toUpperCase(),
        accountHolderName: accountHolderName.trim(),
        bankName: (bankName || 'Bank Account').trim()
      };
    } else {
      return res.status(400).json({
        success: false,
        message: 'Please select a valid transfer method (UPI or Bank Transfer)'
      });
    }

    // Senior SDDE Concurrency Safeguard: Atomic Balance Deduction
    // Uses findOneAndUpdate with condition `wallet.balance >= parsedAmount` to prevent race conditions
    const updatedUser = await User.findOneAndUpdate(
      {
        _id: userId,
        'wallet.balance': { $gte: parsedAmount }
      },
      {
        $inc: { 'wallet.balance': -parsedAmount }
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient available wallet balance for this withdrawal'
      });
    }

    // Create persistent Withdrawal Document
    const withdrawal = await Withdrawal.create({
      userId: updatedUser._id,
      userType: 'user',
      amount: parsedAmount,
      status: 'pending',
      bankDetails,
      platformFeeRate: 0,
      platformFeeAmount: 0,
      tdsRate: 0,
      tdsAmount: 0,
      netAmount: parsedAmount
    });

    // Create immutable Transaction Ledger entry
    const maskedDest = transferType === 'upi'
      ? `UPI: ${bankDetails.upiId}`
      : `Bank: ••••${bankDetails.accountNumber.slice(-4)} (${bankDetails.ifscCode})`;

    await Transaction.create({
      userId: updatedUser._id,
      type: 'withdrawal',
      amount: parsedAmount,
      status: 'pending',
      paymentMethod: transferType === 'upi' ? 'wallet' : 'bank_transfer',
      description: `Withdrawal Request to ${maskedDest}`,
      balanceBefore: updatedUser.wallet.balance + parsedAmount,
      balanceAfter: updatedUser.wallet.balance,
      referenceId: withdrawal._id.toString(),
      metadata: {
        withdrawalId: withdrawal._id,
        transferType,
        bankDetails
      }
    });

    res.status(200).json({
      success: true,
      message: `Withdrawal request for ₹${parsedAmount} submitted successfully. Funds will be transferred upon admin approval.`,
      data: {
        withdrawalId: withdrawal._id,
        amount: parsedAmount,
        newBalance: updatedUser.wallet.balance,
        status: 'pending',
        transferType,
        destination: maskedDest,
        createdAt: withdrawal.createdAt
      }
    });
  } catch (error) {
    console.error('Request wallet withdrawal error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process withdrawal request. Please try again.'
    });
  }
};

/**
 * Get user's withdrawal requests history
 * GET /api/user/wallet/withdrawals
 */
const getUserWithdrawals = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [withdrawals, total] = await Promise.all([
      Withdrawal.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Withdrawal.countDocuments({ userId })
    ]);

    const formatted = withdrawals.map(w => ({
      id: w._id,
      amount: w.amount,
      status: w.status, // 'pending', 'approved', 'rejected'
      transferType: w.bankDetails?.upiId ? 'UPI' : 'Bank Transfer',
      destination: w.bankDetails?.upiId
        ? w.bankDetails.upiId
        : `${w.bankDetails?.bankName || 'Bank'} ••••${w.bankDetails?.accountNumber?.slice(-4) || ''}`,
      requestDate: w.requestDate || w.createdAt,
      processedDate: w.processedDate,
      transactionReference: w.transactionReference,
      rejectionReason: w.rejectionReason,
      adminNotes: w.adminNotes
    }));

    res.status(200).json({
      success: true,
      data: formatted,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get user withdrawals error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch withdrawal history'
    });
  }
};

/**
 * Get wallet transaction history with multi-filter support
 * GET /api/user/wallet/transactions
 */
const getWalletTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, type } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter query
    const query = { userId };
    if (type && type !== 'all') {
      if (type === 'credits') {
        query.type = { $in: ['credit', 'refund', 'referral_bonus', 'cashback'] };
      } else if (type === 'debits') {
        query.type = { $in: ['debit', 'payment', 'penalty'] };
      } else if (type === 'withdrawals') {
        query.type = 'withdrawal';
      } else if (type === 'refunds') {
        query.type = 'refund';
      } else {
        query.type = type;
      }
    }

    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Transaction.countDocuments(query)
    ]);

    const formattedTransactions = transactions.map(txn => ({
      id: txn._id,
      type: txn.type,
      amount: txn.amount,
      description: txn.description,
      date: txn.createdAt,
      status: txn.status,
      balanceBefore: txn.balanceBefore,
      balanceAfter: txn.balanceAfter,
      paymentMethod: txn.paymentMethod,
      referenceId: txn.referenceId
    }));

    res.status(200).json({
      success: true,
      data: formattedTransactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get wallet transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction history. Please try again.'
    });
  }
};

module.exports = {
  getWalletBalance,
  requestWalletWithdrawal,
  getUserWithdrawals,
  getWalletTransactions
};
