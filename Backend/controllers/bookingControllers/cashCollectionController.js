const crypto = require('crypto');
const { getPlatformFlags } = require('../../utils/platformSettings');
const { payableAfterCoupon } = require('../../services/couponService');
const Booking = require('../../models/Booking');
const Vendor = require('../../models/Vendor');
const Transaction = require('../../models/Transaction');
const { PAYMENT_STATUS, BOOKING_STATUS } = require('../../utils/constants');
const { recordBookingEarning } = require('../../services/earningTrackerService');
const { createQRCode, getQRCodePayments } = require('../../services/razorpayService');
const { refundOrphanPayment } = require('../../services/orphanPaymentRefundService');

/**
 * Authorization helper: admin, the assigned vendor, or (if allowed) the booking's customer.
 */
const isAuthorizedForBooking = (req, booking, { allowUser = false } = {}) => {
  const role = String(req.userRole || req.user?.role || '').toUpperCase();
  const uid = String(req.user?._id || req.user?.id || '');
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') return true;
  if (booking.vendorId && String(booking.vendorId) === uid) return true;
  if (allowUser && booking.userId && String(booking.userId) === uid) return true;
  return false;
};

const MAX_OTP_ATTEMPTS = 5;

const generateOtp = () => String(crypto.randomInt(1000, 10000));

/**
 * Verify the customer's payment OTP with a failed-attempt limit.
 * Returns null when OK, otherwise { status, message }.
 * `requireOtp` makes a missing OTP on the booking or in the request a failure.
 */
const checkPaymentOtp = async (booking, otp, { requireOtp = false } = {}) => {
  const expected = booking.customerConfirmationOTP;
  const devBypass = process.env.NODE_ENV === 'development' && otp === '0000';

  if (!expected) {
    return requireOtp && !devBypass
      ? { status: 400, message: 'No OTP has been issued for this booking. Ask the customer to open the bill first.' }
      : null;
  }

  if ((booking.paymentOtpAttempts || 0) >= MAX_OTP_ATTEMPTS) {
    return { status: 429, message: 'Too many incorrect OTP attempts. Please regenerate the bill/OTP.' };
  }

  if (devBypass) return null;

  const provided = otp === undefined || otp === null ? '' : String(otp);
  const a = Buffer.from(provided);
  const b = Buffer.from(String(expected));
  const match = a.length === b.length && crypto.timingSafeEqual(a, b);

  if (!match) {
    await Booking.updateOne({ _id: booking._id }, { $inc: { paymentOtpAttempts: 1 } });
    return { status: 400, message: 'Invalid OTP. Please enter the correct code shared by the customer.' };
  }
  return null;
};

// Live payment watchers poll the status endpoint; avoid hitting Razorpay more than once per QR every few seconds.
const QR_POLL_TTL_MS = 4000;
const qrPollCache = new Map();

const getQRCodePaymentsThrottled = async (qrId) => {
  const now = Date.now();
  const cached = qrPollCache.get(qrId);
  if (cached && now - cached.at < QR_POLL_TTL_MS) return cached.result;

  const result = await getQRCodePayments(qrId);
  qrPollCache.set(qrId, { at: now, result });

  if (qrPollCache.size > 500) {
    for (const [key, value] of qrPollCache) {
      if (now - value.at > QR_POLL_TTL_MS) qrPollCache.delete(key);
    }
  }
  return result;
};

/**
 * If a QR was shown and the customer already paid it, cash must not also be accepted.
 * Returns true when a captured payment exists on the booking's QR.
 */
const qrAlreadyPaid = async (booking) => {
  if (!booking.razorpayQrId) return false;
  try {
    const qrRes = await getQRCodePayments(booking.razorpayQrId);
    return !!(qrRes.success && (qrRes.payments || []).some(p => p.status === 'captured'));
  } catch (err) {
    console.error('[QR check] failed, continuing without it:', err.message);
    return false;
  }
};

const FORBIDDEN = { success: false, message: 'Not authorized for this booking' };

/**
 * Parse an optional client-provided total. Returns undefined if absent, null if invalid.
 */
const parseAmount = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * Initiate Online Collection (Show QR Code)
 */
