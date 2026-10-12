const Booking = require('../models/Booking');
const Transaction = require('../models/Transaction');
const { refundPayment } = require('./razorpayService');

/**
 * Refund a captured Razorpay payment that could not be applied to its booking
 * (booking already settled by cash / another payment, or cancelled).
 *
 * - Never refunds the payment that actually settled the booking (duplicate webhook deliveries).
 * - Idempotent: the payment id is claimed atomically on the booking before the refund is attempted,
 *   and released again if Razorpay rejects the refund so it can be retried.
 *
 * @param {string|ObjectId} bookingId
 * @param {string} razorpayPaymentId
 * @param {object} [opts]
 * @param {number} [opts.amount]  amount in INR (full refund if omitted)
 * @param {string} [opts.reason]
 * @returns {Promise<{refunded: boolean, skipped?: string, error?: string}>}
 */
const refundOrphanPayment = async (bookingId, razorpayPaymentId, { amount, reason = 'Booking already settled or cancelled' } = {}) => {
  if (!bookingId || !razorpayPaymentId) return { refunded: false, skipped: 'missing ids' };

  try {
    const booking = await Booking.findById(bookingId).select('userId bookingNumber razorpayPaymentId paymentId').lean();
    if (!booking) return { refunded: false, skipped: 'booking not found' };

    // This payment is the one that settled the booking -> nothing to refund.
    if (booking.razorpayPaymentId === razorpayPaymentId || booking.paymentId === razorpayPaymentId) {
      return { refunded: false, skipped: 'payment is the settling payment' };
    }

    // Atomic claim (idempotency)
    const claim = await Booking.updateOne(
      { _id: bookingId, orphanRefundedPayments: { $ne: razorpayPaymentId } },
      { $addToSet: { orphanRefundedPayments: razorpayPaymentId } }
    );
    if (claim.modifiedCount === 0) return { refunded: false, skipped: 'already refunded' };

    const result = await refundPayment(razorpayPaymentId, amount || null, {
      reason,
      bookingId: String(bookingId),
      bookingNumber: booking.bookingNumber
    });

    if (!result.success) {
      // Release the claim so a later retry (or a duplicate webhook delivery) can try again
      await Booking.updateOne({ _id: bookingId }, { $pull: { orphanRefundedPayments: razorpayPaymentId } });
      console.error(`[OrphanRefund] CRITICAL: refund failed for payment ${razorpayPaymentId} (booking ${booking.bookingNumber}): ${result.error}`);
      return { refunded: false, error: result.error };
    }

    try {
      await Transaction.create({
        userId: booking.userId,
        bookingId,
        amount: amount || (result.refund?.amount ? result.refund.amount / 100 : 0),
        type: 'refund',
        paymentMethod: 'razorpay',
        status: 'completed',
        description: `Auto-refund for booking #${booking.bookingNumber}: ${reason}`,
        referenceId: razorpayPaymentId,
        metadata: { source: 'orphan_payment_auto_refund', refundId: result.refund?.id }
      });
    } catch (txnErr) {
      console.error('[OrphanRefund] Transaction record failed:', txnErr);
    }

    try {
      const { createNotification } = require('../controllers/notificationControllers/notificationController');
      await createNotification({
        userId: booking.userId,
        type: 'payment_refund',
        title: 'Payment Refunded',
        message: `Your payment for booking #${booking.bookingNumber} could not be applied (${reason.toLowerCase()}) and has been refunded. It will reach your account in 5-7 working days.`,
        relatedId: bookingId,
        relatedType: 'payment',
        priority: 'high'
      });
    } catch (notifyErr) {
      console.error('[OrphanRefund] Notification failed:', notifyErr.message);
    }

    console.log(`[OrphanRefund] Refunded payment ${razorpayPaymentId} for booking ${booking.bookingNumber}`);
    return { refunded: true };
  } catch (err) {
    console.error('[OrphanRefund] Unexpected error:', err);
    return { refunded: false, error: err.message };
  }
};

module.exports = { refundOrphanPayment };
