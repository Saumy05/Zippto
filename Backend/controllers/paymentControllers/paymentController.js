const crypto = require('crypto');
const Booking = require('../../models/Booking');
const User = require('../../models/User');
const Vendor = require('../../models/Vendor');
const VendorBill = require('../../models/VendorBill');
const Transaction = require('../../models/Transaction');
const Settings = require('../../models/Settings');
const Plan = require('../../models/Plan');
const { validationResult } = require('express-validator');
const { PAYMENT_STATUS, BOOKING_STATUS } = require('../../utils/constants');
const { createOrder, verifyPayment, refundPayment } = require('../../services/razorpayService');
const { createNotification } = require('../notificationControllers/notificationController');
const { recordBookingEarning } = require('../../services/earningTrackerService');

/**
 * Create Razorpay order for booking payment
 */
const createPaymentOrder = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user.id;
    const { bookingId } = req.body;

    // Get booking
    const booking = await Booking.findOne({ _id: bookingId, userId });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if payment already done
    if (booking.paymentStatus === PAYMENT_STATUS.SUCCESS) {
      return res.status(400).json({
        success: false,
        message: 'Payment already completed for this booking'
      });
    }

    // Create Razorpay order
    console.log('Creating Razorpay order with amount:', booking.finalAmount);
    const orderResult = await createOrder(
      booking.finalAmount,
      'INR',
      booking.bookingNumber,
      {
        bookingId: booking._id.toString(),
        userId: userId.toString(),
        bookingNumber: booking.bookingNumber
      }
    );

    console.log('Razorpay order result:', orderResult);

    if (!orderResult.success) {
      console.error('Razorpay order creation failed:', orderResult.error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create payment order',
        error: orderResult.error || 'Unknown error'
      });
    }

    // Update booking with Razorpay order ID
    booking.razorpayOrderId = orderResult.orderId;
    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Payment order created successfully',
      data: {
        orderId: orderResult.orderId,
        amount: orderResult.amount / 100, // Convert back to rupees
        currency: orderResult.currency,
        key: process.env.RAZORPAY_KEY_ID || '',
        isMock: !!orderResult.isMock,
        bookingId: booking._id
      }
    });
  } catch (error) {
    console.error('Create payment order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment order. Please try again.',
      error: error.message
    });
  }
};

/**
 * Verify payment (webhook handler)
 */