exports.initiateOnlineCollection = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (!isAuthorizedForBooking(req, booking)) {
      return res.status(403).json(FORBIDDEN);
    }

    // Optional: Update final total and extra items if provided during initiation
    const { totalAmount, extraItems } = req.body;
    const parsedTotal = parseAmount(totalAmount);
    if (parsedTotal === null) {
      return res.status(400).json({ success: false, message: 'Invalid payment amount' });
    }
    if (parsedTotal !== undefined) {
      booking.finalAmount = payableAfterCoupon(booking, parsedTotal);
      booking.userPayableAmount = booking.finalAmount;
    }

    if (!booking.finalAmount || booking.finalAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid payment amount' });
    }

    // Store extra items for proper commission calculation
    if (extraItems && Array.isArray(extraItems) && extraItems.length > 0) {
      booking.workDoneDetails = {
        ...booking.workDoneDetails,
        items: extraItems.map(item => ({
          title: item.name || item.title,
          qty: Number(item.qty) || Number(item.quantity) || 1,
          price: Number(item.price) || 0
        }))
      };

      booking.extraCharges = extraItems.map(item => ({
        name: item.name || item.title,
        quantity: Number(item.qty) || Number(item.quantity) || 1,
        price: Number(item.price) || 0,
        total: (Number(item.qty) || Number(item.quantity) || 1) * (Number(item.price) || 0)
      }));

      booking.extraChargesTotal = booking.extraCharges.reduce((sum, item) => sum + item.total, 0);
      booking.markModified('workDoneDetails');
      booking.markModified('extraCharges');
    }

    // Create QR Code
    const qrResult = await createQRCode(
      booking.finalAmount,
      booking.bookingNumber,
      {
        bookingId: booking._id.toString(),
        type: 'vendor_initiated_online'
      }
    );

    if (!qrResult.success) {
      return res.status(500).json({ success: false, message: qrResult.error });
    }

    // Reuse existing OTP or generate new one
    const otp = booking.paymentOtp || generateOtp();
    if (otp !== booking.customerConfirmationOTP) booking.paymentOtpAttempts = 0;
    booking.customerConfirmationOTP = otp;
    booking.paymentOtp = otp;

    // Store QR ID to track later
    booking.razorpayQrId = qrResult.qrCodeId;
    booking.paymentMethod = 'online'; // Mark as online as soon as QR is shown
    await booking.save();

    // Emit socket event to user with full bill details & OTP
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${booking.userId}`).emit('booking_updated', {
        bookingId: booking._id,
        finalAmount: booking.finalAmount,
        workDoneDetails: booking.workDoneDetails,
        qrPaymentInitiated: true,
        customerConfirmationOTP: otp,
        paymentOtp: otp
      });
    }

    // Send Push Notification with OTP
    try {
      const { createNotification } = require('../notificationControllers/notificationController');
      await createNotification({
        userId: booking.userId,
        type: 'work_done',
        title: 'Payment Request & Bill Ready',
        message: `Bill: ₹${booking.finalAmount}. OTP: ${otp}. Please verify bill and pay online or share OTP.`,
        relatedId: booking._id,
        relatedType: 'booking',
        priority: 'high',
        pushData: {
          type: 'work_done',
          bookingId: booking._id.toString(),
          paymentOtp: otp,
          link: `/user/booking/${booking._id}`
        }
      });
    } catch (notificationError) {
      console.error('Notification error in initiateOnlineCollection:', notificationError);
    }

    res.status(200).json({
      success: true,
      message: 'QR Code generated',
      data: {
        qrImageUrl: qrResult.imageUrl,
        paymentUrl: qrResult.paymentUrl,
        amount: booking.finalAmount,
        isManualUpi: qrResult.isManualUpi || false
      }
    });
  } catch (error) {
    console.error('Initiate online collection error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Initiate Cash Collection
 * Optional: Sends OTP to customer
 */
exports.initiateCashCollection = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (!isAuthorizedForBooking(req, booking)) {
      return res.status(403).json(FORBIDDEN);
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot collect cash for a cancelled booking' });
    }

    if (booking.paymentStatus === PAYMENT_STATUS.SUCCESS || booking.razorpayPaymentId) {
      return res.status(400).json({
        success: false,
        message: 'This booking has already been paid online. Cash collection is not allowed.'
      });
    }

    if (await qrAlreadyPaid(booking)) {
      return res.status(409).json({
        success: false,
        message: 'The customer has already paid via the QR code. Please verify the online payment instead.'
      });
    }

    // Check if vendor wallet is blocked due to cash limit
    if (booking.vendorId) {
      const vendorCheck = await Vendor.findById(booking.vendorId).lean();
      if (vendorCheck?.wallet?.isBlocked) {
        return res.status(403).json({
          success: false,
          message: `Cash collection blocked: ${vendorCheck.wallet.blockReason || 'Cash limit exceeded. Please settle dues with admin.'}`
        });
      }
    }

    // Allow cash, pay_at_home, online (if user changes mind), AND plan_benefit (for final bill flow)
    const allowedMethods = ['cash', 'pay_at_home', 'plan_benefit', 'online'];
    if (!allowedMethods.includes(booking.paymentMethod)) {
      return res.status(400).json({ success: false, message: 'This booking is not eligible for cash collection' });
    }

    // Optional: Update final total and extra items if provided during initiation
    const { totalAmount, extraItems } = req.body;
    const parsedCashTotal = parseAmount(totalAmount);
    if (parsedCashTotal === null) {
      return res.status(400).json({ success: false, message: 'Invalid payment amount' });
    }
    if (parsedCashTotal !== undefined) {
      booking.finalAmount = payableAfterCoupon(booking, parsedCashTotal);
      // Assuming no partial payment has been made yet (as status is pending/work_done)
      booking.userPayableAmount = booking.finalAmount;
    }

    // Store extra items for proper commission calculation
    if (extraItems && Array.isArray(extraItems) && extraItems.length > 0) {
      // 1. Update workDoneDetails (Frontend display)
      booking.workDoneDetails = {
        ...booking.workDoneDetails,
        items: extraItems.map(item => ({
          title: item.name || item.title,
          qty: Number(item.qty) || Number(item.quantity) || 1,
          price: Number(item.price) || 0
        }))
      };

      // 2. Update extraCharges (Backend calculation)
      booking.extraCharges = extraItems.map(item => ({
        name: item.name || item.title,
        quantity: Number(item.qty) || Number(item.quantity) || 1,
        price: Number(item.price) || 0,
        total: (Number(item.qty) || Number(item.quantity) || 1) * (Number(item.price) || 0)
      }));

      // 3. Update extraChargesTotal
      booking.extraChargesTotal = booking.extraCharges.reduce((sum, item) => sum + item.total, 0);
    }

    // Force mark modified for nested object (just in case)
    if (extraItems) {
      booking.markModified('workDoneDetails');
      booking.markModified('extraCharges');
    }

    // Reset QR payment flag and switch method if switching back to cash
    booking.qrPaymentInitiated = false;
    if (booking.paymentMethod === 'online') {
      booking.paymentMethod = 'cash';
    }

    // Reuse existing OTP or generate new one
    const otp = booking.paymentOtp || generateOtp();
    if (otp !== booking.customerConfirmationOTP) booking.paymentOtpAttempts = 0;
    booking.customerConfirmationOTP = otp;
    booking.paymentOtp = otp;
    await booking.save();

    // Emit socket event to user with full bill details and OTP
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${booking.userId}`).emit('booking_updated', {
        bookingId: booking._id,
        finalAmount: booking.finalAmount,
        customerConfirmationOTP: booking.customerConfirmationOTP,
        paymentOtp: booking.paymentOtp,
        workDoneDetails: booking.workDoneDetails,
        qrPaymentInitiated: false
      });
    }

    // Send Push Notification with OTP
    try {
      const { createNotification } = require('../notificationControllers/notificationController');
      await createNotification({
        userId: booking.userId,
        type: 'work_done',
        title: 'Payment Request & Bill Ready',
        message: `Bill: ₹${booking.finalAmount}. OTP: ${otp}. Please verify bill and share OTP to complete payment.`,
        relatedId: booking._id,
        relatedType: 'booking',
        priority: 'high',
        pushData: {
          type: 'work_done',
          bookingId: booking._id.toString(),
          paymentOtp: otp,
          link: `/user/booking/${booking._id}`
        }
      });
    } catch (notificationError) {
      console.error('Notification error in initiateCashCollection:', notificationError);
    }

    res.status(200).json({
      success: true,
      message: 'Bill finalized',
      totalAmount: booking.finalAmount
    });
  } catch (error) {
    console.error('Initiate cash collection error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Confirm Cash Collection (by Vendor Partner)
 * Uses VendorBill as the single source of truth for earnings.
 */
exports.confirmCashCollection = async (req, res) => {
  try {
    const { id } = req.params;
    const { otp, amount, extraItems } = req.body;
    const userId = req.user._id;
    const userRole = req.user.role;

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // EDGE CASE: Cancelled booking
    if (booking.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot collect cash for a cancelled booking' });
    }

    // EDGE CASE: Already collected -> idempotent success
    if (booking.status === BOOKING_STATUS.COMPLETED && booking.cashCollected) {
      return res.status(200).json({ success: true, message: 'Cash collection already confirmed', data: { bookingId: booking._id } });
    }

    // EDGE CASE: Only collectable once work is done / bill generated
    const collectableStatuses = [
      BOOKING_STATUS.VISITED,
      BOOKING_STATUS.IN_PROGRESS,
      BOOKING_STATUS.WORK_DONE,
      BOOKING_STATUS.AWAITING_PAYMENT
    ];
    if (!collectableStatuses.includes(booking.status)) {
      return res.status(400).json({ success: false, message: 'Work not done or bill not generated yet' });
    }

    // EDGE CASE: Double-payment prevention - if already paid online
    if (booking.paymentStatus === PAYMENT_STATUS.SUCCESS || booking.razorpayPaymentId) {
      return res.status(400).json({
        success: false,
        message: 'This booking has already been paid online. Cash collection is not allowed.'
      });
    }

    // EDGE CASE: customer paid the displayed QR in the meantime
    if (await qrAlreadyPaid(booking)) {
      return res.status(409).json({
        success: false,
        message: 'The customer has already paid via the QR code. Please verify the online payment instead.'
      });
    }

    // EDGE CASE: Vendor blocked check
    if (booking.vendorId) {
      const vendorCheck = await Vendor.findById(booking.vendorId).lean();
      if (vendorCheck?.wallet?.isBlocked) {
        return res.status(403).json({
          success: false,
          message: `Cash collection blocked: ${vendorCheck.wallet.blockReason || 'Cash limit exceeded. Please settle dues with admin.'}`
        });
      }
    }

    // EDGE CASE: Authorization check - only assigned vendor or admin can confirm
    if (userRole?.toUpperCase() !== 'ADMIN' && booking.vendorId && booking.vendorId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to confirm cash collection for this booking' });
    }

    // OTP Verification
    // Plan-benefit bookings with no extra charges have nothing to pay, so OTP is skipped (explicit '0000' only).
    const isPlanBenefitNoExtras =
      booking.paymentMethod === 'plan_benefit' && otp === '0000' && !(Number(booking.extraChargesTotal) > 0);

    if (!isPlanBenefitNoExtras) {
      const otpError = await checkPaymentOtp(booking, otp);
      if (otpError) {
        console.warn(`[ConfirmCash] Invalid OTP attempt for booking ${id}`);
        return res.status(otpError.status).json({ success: false, message: otpError.message });
      }
    }

    // --- ATOMIC LOCK AGAINST RACE CONDITIONS ---
    // Only one request can claim the booking, and never one that was already paid online / cancelled.
    const previous = {
      cashCollected: booking.cashCollected,
      paymentStatus: booking.paymentStatus,
      paymentMethod: booking.paymentMethod,
      status: booking.status,
      finalAmount: booking.finalAmount,
      userPayableAmount: booking.userPayableAmount
    };

    const updateResult = await Booking.updateOne(
      {
        _id: booking._id,
        cashCollected: { $ne: true },
        status: { $ne: BOOKING_STATUS.CANCELLED },
        paymentStatus: { $nin: [PAYMENT_STATUS.SUCCESS, PAYMENT_STATUS.COLLECTED_BY_VENDOR] }
      },
      { $set: { cashCollected: true } }
    );

    if (updateResult.modifiedCount === 0) {
      const latest = await Booking.findById(booking._id).select('cashCollected').lean();
      if (latest?.cashCollected) {
        console.log(`[Race Condition Prevented] Booking ${booking._id} already processed.`);
        return res.status(200).json({
          success: true,
          message: 'Cash collection already confirmed',
          data: { bookingId: booking._id }
        });
      }
      return res.status(409).json({
        success: false,
        message: 'This booking has already been settled or cancelled. Cash collection is not allowed.'
      });
    }

    const revertClaim = () =>
      Booking.updateOne({ _id: booking._id }, { $set: previous }).catch(revertErr =>
        console.error('[ConfirmCash] CRITICAL: failed to revert claim for', String(booking._id), revertErr)
      );

    let bill;
    let vendorEarning = 0;
    let grandTotal;
    let newDues = 0;
    let vendor = null;
    const vendorId = booking.vendorId;
    const VendorBill = require('../../models/VendorBill');

    try {
      const collectionAmount = amount !== undefined ? Number(amount) : Number(booking.finalAmount);

      // Store extra items in workDoneDetails (for display)
      if (extraItems && Array.isArray(extraItems) && extraItems.length > 0) {
        booking.workDoneDetails = {
          ...booking.workDoneDetails,
          items: extraItems.map(item => ({
            title: item.name || item.title,
            qty: Number(item.qty) || Number(item.quantity) || 1,
            price: Number(item.price) || 0
          }))
        };

        booking.extraCharges = extraItems.map(item => ({
          name: item.name || item.title,
          quantity: Number(item.qty) || Number(item.quantity) || 1,
          price: Number(item.price) || 0,
          total: (Number(item.qty) || Number(item.quantity) || 1) * (Number(item.price) || 0)
        }));

        booking.extraChargesTotal = booking.extraCharges.reduce((sum, item) => sum + item.total, 0);
        booking.markModified('workDoneDetails');
        booking.markModified('extraCharges');
      }

      // Fetch VendorBill (single source of truth for earnings)
      bill = await VendorBill.findOne({ bookingId: booking._id });

      grandTotal = collectionAmount;

      if (bill) {
        vendorEarning = Number(bill.vendorTotalEarning) || 0;
        grandTotal = payableAfterCoupon(booking, Number(bill.grandTotal) || 0); // cash actually collected after coupon

        // Sync booking fields from bill to ensure data consistency
        booking.basePrice = bill.originalServiceBase;
        booking.tax = bill.originalGST + bill.vendorServiceGST + bill.partsGST;
        booking.visitingCharges = bill.visitingCharges;
      } else {
        // EDGE CASE FALLBACK: If bill is missing, vendor keeps FALLBACK_VENDOR_SHARE of the amount
        vendorEarning = parseFloat((collectionAmount * FALLBACK_VENDOR_SHARE).toFixed(2));
      }

      // Update Booking (bill total is authoritative when a bill exists)
      booking.finalAmount = grandTotal;
      booking.userPayableAmount = grandTotal;
      booking.cashCollected = true;
      booking.cashCollectedAt = new Date();
      booking.cashCollectedBy = 'vendor';
      booking.cashCollectorId = userId;

      if (booking.paymentMethod === 'plan_benefit') {
        booking.paymentStatus = PAYMENT_STATUS.SUCCESS;
      } else {
        booking.paymentStatus = PAYMENT_STATUS.COLLECTED_BY_VENDOR;
        booking.paymentMethod = 'cash collected'; // Standardized label
      }

      if (['work_done', 'visited', 'in_progress', 'awaiting_payment'].includes(booking.status)) {
        booking.status = 'completed';
        booking.completedAt = new Date();
      }

      // Clear OTPs on completion
      booking.paymentOtp = undefined;
      booking.customerConfirmationOTP = undefined;
      booking.paymentOtpAttempts = 0;

      await booking.save();

      if (bill) {
        bill.status = 'paid';
        bill.paidAt = new Date();
        await bill.save();
      }

      // Update Vendor Wallet atomically, then evaluate the cash limit on the *updated* wallet
      // so two concurrent collections cannot both slip under the limit.
      if (vendorId) {
        vendor = await Vendor.findByIdAndUpdate(
          vendorId,
          {
            $inc: {
              'wallet.dues': grandTotal,
              'wallet.earnings': vendorEarning,
              'wallet.totalCashCollected': grandTotal
            }
          },
          { new: true, runValidators: false }
        ).lean();

        if (vendor) {
          newDues = vendor.wallet?.dues || 0;
          const cashLimit = vendor.wallet?.cashLimit || 10000;
          const netOwed = newDues - (vendor.wallet?.earnings || 0);

          if (netOwed > cashLimit && !vendor.wallet?.isBlocked && (await getPlatformFlags()).isAutoCodBlockingEnabled !== false) {
            await Vendor.findByIdAndUpdate(
              vendorId,
              {
                $set: {
                  'wallet.isBlocked': true,
                  'wallet.blockedAt': new Date(),
                  'wallet.blockReason': `Cash limit exceeded. Net owed: ₹${netOwed.toFixed(2)}, Limit: ₹${cashLimit}`
                }
              },
              { runValidators: false }
            );
          }
        }
      }
    } catch (criticalErr) {
      // Nothing financial must stay half-applied: release the claim so the vendor can retry.
      console.error('[ConfirmCash] Critical failure, reverting claim:', criticalErr);
      await revertClaim();
      return res.status(500).json({ success: false, message: 'Failed to record cash collection. Please try again.' });
    }

    if (vendor) {
      // Record Transaction - Cash Collected
      try {
        await Transaction.create({
          vendorId,
          userId: booking.userId,
          bookingId: booking._id,
          amount: grandTotal,
          type: 'cash_collected',
          paymentMethod: 'cash collected',
          description: `Cash ₹${grandTotal} collected for booking ${booking.bookingNumber}`,
          status: 'completed',
          metadata: {
            type: 'dues_increase',
            collectedBy: userRole,
            billId: bill?._id?.toString(),
            vendorEarning,
            companyRevenue: bill?.companyRevenue
          }
        });
      } catch (txnErr) {
        console.error('[ConfirmCash] Transaction 1 (cash_collected) failed:', txnErr);
      }

      // Record Transaction - Earnings Credit
      if (vendorEarning > 0) {
        try {
          await Transaction.create({
            vendorId,
            bookingId: booking._id,
            amount: vendorEarning,
            type: 'earnings_credit',
            paymentMethod: 'system',
            description: `Earnings ₹${vendorEarning} credited for booking ${booking.bookingNumber}`,
            status: 'completed',
            metadata: {
              type: 'earnings_increase',
              billId: bill?._id?.toString(),
              serviceEarning: bill?.vendorServiceEarning,
              partsEarning: bill?.vendorPartsEarning
            }
          });
        } catch (txnErr) {
          console.error('[ConfirmCash] Transaction 2 (earnings_credit) failed:', txnErr);
        }
      }
    }

    // Record stats in the Daily Earning Tracker (Async)
    recordBookingEarning({
      date: new Date(),
      totalRevenue: grandTotal,
      platformCommission: bill ? (bill.companyRevenue || 0) : (grandTotal - vendorEarning),
      vendorEarnings: vendorEarning,
      totalGST: bill ? (bill.totalGST || 0) : 0,
      totalTDS: 0 // Captured separately during withdrawal
    }).catch(err => console.error('[ConfirmCash] Daily tracker failed:', err));

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${booking.userId}`).emit('booking_updated', {
        bookingId: booking._id,
        status: booking.status,
        cashCollected: true,
        message: 'Payment recorded and booking completed!'
      });
    }

    // Process Referral Reward on First Booking Completion
    try {
      const { processFirstBookingReferralReward } = require('../../services/referralService');
      processFirstBookingReferralReward(booking._id).catch(refErr => console.error('[Referral Hook] Error:', refErr));
    } catch (hookErr) {
      console.warn('[Referral Hook] Warning:', hookErr.message);
    }

    // Push Notification (non-fatal: the payment is already recorded)
    try {
      const { createNotification } = require('../notificationControllers/notificationController');
      await createNotification({
        userId: booking.userId,
        type: 'payment_received',
        title: 'Payment Received (Cash)',
        message: `Payment of ₹${grandTotal} received in cash. Job Completed. Thanks!`,
        relatedId: booking._id,
        relatedType: 'booking',
        priority: 'high'
      });
    } catch (notificationError) {
      console.error('[ConfirmCash] Notification failed:', notificationError);
    }

    res.status(200).json({
      success: true,
      message: 'Cash collection confirmed and recorded in ledger',
      data: {
        bookingId: booking._id,
        amount: grandTotal,
        walletDues: vendor ? newDues : null
      }
    });
  } catch (error) {
    console.error('Confirm cash collection error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Customer Confirm Payment (Optional flow for user to confirm they paid)
 */
exports.customerConfirmPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (!isAuthorizedForBooking(req, booking, { allowUser: true })) {
      return res.status(403).json(FORBIDDEN);
    }

    booking.customerConfirmed = true;
    await booking.save();

    res.status(200).json({ success: true, message: 'Payment confirmed by customer' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Used only when a booking has no VendorBill (legacy data): vendor keeps 70% of the amount.
const FALLBACK_VENDOR_SHARE = 0.7;

const emitPaymentCompleted = (req, booking, extra = {}) => {
  const io = req.app.get('io');
  if (!io) return;
  const payload = {
    bookingId: booking._id,
    status: BOOKING_STATUS.COMPLETED,
    paymentStatus: PAYMENT_STATUS.SUCCESS,
    paymentMethod: booking.paymentMethod,
    ...extra
  };
  io.to(`user_${booking.userId}`).emit('booking_updated', payload);
  io.to(`tracking_${booking._id}`).emit('booking_updated', payload);
  if (booking.vendorId) io.to(`vendor_${booking.vendorId}`).emit('booking_updated', payload);
};

/**
 * Finalize an online (QR / manual UPI) payment exactly once.
 *
 * - Atomically claims the booking (single findOneAndUpdate), so concurrent verify calls,
 *   webhooks or a cash confirmation can never both settle the same booking.
 * - Syncs the VendorBill figures into the same atomic write (no stale amounts).
 * - If a critical step (bill / vendor wallet) fails after the claim, the claim is reverted
 *   so the operation can safely be retried.
 *
 * Returns { claimed: false } when the booking was already settled or cancelled.
 */
const finalizeOnlinePayment = async (booking, { paymentId, razorpayPaymentId, methodLabel, source, description }) => {
  const VendorBill = require('../../models/VendorBill');
  const bill = await VendorBill.findOne({ bookingId: booking._id });

  const now = new Date();
  const set = {
    paymentStatus: PAYMENT_STATUS.SUCCESS,
    paymentMethod: methodLabel,
    cashCollected: false,
    paymentId,
    status: BOOKING_STATUS.COMPLETED,
    completedAt: booking.completedAt || now,
    paymentOtpAttempts: 0
  };
  if (razorpayPaymentId) set.razorpayPaymentId = razorpayPaymentId;

  let vendorEarning;
  let grandTotal;
  if (bill) {
    vendorEarning = Number(bill.vendorTotalEarning) || 0;
    grandTotal = payableAfterCoupon(booking, Number(bill.grandTotal) || 0);
    Object.assign(set, {
      basePrice: bill.originalServiceBase,
      tax: (bill.originalGST || 0) + (bill.vendorServiceGST || 0) + (bill.partsGST || 0),
      visitingCharges: bill.visitingCharges,
      finalAmount: grandTotal,
      userPayableAmount: grandTotal
    });
  } else {
    grandTotal = Number(booking.finalAmount) || 0;
    vendorEarning = parseFloat((grandTotal * FALLBACK_VENDOR_SHARE).toFixed(2));
  }

  const previous = {
    paymentStatus: booking.paymentStatus,
    paymentMethod: booking.paymentMethod,
    cashCollected: booking.cashCollected,
    status: booking.status,
    completedAt: booking.completedAt
  };

  const claimed = await Booking.findOneAndUpdate(
    {
      _id: booking._id,
      status: { $ne: BOOKING_STATUS.CANCELLED },
      cashCollected: { $ne: true },
      paymentStatus: { $nin: [PAYMENT_STATUS.SUCCESS, PAYMENT_STATUS.COLLECTED_BY_VENDOR] }
    },
    { $set: set, $unset: { paymentOtp: 1, customerConfirmationOTP: 1 } },
    { new: true }
  );

  if (!claimed) return { claimed: false };

  try {
    if (bill) {
      bill.status = 'paid';
      bill.paidAt = now;
      await bill.save();
    }

    if (claimed.vendorId) {
      await Vendor.findByIdAndUpdate(claimed.vendorId, { $inc: { 'wallet.earnings': vendorEarning } });
    }
  } catch (err) {
    // Revert the claim so the payment can be re-verified instead of being stuck half-settled.
    await Booking.updateOne({ _id: booking._id }, { $set: previous }).catch(revertErr =>
      console.error('[FinalizeOnline] CRITICAL: failed to revert claim for', String(booking._id), revertErr)
    );
    throw err;
  }

  // Non-critical bookkeeping: failures are logged but do not undo a settled payment.
  try {
    await Transaction.create({
      userId: claimed.userId,
      bookingId: claimed._id,
      amount: grandTotal,
      type: 'payment',
      paymentMethod: methodLabel,
      status: 'completed',
      description: description || `Online payment for booking #${claimed.bookingNumber}`,
      referenceId: paymentId,
      metadata: { source, razorpayPaymentId: razorpayPaymentId || undefined }
    });

    if (vendorEarning > 0 && claimed.vendorId) {
      await Transaction.create({
        vendorId: claimed.vendorId,
        bookingId: claimed._id,
        amount: vendorEarning,
        type: 'earnings_credit',
        paymentMethod: 'system',
        status: 'completed',
        description: `Earnings credited for online booking #${claimed.bookingNumber}`,
        metadata: { type: 'online_earning', billId: bill?._id?.toString() }
      });
    }
  } catch (txnErr) {
    console.error(`[FinalizeOnline] Transaction record failed for ${claimed.bookingNumber}:`, txnErr);
  }

  recordBookingEarning({
    date: now,
    totalRevenue: Number(grandTotal) || 0,
    platformCommission: Number(bill ? bill.companyRevenue : grandTotal * (1 - FALLBACK_VENDOR_SHARE)) || 0,
    vendorEarnings: Number(vendorEarning) || 0,
    totalGST: Number(bill ? bill.totalGST : 0) || 0,
    totalTDS: 0
  }).catch(err => console.error('[FinalizeOnline] Daily tracker failed:', err));

  try {
    const { processFirstBookingReferralReward } = require('../../services/referralService');
    processFirstBookingReferralReward(claimed._id).catch(refErr => console.error('[Referral Hook] Error:', refErr));
  } catch (hookErr) {
    console.warn('[Referral Hook] Warning:', hookErr.message);
  }

  return { claimed: true, booking: claimed };
};

