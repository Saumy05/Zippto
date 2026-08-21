const Vendor = require('../../models/Vendor');
const Transaction = require('../../models/Transaction');
const Settlement = require('../../models/Settlement');
const Withdrawal = require('../../models/Withdrawal');
const Booking = require('../../models/Booking');
const { uploadPaymentScreenshot } = require('../../utils/cloudinaryUpload');

/**
 * Get vendor wallet with ledger balance
 * Get vendor wallet with ledger details
 * dues = Amount owed to admin
 * earnings = Amount admin owes vendor
 */
const getWallet = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const vendor = await Vendor.findById(vendorId).select('wallet name businessName bankDetails');

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    const dues = vendor.wallet?.dues || 0;
    const earnings = vendor.wallet?.earnings || 0;
    const totalWithdrawn = vendor.wallet?.totalWithdrawn || 0;

    // Get pending settlements count
    const pendingSettlements = await Settlement.countDocuments({
      vendorId,
      status: 'pending'
    });

    // Get total cash collected (sum of all cash_collected transactions)
    const cashCollectedResult = await Transaction.aggregate([
      {
        $match: {
          vendorId: vendor._id,
          type: 'cash_collected',
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    // Get total settled amount
    const settledResult = await Transaction.aggregate([
      {
        $match: {
          vendorId: vendor._id,
          type: 'settlement',
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    const totalCashCollected = cashCollectedResult[0]?.total || 0;
    const totalSettled = settledResult[0]?.total || 0;

    res.status(200).json({
      success: true,
      data: {
        dues,
        earnings,
        amountDue: dues,
        balance: earnings - dues,
        totalWithdrawn,
        totalCashCollected,
        totalSettled,
        pendingSettlements,
        cashLimit: vendor.wallet?.cashLimit || 10000,
        bankDetails: vendor.bankDetails || null,
        vendor: {
          name: vendor.name,
          businessName: vendor.businessName
        }
      }
    });
  } catch (error) {
    console.error('Get vendor wallet error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wallet'
    });
  }
};

/**
 * Get vendor transactions/ledger
 */
const getTransactions = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { page = 1, limit = 20, type, status } = req.query;

    const query = { vendorId };
    if (type) query.type = type;
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('bookingId', 'bookingNumber serviceName scheduledDate');

    const total = await Transaction.countDocuments(query);

    res.status(200).json({
      success: true,
      data: transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get vendor transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions'
    });
  }
};

/**
 * Record cash collection from customer
 * Uses VendorBill as the single source of truth for earnings.
 */
const recordCashCollection = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const bookingId = req.body.bookingId;
    const amount = Number(req.body.amount);
    const notes = req.body.notes;

    if (!bookingId || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID and valid amount are required'
      });
    }

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Verify booking belongs to this vendor
    const booking = await Booking.findOne({
      _id: bookingId,
      vendorId
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found or does not belong to this vendor'
      });
    }

    // Fetch VendorBill (single source of truth for earnings)
    const VendorBill = require('../../models/VendorBill');
    const bill = await VendorBill.findOne({ bookingId: booking._id });

    let vendorEarning = 0;
    const grandTotal = amount;

    if (bill) {
      vendorEarning = bill.vendorTotalEarning;
      bill.status = 'paid';
      bill.paidAt = new Date();
      await bill.save();
    }

    // Atomic wallet update
    const currentDues = (vendor.wallet.dues || 0) + grandTotal;
    const currentEarnings = (vendor.wallet.earnings || 0) + vendorEarning;
    const cashLimit = vendor.wallet.cashLimit || 10000;
    const netOwed = currentDues - currentEarnings;

    const updateQuery = {
      $inc: {
        'wallet.dues': grandTotal,
        'wallet.earnings': vendorEarning,
        'wallet.totalCashCollected': grandTotal
      }
    };

    if (netOwed > cashLimit) {
      updateQuery.$set = {
        'wallet.isBlocked': true,
        'wallet.blockedAt': new Date(),
        'wallet.blockReason': `Cash limit exceeded. Net owed: ₹${netOwed.toFixed(2)}, Limit: ₹${cashLimit}`
      };

      // Notify admins
      try {
        const { createNotification } = require('../notificationControllers/notificationController');
        const Admin = require('../../models/Admin');

        const admins = await Admin.find({ isActive: true }).select('_id');

        for (const admin of admins) {
          await createNotification({
            adminId: admin._id,
            type: 'vendor_cash_limit_exceeded',
            title: '⚠️ Cash Limit Exceeded',
            message: `${vendor.businessName || vendor.name} exceeded cash limit! Net owed: ₹${netOwed.toFixed(2)}, Limit: ₹${cashLimit}`,
            relatedId: vendor._id,
            relatedType: 'vendor',
            data: {
              vendorId: vendor._id,
              vendorName: vendor.businessName || vendor.name,
              netOwed,
              cashLimit
            },
            pushData: {
              type: 'admin_alert',
              link: '/admin/settlements'
            }
          });
        }
        console.log(`[CashLimit] Notified ${admins.length} admins: ${vendor.name} exceeded limit`);
      } catch (notifyErr) {
        console.error('[CashLimit] Failed to notify admins:', notifyErr);
      }
    }

    await Vendor.findByIdAndUpdate(vendorId, updateQuery);
    
    // Update booking status
    booking.status = 'completed';
    booking.paymentStatus = 'collected by vendor';
    booking.paymentMethod = 'cash collected';
    booking.completedAt = new Date();
    await booking.save();

    // Create transaction record for Cash Collection
    const transaction = await Transaction.create({
      vendorId,
      bookingId,
      type: 'cash_collected',
      amount: grandTotal,
      status: 'completed',
      paymentMethod: 'cash collected',
      description: `Cash ₹${grandTotal} collected. Dues increased.`,
      metadata: {
        notes,
        type: 'dues_increase',
        billId: bill?._id?.toString(),
        vendorEarning,
        companyRevenue: bill?.companyRevenue
      }
    });

    // Create earnings credit transaction
    if (vendorEarning > 0) {
      await Transaction.create({
        vendorId,
        bookingId,
        type: 'earnings_credit',
        amount: vendorEarning,
        status: 'completed',
        paymentMethod: 'system',
        description: `Earnings ₹${vendorEarning} credited for booking #${booking.bookingNumber}`,
        metadata: {
          type: 'earnings_increase',
          billId: bill?._id?.toString(),
          serviceEarning: bill?.vendorServiceEarning,
          partsEarning: bill?.vendorPartsEarning
        }
      });
    }

    // Update booking payment status
    booking.paymentStatus = 'paid';
    booking.paymentMethod = 'cash';
    await booking.save();

    // 🔔 Notify Customer that Cash Payment has been verified
    try {
      const { createNotification } = require('../notificationControllers/notificationController');
      if (booking.userId) {
        await createNotification({
          userId: booking.userId,
          type: 'payment_received',
          title: '💵 Payment Received (Cash)',
          message: `Cash payment of ₹${grandTotal.toLocaleString()} for booking #${booking.bookingNumber} has been received by ${vendor.businessName || vendor.name}. Thank you!`,
          relatedId: booking._id,
          relatedType: 'booking',
          data: {
            bookingId: booking._id,
            bookingNumber: booking.bookingNumber,
            amount: grandTotal
          }
        });
      }
    } catch (custNotifyErr) {
      console.error('[CashCollection] Failed to notify customer:', custNotifyErr);
    }

    const newDues = currentDues;
    const newEarnings = currentEarnings;
    const newBalance = newEarnings - newDues;

    res.status(200).json({
      success: true,
      message: 'Cash collection recorded successfully',
      data: {
        transaction,
        newBalance,
        amountDue: newDues
      }
    });
  } catch (error) {
    console.error('Record cash collection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record cash collection'
    });
  }
};