const verifyPaymentWebhook = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    // Verify signature
    const isValid = verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }

    // Find booking by Razorpay order ID
    const booking = await Booking.findOne({ razorpayOrderId: razorpay_order_id });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Update booking payment status
    booking.paymentStatus = PAYMENT_STATUS.SUCCESS;
    booking.paymentMethod = 'online';
    booking.razorpayPaymentId = razorpay_payment_id;
    booking.paymentId = razorpay_payment_id;

    // ── Fetch VendorBill (to distinguish initial booking vs post-service final payment) ──
    const bill = await VendorBill.findOne({ bookingId: booking._id });

    // Update booking status: If bill exists or service was performed, transition to COMPLETED
    if (
      bill ||
      booking.status === BOOKING_STATUS.AWAITING_PAYMENT ||
      booking.status === BOOKING_STATUS.WORK_DONE ||
      booking.status === BOOKING_STATUS.VISITED ||
      booking.status === BOOKING_STATUS.IN_PROGRESS
    ) {
      booking.status = BOOKING_STATUS.COMPLETED;
      booking.completedAt = booking.completedAt || new Date();
    } else {
      booking.status = BOOKING_STATUS.CONFIRMED;
    }

    await booking.save();

    if (bill && booking.vendorId) {
      const vendorEarning = bill.vendorTotalEarning;

      // Mark bill as paid
      bill.status = 'paid';
      bill.paidAt = new Date();
      await bill.save();

      // Online payment: only earnings increase, NO dues (platform holds the money)
      await Vendor.findByIdAndUpdate(booking.vendorId, {
        $inc: { 'wallet.earnings': vendorEarning }
      });

      // Earnings credit transaction
      if (vendorEarning > 0) {
        await Transaction.create({
          vendorId: booking.vendorId,
          bookingId: booking._id,
          amount: vendorEarning,
          type: 'earnings_credit',
          paymentMethod: 'system',
          status: 'completed',
          description: `Earnings ₹${vendorEarning} credited for booking ${booking.bookingNumber} (online payment)`,
          metadata: {
            type: 'earnings_increase',
            billId: bill._id.toString(),
            serviceEarning: bill.vendorServiceEarning,
            partsEarning: bill.vendorPartsEarning
          }
        });
      }

      console.log(`[Payment] Credited ₹${vendorEarning} to vendor ${booking.vendorId}`);
    }

    // Record stats in the Daily Earning Tracker (Async)
    recordBookingEarning({
      date: new Date(),
      totalRevenue: Number(bill ? bill.grandTotal : booking.finalAmount) || 0,
      platformCommission: Number(bill ? bill.companyRevenue : (booking.finalAmount * 0.2)) || 0,
      vendorEarnings: Number(bill ? bill.vendorTotalEarning : (booking.finalAmount * 0.8)) || 0,
      totalGST: Number(bill ? bill.totalGST : 0) || 0,
      totalTDS: 0 // Tracked in withdrawals
    }).catch(err => console.error('[Payment] Daily tracker failed:', err));

    // Send notification to user
    await createNotification({
      userId: booking.userId,
      type: 'payment_success',
      title: 'Payment Successful',
      message: `Payment of ₹${booking.finalAmount} for booking ${booking.bookingNumber} was successful. Thank you!`,
      relatedId: booking._id,
      relatedType: 'payment',
      priority: 'high'
    });

    // Notify vendor
    let vendorTitle = 'Booking Confirmed';
    let vendorMsg = `Payment received for booking ${booking.bookingNumber}. The service is now confirmed.`;

    if (booking.status === BOOKING_STATUS.COMPLETED) {
      vendorTitle = 'Payment Received (Online)';
      vendorMsg = `User paid ₹${booking.finalAmount} online for booking ${booking.bookingNumber}. Job Completed!`;

      // Trigger Referral Reward on 1st completed booking
      try {
        const { processFirstBookingReferralReward } = require('../../services/referralService');
        processFirstBookingReferralReward(booking._id).catch(refErr => console.error('[Referral Hook] Online Payment Error:', refErr));
      } catch (hookErr) {
        console.warn('[Referral Hook] Warning:', hookErr.message);
      }
    }

    if (booking.vendorId) {
      await createNotification({
        vendorId: booking.vendorId,
        type: 'payment_success',
        title: vendorTitle,
        message: vendorMsg,
        relatedId: booking._id,
        relatedType: 'booking',
        priority: 'high'
      });
    }

    // ── Emit Real-Time Socket Events to Vendor & User ──
    try {
      const { getIO } = require('../../sockets');
      const io = getIO();
      if (io) {
        const payload = {
          bookingId: booking._id,
          id: booking._id,
          bookingNumber: booking.bookingNumber,
          status: booking.status,
          paymentStatus: booking.paymentStatus,
          paymentMethod: booking.paymentMethod,
          finalAmount: booking.finalAmount,
          completedAt: booking.completedAt,
          message: vendorMsg
        };

        if (booking.vendorId) {
          io.to(`vendor_${booking.vendorId}`).emit('booking_updated', payload);
          io.to(`vendor_${booking.vendorId}`).emit('payment_success', payload);
        }
        io.to(`user_${booking.userId}`).emit('booking_updated', payload);
        io.to(`user_${booking.userId}`).emit('payment_success', payload);
        io.to(`tracking_${booking._id}`).emit('booking_updated', payload);
        io.to(`tracking_${booking._id}`).emit('payment_success', payload);

        console.log(`[Payment] Emitted payment_success socket events for booking ${booking._id}`);
      }
    } catch (socketErr) {
      console.error('[Payment] Socket emit error:', socketErr);
    }

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully'
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment'
    });
  }
};

/**
 * Handle server-to-server Razorpay Webhook Events
 * POST /api/payments/webhook
 */
const handleRazorpayWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
      return res.status(400).json({ success: false, message: 'Missing Razorpay signature header' });
    }

    // Get Webhook Secret from ENV or DB Settings
    let webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      const settings = await Settings.getSettings().catch(() => null);
      webhookSecret = settings?.razorpayWebhookSecret;
    }

    if (!webhookSecret) {
      console.warn('[Webhook] ⚠️ Razorpay Webhook Secret not configured in .env or Settings. Signature verification bypassed.');
    } else {
      const rawBody = req.rawBody || JSON.stringify(req.body);
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (expectedSignature !== signature) {
        console.error('[Webhook] ❌ Invalid Razorpay Webhook signature');
        return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
      }
    }

    const { event, payload } = req.body;
    console.log(`[Webhook] 📩 Received Razorpay webhook event: ${event}`);

    // 1. Payment Captured / Order Paid
    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = payload?.payment?.entity || {};
      const orderEntity = payload?.order?.entity || {};
      const razorpayOrderId = paymentEntity.order_id || orderEntity.id;
      const razorpayPaymentId = paymentEntity.id;

      if (razorpayOrderId) {
        const booking = await Booking.findOne({ razorpayOrderId });
        if (booking && booking.paymentStatus !== PAYMENT_STATUS.SUCCESS) {
          booking.paymentStatus = PAYMENT_STATUS.SUCCESS;
          booking.paymentMethod = 'online';
          booking.razorpayPaymentId = razorpayPaymentId;
          booking.paymentId = razorpayPaymentId;

          const bill = await VendorBill.findOne({ bookingId: booking._id });
          if (
            bill ||
            booking.status === BOOKING_STATUS.AWAITING_PAYMENT ||
            booking.status === BOOKING_STATUS.WORK_DONE ||
            booking.status === BOOKING_STATUS.VISITED ||
            booking.status === BOOKING_STATUS.IN_PROGRESS
          ) {
            booking.status = BOOKING_STATUS.COMPLETED;
            booking.completedAt = booking.completedAt || new Date();
          } else {
            booking.status = BOOKING_STATUS.CONFIRMED;
          }

          await booking.save();

          // Settle vendor bill and earnings if bill exists
          if (bill && booking.vendorId) {
            const vendorEarning = bill.vendorTotalEarning || 0;
            bill.status = 'paid';
            bill.paidAt = new Date();
            await bill.save();

            await Vendor.findByIdAndUpdate(booking.vendorId, {
              $inc: { 'wallet.earnings': vendorEarning }
            });

            if (vendorEarning > 0) {
              await Transaction.create({
                vendorId: booking.vendorId,
                bookingId: booking._id,
                amount: vendorEarning,
                type: 'earnings_credit',
                paymentMethod: 'system',
                status: 'completed',
                description: `Earnings ₹${vendorEarning} credited for booking #${booking.bookingNumber} (Webhook Verified)`,
                metadata: {
                  type: 'earnings_increase',
                  billId: bill._id.toString(),
                  serviceEarning: bill.vendorServiceEarning,
                  partsEarning: bill.vendorPartsEarning
                }
              });
            }
          }

          // Record stats in Daily Earning Tracker
          recordBookingEarning({
            date: new Date(),
            totalRevenue: Number(bill ? bill.grandTotal : booking.finalAmount) || 0,
            platformCommission: Number(bill ? bill.companyRevenue : (booking.finalAmount * 0.2)) || 0,
            vendorEarnings: Number(bill ? bill.vendorTotalEarning : (booking.finalAmount * 0.8)) || 0,
            totalGST: Number(bill ? bill.totalGST : 0) || 0,
            totalTDS: 0
          }).catch(err => console.error('[Webhook] Daily tracker failed:', err));

          // Notify User
          await createNotification({
            userId: booking.userId,
            type: 'payment_success',
            title: 'Payment Successful',
            message: `Payment of ₹${booking.finalAmount} for booking #${booking.bookingNumber} confirmed via gateway.`,
            relatedId: booking._id,
            relatedType: 'payment',
            priority: 'high'
          });

          // Notify Vendor
          if (booking.vendorId) {
            await createNotification({
              vendorId: booking.vendorId,
              type: 'payment_received',
              title: 'Payment Received (Online)',
              message: `Payment of ₹${booking.finalAmount} received online for booking #${booking.bookingNumber}.`,
              relatedId: booking._id,
              relatedType: 'booking',
              priority: 'high'
            });
          }

          // Emit real-time socket events
          try {
            const { getIO } = require('../../sockets');
            const io = getIO();
            if (io) {
              const socketPayload = {
                bookingId: booking._id,
                id: booking._id,
                bookingNumber: booking.bookingNumber,
                status: booking.status,
                paymentStatus: booking.paymentStatus,
                paymentMethod: booking.paymentMethod,
                finalAmount: booking.finalAmount,
                completedAt: booking.completedAt
              };
              if (booking.vendorId) {
                io.to(`vendor_${booking.vendorId}`).emit('booking_updated', socketPayload);
                io.to(`vendor_${booking.vendorId}`).emit('payment_success', socketPayload);
              }
              io.to(`user_${booking.userId}`).emit('booking_updated', socketPayload);
              io.to(`user_${booking.userId}`).emit('payment_success', socketPayload);
              io.to(`tracking_${booking._id}`).emit('booking_updated', socketPayload);
              io.to(`tracking_${booking._id}`).emit('payment_success', socketPayload);
            }
          } catch (sockErr) {
            console.error('[Webhook] Socket emit error:', sockErr);
          }
        }
      }
    }

    // 2. Payment Failed
    else if (event === 'payment.failed') {
      const paymentEntity = payload?.payment?.entity || {};
      const razorpayOrderId = paymentEntity.order_id;
      if (razorpayOrderId) {
        const booking = await Booking.findOne({ razorpayOrderId });
        if (booking && booking.paymentStatus !== PAYMENT_STATUS.SUCCESS) {
          booking.paymentStatus = PAYMENT_STATUS.FAILED;
          await booking.save();

          await createNotification({
            userId: booking.userId,
            type: 'payment_failed',
            title: 'Payment Failed',
            message: `Payment for booking #${booking.bookingNumber} failed. Please retry payment.`,
            relatedId: booking._id,
            relatedType: 'payment',
            priority: 'high'
          });
        }
      }
    }

    // 3. Refund Processed
    else if (event === 'refund.processed' || event === 'refund.created') {
      const refundEntity = payload?.refund?.entity || {};
      const paymentId = refundEntity.payment_id;
      if (paymentId) {
        const booking = await Booking.findOne({ razorpayPaymentId: paymentId });
        if (booking) {
          booking.paymentStatus = PAYMENT_STATUS.REFUNDED;
          await booking.save();
        }
      }
    }

    res.status(200).json({ status: 'ok', eventHandled: event });
  } catch (error) {
    console.error('[Webhook] Razorpay webhook handling error:', error);
    res.status(500).json({ success: false, message: 'Webhook processing error' });
  }
};