/**
 * Verify Online Payment & Complete Job
 * POST /api/bookings/cash/:id/verify-online
 */
exports.verifyOnlinePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (!isAuthorizedForBooking(req, booking, { allowUser: true })) {
      return res.status(403).json(FORBIDDEN);
    }

    if (!booking.razorpayQrId) {
      return res.status(400).json({ success: false, message: 'No online payment initiated for this booking' });
    }

    // Already settled (online) - idempotent success
    if (booking.status === BOOKING_STATUS.COMPLETED && booking.paymentStatus === PAYMENT_STATUS.SUCCESS) {
      return res.status(200).json({ success: true, message: 'Payment already verified', status: 'completed' });
    }

    // Only allow if status is WORK_DONE or AWAITING_PAYMENT
    const allowedVerificationStatuses = [BOOKING_STATUS.WORK_DONE, BOOKING_STATUS.AWAITING_PAYMENT];
    if (!allowedVerificationStatuses.includes(booking.status)) {
      return res.status(400).json({ success: false, message: `Cannot verify payment for booking in ${booking.status} status` });
    }

    const qrRes = await getQRCodePayments(booking.razorpayQrId);
    const captured = (qrRes.success && qrRes.payments || []).filter(p => p.status === 'captured');

    if (captured.length === 0) {
      return res.status(200).json({
        success: false,
        message: 'Payment not yet detected by Razorpay',
        paymentStatus: 'pending'
      });
    }

    // The captured amount (paise) must cover the current bill; a QR for a stale/lower amount must not settle it.
    const VendorBill = require('../../models/VendorBill');
    const bill = await VendorBill.findOne({ bookingId: booking._id }).lean();
    const expectedPaise = Math.round((bill ? payableAfterCoupon(booking, Number(bill.grandTotal) || 0) : (Number(booking.finalAmount) || 0)) * 100);
    const capturedPayment = captured.find(p => Number(p.amount) >= expectedPaise);

    if (!capturedPayment) {
      console.warn(`[QR Verify] Amount mismatch for ${booking.bookingNumber}: expected ${expectedPaise} paise, got ${captured.map(p => p.amount).join(',')}`);
      return res.status(409).json({
        success: false,
        message: 'Paid amount does not match the current bill. Please generate a fresh QR or contact support.',
        paymentStatus: 'amount_mismatch'
      });
    }

    const result = await finalizeOnlinePayment(booking, {
      paymentId: capturedPayment.id,
      razorpayPaymentId: capturedPayment.id,
      methodLabel: 'Qr online',
      source: 'vendor_qr',
      description: `Online QR payment for booking #${booking.bookingNumber}`
    });

    if (!result.claimed) {
      // Someone else (webhook / cash / cancel) got there first
      const fresh = await Booking.findById(id).lean();
      const paidOnline = fresh?.paymentStatus === PAYMENT_STATUS.SUCCESS;

      // The customer's QR payment is real money: refund it unless it is the payment that settled the booking.
      const refund = await refundOrphanPayment(booking._id, capturedPayment.id, {
        amount: Number(capturedPayment.amount) ? Number(capturedPayment.amount) / 100 : undefined,
        reason: fresh?.status === BOOKING_STATUS.CANCELLED ? 'Booking was cancelled' : 'Booking already paid'
      });
      const settledByThisPayment = paidOnline && !refund.refunded;

      return res.status(settledByThisPayment ? 200 : 409).json({
        success: settledByThisPayment,
        refunded: !!refund.refunded,
        message: settledByThisPayment
          ? 'Payment already verified'
          : refund.refunded
            ? 'Booking was already settled or cancelled. The QR payment has been refunded to the customer.'
            : 'Booking was already settled or cancelled',
        status: fresh?.status
      });
    }

    emitPaymentCompleted(req, result.booking);

    return res.status(200).json({
      success: true,
      message: 'Payment verified and job completed',
      status: 'completed'
    });
  } catch (error) {
    console.error('Verify online payment error:', error);
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
};