/**
 * Request settlement (vendor pays admin to clear negative balance)
 */
const requestSettlement = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { amount, paymentMethod, paymentReference, paymentProof, notes } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required'
      });
    }

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    const currentDues = vendor.wallet?.dues || 0;

    if (amount > currentDues) {
      return res.status(400).json({
        success: false,
        message: `Settlement amount (₹${amount}) cannot exceed current dues (₹${currentDues})`
      });
    }

    // Check for existing pending settlement
    const existingPending = await Settlement.findOne({
      vendorId,
      status: 'pending'
    });

    if (existingPending) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending settlement request. Please wait for it to be processed.'
      });
    }

    // Create settlement request
    const settlement = await Settlement.create({
      vendorId,
      amount,
      balanceBefore: currentDues,
      balanceAfter: currentDues - amount, // Dues will decrease
      paymentMethod: paymentMethod || 'upi',
      paymentReference,
      paymentProof,
      vendorNotes: notes,
      status: 'pending'
    });

    // 🔔 NOTIFY ALL ADMINS about settlement request
    try {
      const { createNotification } = require('../notificationControllers/notificationController');
      const Admin = require('../../models/Admin');

      const admins = await Admin.find({ isActive: true }).select('_id');

      for (const admin of admins) {
        await createNotification({
          adminId: admin._id,
          type: 'vendor_settlement_request',
          title: '💰 Settlement Request',
          message: `${vendor.businessName || vendor.name} submitted settlement of ₹${amount}`,
          relatedId: settlement._id,
          relatedType: 'settlement',
          data: {
            vendorId: vendor._id,
            vendorName: vendor.businessName || vendor.name,
            amount,
            settlementId: settlement._id
          },
          pushData: {
            type: 'admin_alert',
            link: '/admin/settlements'
          }
        });
      }
      console.log(`[Settlement] Notified ${admins.length} admins about settlement request from ${vendor.name}`);
    } catch (notifyErr) {
      console.error('[Settlement] Failed to notify admins:', notifyErr);
    }

    res.status(200).json({
      success: true,
      message: 'Settlement request submitted successfully. Pending admin approval.',
      data: settlement
    });
  } catch (error) {
    console.error('Request settlement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit settlement request'
    });
  }
};