/**
 * Process wallet payment
 */
const processWalletPayment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user.id;
    const { bookingId } = req.body;

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get booking
    const booking = await Booking.findOne({ _id: bookingId, userId });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if payment already done
    if (booking.paymentStatus === PAYMENT_STATUS.SUCCESS) {
      return res.status(400).json({
        success: false,
        message: 'Payment already completed for this booking'
      });
    }

    // Check wallet balance
    if (user.wallet.balance < booking.finalAmount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient wallet balance'
      });
    }

    // Deduct from user wallet
    user.wallet.balance -= booking.finalAmount;
    await user.save();

    const Transaction = require('../../models/Transaction');
    await Transaction.create({
      userId,
      bookingId: booking._id,
      amount: booking.finalAmount,
      type: 'debit',
      paymentMethod: 'wallet',
      status: 'completed',
      description: `Wallet payment for booking ${booking.bookingNumber}`,
      balanceAfter: user.wallet.balance
    });

    // Update booking payment status
    booking.paymentStatus = PAYMENT_STATUS.SUCCESS;
    booking.paymentMethod = 'wallet';
    booking.paymentId = `WALLET_${Date.now()}`;

    // Update booking status
    const bill = await VendorBill.findOne({ bookingId: booking._id });

    if (
      bill ||
      booking.status === BOOKING_STATUS.AWAITING_PAYMENT ||
      booking.status === BOOKING_STATUS.WORK_DONE ||
      booking.status === BOOKING_STATUS.VISITED ||
      booking.status === BOOKING_STATUS.IN_PROGRESS
    ) {
      booking.status = BOOKING_STATUS.COMPLETED;
      booking.completedAt = booking.completedAt || new Date();
    } else {
      booking.status = BOOKING_STATUS.CONFIRMED;
    }

    await booking.save();

    // ── Credit Vendor Wallet from VendorBill (single source of truth) ──
    if (bill && booking.vendorId) {
      const vendorEarning = bill.vendorTotalEarning;

      // Mark bill as paid
      bill.status = 'paid';
      bill.paidAt = new Date();
      await bill.save();

      // Wallet payment: only earnings increase, NO dues (platform holds the money)
      await Vendor.findByIdAndUpdate(booking.vendorId, {
        $inc: { 'wallet.earnings': vendorEarning }
      });

      if (vendorEarning > 0) {
        await Transaction.create({
          vendorId: booking.vendorId,
          bookingId: booking._id,
          amount: vendorEarning,
          type: 'earnings_credit',
          paymentMethod: 'system',
          status: 'completed',
          description: `Earnings ₹${vendorEarning} credited for booking ${booking.bookingNumber} (wallet payment)`,
          metadata: {
            type: 'earnings_increase',
            billId: bill._id.toString(),
            serviceEarning: bill.vendorServiceEarning,
            partsEarning: bill.vendorPartsEarning
          }
        });
      }

      console.log(`[Wallet Payment] Credited ₹${vendorEarning} to vendor ${booking.vendorId}`);
    }

    // Record stats in the Daily Earning Tracker (Async)
    recordBookingEarning({
      date: new Date(),
      totalRevenue: Number(bill ? bill.grandTotal : booking.finalAmount) || 0,
      platformCommission: Number(bill ? bill.companyRevenue : (booking.finalAmount * 0.2)) || 0,
      vendorEarnings: Number(bill ? bill.vendorTotalEarning : (booking.finalAmount * 0.8)) || 0,
      totalGST: Number(bill ? bill.totalGST : 0) || 0,
      totalTDS: 0 // Tracked in withdrawals
    }).catch(err => console.error('[Wallet Payment] Daily tracker failed:', err));

    // Send notification to user
    await createNotification({
      userId,
      type: 'payment_success',
      title: 'Payment Successful',
      message: `Payment of ₹${booking.finalAmount} for booking ${booking.bookingNumber} was successful.`,
      relatedId: booking._id,
      relatedType: 'payment',
      priority: 'high'
    });

    // Notify vendor
    let vendorTitle = 'Booking Confirmed';
    let vendorMsg = `Payment received for booking ${booking.bookingNumber}. The service is now confirmed.`;

    if (booking.status === BOOKING_STATUS.COMPLETED) {
      vendorTitle = 'Payment Received (Wallet)';
      vendorMsg = `User paid ₹${booking.finalAmount} via wallet for booking ${booking.bookingNumber}. Job Completed!`;
    }

    if (booking.vendorId) {
      await createNotification({
        vendorId: booking.vendorId,
        type: 'payment_success',
        title: vendorTitle,
        message: vendorMsg,
        relatedId: booking._id,
        relatedType: 'booking',
        priority: 'high'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Payment processed successfully',
      data: {
        bookingId: booking._id,
        amount: booking.finalAmount,
        remainingBalance: user.wallet.balance
      }
    });
  } catch (error) {
    console.error('Process wallet payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process payment. Please try again.'
    });
  }
};

