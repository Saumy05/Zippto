/**
 * Booking Escalation Service
 * Hands a booking over to the admin for manual partner assignment when no vendor
 * could be alerted for it (nobody matched the service category).
 */

const { BOOKING_STATUS } = require('../utils/constants');

const ADMIN_QUEUE_URL = '/admin/bookings?status=no_vendors';

/**
 * Mark a booking as needing manual assignment and alert the admin and the customer.
 * Safe to call from background tasks: it never throws.
 *
 * @param {Object} booking - Booking document (may have populated userId)
 * @param {string} reason - Human readable reason, shown to the admin
 */
const escalateBookingToAdmin = async (booking, reason = 'No matching partner found for this service') => {
  try {
    const { createNotification } = require('../controllers/notificationControllers/notificationController');
    const { getIO } = require('../sockets');
    let io = null;
    try { io = getIO(); } catch (e) { /* sockets not ready: DB notifications still go out */ }

    const bookingId = booking._id;
    const customerId = booking.userId?._id || booking.userId;
    const customerName = booking.customerName || booking.userId?.name || 'Customer';
    const customerPhone = booking.customerPhone || booking.userId?.phone;

    if (booking.status !== BOOKING_STATUS.NO_VENDORS) {
      booking.status = BOOKING_STATUS.NO_VENDORS;
      await booking.save();
    }

    // Persistent admin notification (opens the unassigned queue)
    await createNotification({
      type: 'booking_no_vendors',
      title: 'Booking Needs a Partner',
      message: `Booking #${booking.bookingNumber} (${booking.serviceName || 'Service'}) has no matching partner. Please assign one manually.`,
      relatedId: bookingId,
      relatedType: 'booking',
      actionUrl: ADMIN_QUEUE_URL,
      data: {
        bookingId,
        bookingNumber: booking.bookingNumber,
        customerName,
        customerPhone,
        serviceName: booking.serviceName,
        amount: booking.finalAmount,
        reason,
        actionRequired: 'MANUAL_ASSIGN'
      }
    });

    if (io) {
      // Live alert + list refresh for admins who have the panel open
      io.to('admin_notifications').emit('booking_timeout_admin', {
        bookingId,
        bookingNumber: booking.bookingNumber,
        serviceName: booking.serviceName,
        customerName,
        customerPhone,
        amount: booking.finalAmount,
        reason,
        actionRequired: 'MANUAL_ASSIGN',
        playSound: true,
        message: `Booking #${booking.bookingNumber} has no matching partner - needs manual assignment!`
      });

      if (customerId) {
        io.to(`user_${customerId}`).emit('booking_search_failed', {
          bookingId,
          assignedByAdmin: true,
          message: 'We are assigning the best available partner to your booking. You will be notified shortly.'
        });
      }
    }

    if (customerId) {
      await createNotification({
        userId: customerId,
        type: 'booking_assigning_partner',
        title: 'Finding Your Partner',
        message: `We are assigning a partner to booking ${booking.bookingNumber}. We will notify you once confirmed.`,
        relatedId: bookingId,
        relatedType: 'booking',
        pushData: {
          type: 'booking_assigning_partner',
          bookingId: String(bookingId),
          link: `/user/booking/${bookingId}`
        }
      });
    }
  } catch (error) {
    console.error('[BookingEscalation] Failed to escalate booking to admin:', error.message);
  }
};

module.exports = { escalateBookingToAdmin, ADMIN_QUEUE_URL };