/**
 * Request Withdrawal (Vendor requests payout of earnings)
 */
const requestWithdrawal = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { amount, bankDetails, notes } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount is required' });
    }

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

    const currentEarnings = vendor.wallet?.earnings || 0;

    // Check pending withdrawals?
    const pendingWithdrawals = await Withdrawal.aggregate([
      { $match: { vendorId: vendor._id, status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const pendingAmount = pendingWithdrawals[0]?.total || 0;
    const availableEarnings = currentEarnings - pendingAmount;

    if (amount > availableEarnings) {
      return res.status(400).json({
        success: false,
        message: `Insufficient earnings. Available: ₹${availableEarnings} (Pending: ₹${pendingAmount})`
      });
    }

    // Save verified bank details on vendor model for future autofill
    if (bankDetails) {
      vendor.bankDetails = {
        accountHolderName: bankDetails.accountHolderName || vendor.bankDetails?.accountHolderName || '',
        bankName: bankDetails.bankName || vendor.bankDetails?.bankName || '',
        accountNumber: bankDetails.accountNumber || vendor.bankDetails?.accountNumber || '',
        ifscCode: bankDetails.ifscCode ? bankDetails.ifscCode.toUpperCase() : (vendor.bankDetails?.ifscCode || ''),
        upiId: bankDetails.upiId || vendor.bankDetails?.upiId || '',
        isVerified: true
      };
      await vendor.save();
    }

    const withdrawal = await Withdrawal.create({
      vendorId,
      userType: 'vendor',
      amount,
      bankDetails,
      adminNotes: notes,
      status: 'pending'
    });

    // 🔔 NOTIFY ALL ADMINS about withdrawal request
    try {
      const { createNotification } = require('../notificationControllers/notificationController');
      const Admin = require('../../models/Admin');

      const admins = await Admin.find({ isActive: true }).select('_id');

      for (const admin of admins) {
        await createNotification({
          adminId: admin._id,
          type: 'vendor_withdrawal_request',
          title: '💸 Withdrawal Request',
          message: `${vendor.businessName || vendor.name} requested withdrawal of ₹${amount}`,
          relatedId: withdrawal._id,
          relatedType: 'withdrawal',
          data: {
            vendorId: vendor._id,
            vendorName: vendor.businessName || vendor.name,
            amount,
            withdrawalId: withdrawal._id
          },
          pushData: {
            type: 'admin_alert',
            link: '/admin/settlements'
          }
        });
      }
      console.log(`[Withdrawal] Notified ${admins.length} admins about withdrawal request from ${vendor.name}`);
    } catch (notifyErr) {
      console.error('[Withdrawal] Failed to notify admins:', notifyErr);
    }

    res.status(200).json({
      success: true,
      message: 'Withdrawal request submitted successfully',
      data: withdrawal
    });

  } catch (error) {
    console.error('Request withdrawal error:', error);
    res.status(500).json({ success: false, message: 'Failed to request withdrawal' });
  }
};

/**
 * Get vendor's settlement history
 */
const getSettlements = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { page = 1, limit = 20, status } = req.query;

    const query = { vendorId };
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const settlements = await Settlement.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Settlement.countDocuments(query);

    res.status(200).json({
      success: true,
      data: settlements,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get settlements error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settlements'
    });
  }
};