/**
 * Manually Confirm Online Payment (For Manual QR Fallback)
 * POST /api/bookings/cash/:id/confirm-manual-online
 */
exports.confirmManualOnlinePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { otp } = req.body;

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (!isAuthorizedForBooking(req, booking)) {
      return res.status(403).json(FORBIDDEN);
    }

    if (booking.status === BOOKING_STATUS.COMPLETED) {
      return res.status(400).json({ success: false, message: 'Booking already completed' });
    }

    if (booking.status === BOOKING_STATUS.CANCELLED) {
      return res.status(400).json({ success: false, message: 'Cannot confirm payment for a cancelled booking' });
    }

    if (booking.cashCollected || booking.paymentStatus === PAYMENT_STATUS.COLLECTED_BY_VENDOR) {
      return res.status(400).json({ success: false, message: 'Cash has already been collected for this booking. Online payment not allowed.' });
    }

    // OTP Verification (mandatory for manual confirmation to prevent accidents)
    const otpError = await checkPaymentOtp(booking, otp, { requireOtp: true });
    if (otpError) {
      return res.status(otpError.status).json({ success: false, message: otpError.message });
    }

    console.log(`[Manual QR Confirm] Finalizing booking ${booking.bookingNumber} manually`);

    const result = await finalizeOnlinePayment(booking, {
      paymentId: `manual_conf_${Date.now()}`,
      methodLabel: 'Qr online',
      source: 'manual_vendor_confirm',
      description: `Manual confirmation of UPI QR payment for booking #${booking.bookingNumber}`
    });

    if (!result.claimed) {
      return res.status(409).json({ success: false, message: 'Booking was already settled or cancelled' });
    }

    emitPaymentCompleted(req, result.booking);

    return res.status(200).json({
      success: true,
      message: 'Payment confirmed manually and job completed',
      status: 'completed'
    });
  } catch (error) {
    console.error('Confirm manual online payment error:', error);
    res.status(500).json({ success: false, message: 'Manual confirmation failed' });
  }
};

/**
 * Get Cash / Payment Status
 * Read-only check for UI
 */
exports.getCashCollectionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (!isAuthorizedForBooking(req, booking, { allowUser: true })) {
      return res.status(403).json(FORBIDDEN);
    }

    const statusData = {
      bookingId: booking._id,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      paymentMethod: booking.paymentMethod,
      cashCollected: booking.cashCollected || false,
      isPaid: booking.paymentStatus === PAYMENT_STATUS.SUCCESS
    };

    if (booking.razorpayQrId && booking.paymentStatus === PAYMENT_STATUS.PENDING) {
      const qrRes = await getQRCodePaymentsThrottled(booking.razorpayQrId);
      if (qrRes.success && qrRes.payments && qrRes.payments.length > 0) {
        const captured = qrRes.payments.find(p => p.status === 'captured');
        if (captured) {
          statusData.paymentDetected = true;
          statusData.paymentId = captured.id;
        }
      }
    }

    res.status(200).json({
      success: true,
      data: statusData
    });

  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch status' });
  }
};