/**
 * Process refund
 */
const processRefund = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { bookingId } = req.body;
    const { amount } = req.body; // Optional: partial refund

    // Get booking
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if payment was successful
    if (booking.paymentStatus !== PAYMENT_STATUS.SUCCESS) {
      return res.status(400).json({
        success: false,
        message: 'Payment not completed for this booking'
      });
    }

    // Process refund based on payment method
    if (booking.paymentMethod === 'razorpay' && booking.razorpayPaymentId) {
      // Razorpay refund
      const refundResult = await refundPayment(
        booking.razorpayPaymentId,
        amount || booking.finalAmount,
        {
          bookingId: booking._id.toString(),
          reason: 'Booking cancellation'
        }
      );

      if (!refundResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to process refund'
        });
      }

      // Update booking payment status
      booking.paymentStatus = PAYMENT_STATUS.REFUNDED;
    } else if (booking.paymentMethod === 'wallet') {
      // Wallet refund - add back to user wallet
      const user = await User.findById(booking.userId);
      if (user) {
        user.wallet.balance += (amount || booking.finalAmount);
        await user.save();
      }

      // Update booking payment status
      booking.paymentStatus = PAYMENT_STATUS.REFUNDED;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Refund not supported for this payment method'
      });
    }

    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      data: {
        bookingId: booking._id,
        refundAmount: amount || booking.finalAmount
      }
    });
  } catch (error) {
    console.error('Process refund error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process refund. Please try again.'
    });
  }
};

/**
 * Get payment history
 */
const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get bookings with successful payments
    const bookings = await Booking.find({
      userId,
      paymentStatus: PAYMENT_STATUS.SUCCESS
    })
      .populate('serviceId', 'title iconUrl')
      .populate('vendorId', 'name businessName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await Booking.countDocuments({
      userId,
      paymentStatus: PAYMENT_STATUS.SUCCESS
    });

    res.status(200).json({
      success: true,
      data: bookings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history. Please try again.'
    });
  }
};