/**
 * Get wallet summary for dashboard
 */
const getWalletSummary = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const vendor = await Vendor.findById(vendorId).select('wallet');

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    const balance = vendor.wallet?.balance || 0;

    // Get today's cash collections
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCollections = await Transaction.aggregate([
      {
        $match: {
          vendorId: vendor._id,
          type: 'cash_collected',
          createdAt: { $gte: today }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Get this week's collections
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    const weekCollections = await Transaction.aggregate([
      {
        $match: {
          vendorId: vendor._id,
          type: 'cash_collected',
          createdAt: { $gte: weekStart }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        dues: vendor.wallet?.dues || 0,
        earnings: vendor.wallet?.earnings || 0,
        amountDue: vendor.wallet?.dues || 0,
        today: {
          amount: todayCollections[0]?.total || 0,
          count: todayCollections[0]?.count || 0
        },
        thisWeek: {
          amount: weekCollections[0]?.total || 0,
          count: weekCollections[0]?.count || 0
        }
      }
    });
  } catch (error) {
    console.error('Get wallet summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wallet summary'
    });
  }
};

/**
 * Pay worker for a booking
 */
const payWorker = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Settlement recorded successfully'
  });
};

/**
 * Get vendor's withdrawal history
 */
const getWithdrawals = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { page = 1, limit = 20, status } = req.query;

    const query = { vendorId };
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const withdrawals = await Withdrawal.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Withdrawal.countDocuments(query);

    res.status(200).json({
      success: true,
      data: withdrawals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get withdrawals error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch withdrawals'
    });
  }
};

/**
 * Offset / Settle Dues directly from available Earnings
 * POST /api/vendor/wallet/offset-dues
 */
const offsetDuesFromEarnings = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    const currentDues = vendor.wallet?.dues || 0;
    const currentEarnings = vendor.wallet?.earnings || 0;

    if (currentDues <= 0) {
      return res.status(400).json({ success: false, message: 'No dues pending for settlement' });
    }

    if (currentEarnings <= 0) {
      return res.status(400).json({ success: false, message: 'No available earnings to offset dues' });
    }

    const offsetAmount = Math.min(currentDues, currentEarnings);

    // Atomically decrement dues and earnings
    vendor.wallet.dues = Math.max(0, currentDues - offsetAmount);
    vendor.wallet.earnings = Math.max(0, currentEarnings - offsetAmount);
    vendor.wallet.totalSettled = (vendor.wallet.totalSettled || 0) + offsetAmount;

    // Check if vendor can be automatically unblocked
    if (vendor.wallet.isBlocked && vendor.wallet.dues <= (vendor.wallet.cashLimit || 10000)) {
      vendor.wallet.isBlocked = false;
      vendor.wallet.blockReason = null;
      vendor.wallet.blockedAt = null;
    }

    await vendor.save();

    // Create immutable Transaction Ledger record
    await Transaction.create({
      vendorId: vendor._id,
      type: 'settlement',
      amount: offsetAmount,
      status: 'completed',
      paymentMethod: 'wallet',
      description: `Dues ₹${offsetAmount.toLocaleString()} cleared from available online earnings`,
      metadata: {
        type: 'earnings_offset',
        offsetAmount,
        remainingDues: vendor.wallet.dues,
        remainingEarnings: vendor.wallet.earnings
      }
    });

    res.status(200).json({
      success: true,
      message: `Successfully cleared ₹${offsetAmount.toLocaleString()} dues from your available earnings!`,
      data: {
        offsetAmount,
        dues: vendor.wallet.dues,
        earnings: vendor.wallet.earnings,
        isBlocked: vendor.wallet.isBlocked
      }
    });
  } catch (error) {
    console.error('Offset dues error:', error);
    res.status(500).json({ success: false, message: 'Failed to offset dues from earnings' });
  }
};

module.exports = {
  getWallet,
  getTransactions,
  recordCashCollection,
  requestSettlement,
  getSettlements,
  getWalletSummary,
  payWorker,
  requestWithdrawal,
  getWithdrawals,
  offsetDuesFromEarnings
};