/**
 * Confirm Pay at Home option
 */
const confirmPayAtHome = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bookingId } = req.body;

    const booking = await Booking.findOne({ _id: bookingId, userId });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.paymentStatus === PAYMENT_STATUS.SUCCESS) {
      return res.status(400).json({
        success: false,
        message: 'Payment already completed for this booking'
      });
    }

    // Update booking status — NO earnings set (VendorBill handles that later)
    booking.paymentMethod = 'pay_at_home';
    booking.paymentStatus = PAYMENT_STATUS.PENDING;
    booking.status = BOOKING_STATUS.CONFIRMED;

    await booking.save();

    // Notify Vendor that booking is confirmed
    await createNotification({
      vendorId: booking.vendorId,
      type: 'booking_confirmed',
      title: 'Booking Confirmed (Pay at Home)',
      message: `Booking ${booking.bookingNumber} has been confirmed. Payment method: Pay at Home.`,
      relatedId: booking._id,
      relatedType: 'booking'
    });

    res.status(200).json({
      success: true,
      message: 'Booking confirmed with Pay at Home option',
      data: booking
    });
  } catch (error) {
    console.error('Confirm Pay at Home error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm booking. Please try again.'
    });
  }
};

const calculateUpgradeAmount = (currentPlan, newPlanPrice) => {
  if (!currentPlan || !currentPlan.isActive) return { amount: newPlanPrice, credit: 0 };

  const now = new Date();
  const expiry = new Date(currentPlan.expiry);

  if (expiry <= now) return { amount: newPlanPrice, credit: 0 };

  const totalDuration = 30 * 24 * 60 * 60 * 1000;
  const remainingTime = expiry.getTime() - now.getTime();

  let remainingRatio = remainingTime / totalDuration;
  if (remainingRatio > 1) remainingRatio = 1;
  if (remainingRatio < 0) remainingRatio = 0;

  const credit = Math.floor((currentPlan.price || 0) * remainingRatio);

  if (credit <= 0) return { amount: newPlanPrice, credit: 0 };

  let finalAmount = newPlanPrice - credit;
  if (finalAmount < 0) finalAmount = 0;

  return { amount: Math.ceil(finalAmount), credit };
};

const getUpgradeDetails = async (req, res) => {
  try {
    const { planId } = req.query;
    if (!planId) return res.status(400).json({ success: false, message: 'Plan ID required' });

    const newPlan = await Plan.findById(planId);
    if (!newPlan) return res.status(404).json({ success: false, message: 'Plan not found' });

    const user = await User.findById(req.user.id);
    const { amount, credit } = calculateUpgradeAmount(user.plans, newPlan.price);

    res.status(200).json({
      success: true,
      data: {
        originalPrice: newPlan.price,
        credit,
        finalAmount: amount
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};






const createPlanOrder = async (req, res) => {
  try {
    const { planId } = req.body;
    const plan = await Plan.findById(planId);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

    const user = await User.findById(req.user.id);

    // Calculate dynamic pricing
    const { amount } = calculateUpgradeAmount(user.plans, plan.price);

    // Add 18% Tax
    const amountWithTax = Math.ceil(amount * 1.18);

    const orderResult = await createOrder(
      amountWithTax,
      'INR',
      `PLAN_${Date.now()}`,
      { type: 'plan', planId, userId: req.user.id }
    );
    if (!orderResult.success) {
      return res.status(500).json({ success: false, message: 'Order creation failed' });
    }

    res.status(200).json({
      success: true,
      data: {
        orderId: orderResult.orderId,
        amount: orderResult.amount / 100,
        key: process.env.RAZORPAY_KEY_ID
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const verifyPlanPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } = req.body;

    // Import verifyPayment if needed, but it's destructured at top
    const isValid = verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!isValid) return res.status(400).json({ success: false, message: 'Invalid signature' });

    const plan = await Plan.findById(planId);
    const user = await User.findById(req.user.id);

    const validityDays = plan.validityDays || 30;
    user.plans = {
      isActive: true,
      name: plan.name,
      expiry: new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000),
      price: plan.price
    };

    await user.save();

    res.status(200).json({ success: true, message: 'Plan activated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
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
};

