const Booking = require('../../models/Booking');
const { validationResult } = require('express-validator');
const { BOOKING_STATUS } = require('../../utils/constants');
const { releaseRedemptionForBooking } = require('../../services/couponService');
const { getInvoiceForBooking, InvoiceError } = require('../../services/invoiceService');
const { getCityScope, bookingScope, vendorScope, bookingInScope, vendorInScope } = require('../../utils/cityScope');

/**
 * Get all bookings with filters and search
 */
const getAllBookings = async (req, res) => {
  try {
    const {
      status,
      paymentStatus,
      userId,
      vendorId,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 20
    } = req.query;

    // Build query (city-scoped admins only see bookings from their city)
    const scope = await getCityScope(req);
    const query = { ...bookingScope(scope) };

    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (userId) query.userId = userId;
    if (vendorId) query.vendorId = vendorId;

    if (startDate || endDate) {
      query.scheduledDate = {};
      if (startDate) query.scheduledDate.$gte = new Date(startDate);
      if (endDate) query.scheduledDate.$lte = new Date(endDate);
    }

    // Search by booking number or service name
    if (search) {
      query.$or = [
        { bookingNumber: { $regex: search, $options: 'i' } },
        { serviceName: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get bookings
    const bookings = await Booking.find(query)
      .populate('userId', 'name phone email')
      .populate('vendorId', 'name businessName phone')
      .populate('serviceId', 'title iconUrl')
      .populate('categoryId', 'title slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await Booking.countDocuments(query);

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
    console.error('Get all bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings. Please try again.'
    });
  }
};

/**
 * Get booking details by ID
 */
const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id)
      .populate('userId', 'name phone email addresses')
      .populate('vendorId', 'name businessName phone email address')
      .populate('serviceId', 'title description iconUrl images')
      .populate('categoryId', 'title slug');

    if (!booking || !bookingInScope(await getCityScope(req), booking)) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking. Please try again.'
    });
  }
};

/**
 * Cancel booking (admin)
 */
const cancelBooking = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { cancellationReason } = req.body;

    const booking = await Booking.findById(id);

    if (!booking || !bookingInScope(await getCityScope(req), booking)) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.status === BOOKING_STATUS.CANCELLED) {
      return res.status(400).json({
        success: false,
        message: 'Booking is already cancelled'
      });
    }

    if (booking.status === BOOKING_STATUS.COMPLETED) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel completed booking'
      });
    }

    // Update booking
    booking.status = BOOKING_STATUS.CANCELLED;
    booking.cancelledAt = new Date();
    booking.cancelledBy = 'admin';
    booking.cancellationReason = cancellationReason || 'Cancelled by admin';

    await booking.save();
    if (booking.couponCode) await releaseRedemptionForBooking(booking._id).catch((e) => console.error('[AdminCancel] Coupon release failed:', e.message));

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      data: booking
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel booking. Please try again.'
    });
  }
};

/**
 * Get booking analytics
 */
const getBookingAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Build date filter (also restricted to the admin's city when scoped)
    const dateFilter = { ...bookingScope(await getCityScope(req)) };
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    // Total bookings
    const totalBookings = await Booking.countDocuments(dateFilter);

    // Bookings by status
    const bookingsByStatus = await Booking.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Bookings by payment status
    const bookingsByPaymentStatus = await Booking.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$paymentStatus',
          count: { $sum: 1 },
          totalAmount: { $sum: '$finalAmount' }
        }
      }
    ]);

    // Revenue analytics
    const revenueStats = await Booking.aggregate([
      {
        $match: {
          ...dateFilter,
          paymentStatus: 'success'
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$finalAmount' },
          totalBookings: { $sum: 1 },
          averageBookingValue: { $avg: '$finalAmount' }
        }
      }
    ]);

    // Daily bookings trend (last 30 days)
    const dailyTrend = await Booking.aggregate([
      {
        $match: {
          ...dateFilter,
          createdAt: {
            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 },
          revenue: { $sum: '$finalAmount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalBookings,
        bookingsByStatus: bookingsByStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        bookingsByPaymentStatus: bookingsByPaymentStatus.reduce((acc, item) => {
          acc[item._id] = {
            count: item.count,
            totalAmount: item.totalAmount
          };
          return acc;
        }, {}),
        revenue: revenueStats[0] || {
          totalRevenue: 0,
          totalBookings: 0,
          averageBookingValue: 0
        },
        dailyTrend
      }
    });
  } catch (error) {
    console.error('Get booking analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics. Please try again.'
    });
  }
};

// Booking states from which an admin may (re)assign a partner
const ASSIGNABLE_STATUSES = [
  BOOKING_STATUS.SEARCHING,
  BOOKING_STATUS.REQUESTED,
  BOOKING_STATUS.PENDING,
  BOOKING_STATUS.NO_VENDORS,
  BOOKING_STATUS.UNASSIGNED,
  BOOKING_STATUS.REJECTED
];

const normalizeToken = (v) => String(v || '').trim().toLowerCase();
const slugifyToken = (v) => normalizeToken(v).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/**
 * Whether the vendor offers the booking's service category (title / slug / id).
 * Vendors store categories in `service` and `categories`; `skills` holds brand slugs.
 */
const vendorMatchesBookingCategory = (vendor, booking) => {
  const cat = booking.categoryId && typeof booking.categoryId === 'object' ? booking.categoryId : null;
  const bookingTokens = new Set();
  [booking.serviceCategory, cat?.title, cat?.slug, cat?._id, !cat ? booking.categoryId : null]
    .filter(Boolean)
    .forEach((t) => {
      bookingTokens.add(normalizeToken(t));
      bookingTokens.add(slugifyToken(t));
    });
  bookingTokens.delete('');
  if (bookingTokens.size === 0) return false;

  const vendorTokens = [vendor.service, vendor.categories, vendor.skills]
    .flatMap((v) => (Array.isArray(v) ? v : [v]))
    .filter(Boolean)
    .flatMap((t) => [normalizeToken(t), slugifyToken(t)])
    .filter(Boolean);

  return vendorTokens.some((vt) =>
    [...bookingTokens].some((bt) => vt === bt || (bt.length >= 4 && vt.length >= 4 && (vt.includes(bt) || bt.includes(vt))))
  );
};

/**
 * Hard limits an admin cannot override. Returns a reason string, or null when assignable.
 */
const getVendorAssignBlockReason = (vendor, booking) => {
  if (!['approved', 'APPROVED'].includes(vendor.approvalStatus)) return 'Partner is not approved';
  if (vendor.isActive === false) return 'Partner account is inactive';
  if (vendor.wallet?.isBlocked) return 'Partner wallet is blocked';
  if (booking.paymentMethod === 'cash') {
    const dues = vendor.wallet?.dues || 0;
    const limit = vendor.wallet?.cashLimit ?? 10000;
    if (dues > limit) return 'Partner has exceeded the cash limit';
  }
  return null;
};

/**
 * Get available matching vendors for manual assignment
 * GET /api/admin/bookings/:id/available-vendors
 */
const getAvailableVendorsForBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { search } = req.query;
    const Vendor = require('../../models/Vendor');

    const booking = await Booking.findById(id)
      .populate('categoryId', 'title slug')
      .populate('serviceId', 'title')
      .lean();

    const scope = await getCityScope(req);
    if (!booking || !bookingInScope(scope, booking)) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const query = {
      approvalStatus: { $in: ['approved', 'APPROVED'] },
      ...vendorScope(scope)
    };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { businessName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    // No arbitrary cap before scoring: otherwise category-matching vendors can be cut off
    const allVendors = await Vendor.find(query)
      .select('name businessName phone profilePhoto isOnline availability service categories skills rating totalJobs address approvalStatus isActive wallet.isBlocked wallet.dues wallet.cashLimit')
      .limit(300)
      .lean();

    const scoredVendors = allVendors.map(v => {
      const blockReason = getVendorAssignBlockReason(v, booking);
      return {
        id: v._id.toString(),
        name: v.name || v.businessName || 'Partner',
        businessName: v.businessName || '',
        phone: v.phone || '',
        profilePhoto: v.profilePhoto || null,
        isOnline: Boolean(v.isOnline),
        availability: v.availability || 'AVAILABLE',
        rating: v.rating || 0,
        totalJobs: v.totalJobs || 0,
        city: (typeof v.address === 'object' ? v.address?.city : v.address) || '',
        matchesCategory: vendorMatchesBookingCategory(v, booking),
        canAssign: !blockReason,
        blockReason
      };
    });

    // Assignable first, then matching category, then online, then rating
    scoredVendors.sort((a, b) => {
      if (a.canAssign !== b.canAssign) return a.canAssign ? -1 : 1;
      if (a.matchesCategory !== b.matchesCategory) return a.matchesCategory ? -1 : 1;
      if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
      return (b.rating || 0) - (a.rating || 0);
    });

    res.status(200).json({
      success: true,
      booking: {
        id: booking._id,
        bookingNumber: booking.bookingNumber,
        serviceName: booking.serviceName || booking.serviceId?.title,
        serviceCategory: booking.serviceCategory || booking.categoryId?.title,
        status: booking.status,
        finalAmount: booking.finalAmount,
        customerName: booking.customerName,
        customerPhone: booking.customerPhone,
        address: booking.address
      },
      vendors: scoredVendors
    });
  } catch (error) {
    console.error('Get available vendors error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch available vendors' });
  }
};

/**
 * Manually assign vendor to booking
 * POST /api/admin/bookings/:id/assign-vendor
 */
const assignVendorToBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { vendorId, notes, confirmMismatch } = req.body;
    const Vendor = require('../../models/Vendor');
    const BookingRequest = require('../../models/BookingRequest');
    const { createNotification } = require('../notificationControllers/notificationController');
    const { getIO } = require('../../sockets');

    if (!vendorId) {
      return res.status(400).json({ success: false, message: 'Vendor ID is required' });
    }

    const [existingBooking, vendor] = await Promise.all([
      Booking.findById(id).populate('categoryId', 'title slug'),
      Vendor.findById(vendorId)
    ]);

    const scope = await getCityScope(req);
    if (!existingBooking || !bookingInScope(scope, existingBooking)) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (!vendor || !vendorInScope(scope, vendor)) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    if (!ASSIGNABLE_STATUSES.includes(existingBooking.status)) {
      return res.status(400).json({
        success: false,
        code: 'BOOKING_NOT_ASSIGNABLE',
        message: `Booking is already ${String(existingBooking.status).replace(/_/g, ' ')} and cannot be assigned.`
      });
    }

    // Hard limits: the admin cannot override these
    const blockReason = getVendorAssignBlockReason(vendor, existingBooking);
    if (blockReason) {
      return res.status(400).json({ success: false, code: 'VENDOR_NOT_ASSIGNABLE', message: blockReason });
    }

    // Soft limit: category mismatch needs an explicit confirmation from the admin
    if (!confirmMismatch && !vendorMatchesBookingCategory(vendor, existingBooking)) {
      return res.status(409).json({
        success: false,
        code: 'CATEGORY_MISMATCH',
        message: `${vendor.name || vendor.businessName || 'This partner'} does not offer "${existingBooking.serviceCategory || existingBooking.categoryId?.title || 'this service'}". Assign anyway?`
      });
    }

    const previouslyNotified = (existingBooking.notifiedVendors || []).map(String);
    const assignedAt = new Date();

    // Atomic: only one assignment wins if the vendor accepts at the same moment
    const booking = await Booking.findOneAndUpdate(
      { _id: id, status: { $in: ASSIGNABLE_STATUSES } },
      {
        $set: {
          vendorId: vendor._id,
          status: BOOKING_STATUS.ACCEPTED,
          assignedBy: 'admin',
          assignedAt,
          acceptedAt: assignedAt,
          cancelledAt: null,
          cancelledBy: null,
          cancellationReason: null,
          ...(notes ? { adminNotes: notes } : {})
        }
      },
      { new: true }
    );

    if (!booking) {
      return res.status(409).json({
        success: false,
        code: 'BOOKING_NOT_ASSIGNABLE',
        message: 'This booking was just taken by another partner or changed. Please refresh.'
      });
    }

    // Create or update BookingRequest as ACCEPTED, and close every other open request
    await Promise.all([
      BookingRequest.findOneAndUpdate(
        { bookingId: booking._id, vendorId: vendor._id },
        { status: 'ACCEPTED', respondedAt: assignedAt },
        { upsert: true, new: true }
      ),
      BookingRequest.updateMany(
        { bookingId: booking._id, vendorId: { $ne: vendor._id }, status: { $in: ['PENDING', 'VIEWED'] } },
        { status: 'EXPIRED', respondedAt: assignedAt }
      ),
      // Same as a normal vendor accept: the partner is now on this job
      Vendor.findByIdAndUpdate(vendor._id, { availability: 'ON_JOB' })
    ]);

    const io = getIO();

    // Remove the alert from other partners who were notified for this booking
    if (io) {
      previouslyNotified
        .filter((vId) => vId !== vendor._id.toString())
        .forEach((vId) => {
          io.to(`vendor_${vId}`).emit('booking_taken', {
            bookingId: booking._id.toString(),
            message: 'This job has been assigned to another partner.'
          });
        });
    }

    // 1. Notify Assigned Vendor (Socket + Push + DB)
    if (io) {
      io.to(`vendor_${vendor._id.toString()}`).emit('new_booking_assigned', {
        bookingId: booking._id,
        bookingNumber: booking.bookingNumber,
        serviceName: booking.serviceName,
        customerName: booking.customerName,
        customerPhone: booking.customerPhone,
        address: booking.address,
        scheduledDate: booking.scheduledDate,
        scheduledTime: booking.scheduledTime,
        price: booking.finalAmount,
        assignedBy: 'admin',
        playSound: true,
        message: `Admin assigned Booking #${booking.bookingNumber} to you!`
      });
      io.to(`vendor_${vendor._id.toString()}`).emit('booking_status_updated', {
        bookingId: booking._id,
        status: BOOKING_STATUS.ACCEPTED
      });
    }

    await createNotification({
      vendorId: vendor._id,
      type: 'booking_assigned_by_admin',
      title: 'New Booking Assigned by Admin',
      message: `You have been manually assigned to Booking #${booking.bookingNumber} (${booking.serviceName || 'Home Service'}).`,
      relatedId: booking._id,
      relatedType: 'booking',
      data: {
        bookingId: booking._id,
        bookingNumber: booking.bookingNumber,
        customerName: booking.customerName,
        address: booking.address,
        amount: booking.finalAmount
      },
      pushData: {
        type: 'booking_assigned',
        bookingId: booking._id.toString(),
        link: `/vendor/bookings/${booking._id}`
      }
    });

    // 2. Notify Customer (Socket + Push + DB)
    if (io) {
      io.to(`user_${booking.userId.toString()}`).emit('booking_accepted', {
        bookingId: booking._id,
        vendor: {
          id: vendor._id,
          name: vendor.name || vendor.businessName,
          phone: vendor.phone,
          profilePhoto: vendor.profilePhoto,
          rating: vendor.rating || 4.8
        },
        message: `${vendor.name || 'Service Partner'} has been assigned to your booking!`
      });
      io.to(`user_${booking.userId.toString()}`).emit('booking_status_updated', {
        bookingId: booking._id,
        status: BOOKING_STATUS.ACCEPTED
      });
    }

    await createNotification({
      userId: booking.userId,
      type: 'booking_accepted',
      title: 'Partner Assigned!',
      message: `${vendor.name || vendor.businessName || 'A specialized partner'} has been assigned to your booking #${booking.bookingNumber}.`,
      relatedId: booking._id,
      relatedType: 'booking',
      data: {
        bookingId: booking._id,
        vendorId: vendor._id,
        vendorName: vendor.name || vendor.businessName,
        vendorPhone: vendor.phone
      },
      pushData: {
        type: 'booking_accepted',
        bookingId: booking._id.toString(),
        link: `/user/booking/${booking._id}`
      }
    });

    // 3. Broadcast update to Admin room
    if (io) {
      io.to('admin_notifications').emit('booking_status_updated', {
        bookingId: booking._id,
        bookingNumber: booking.bookingNumber,
        status: BOOKING_STATUS.ACCEPTED,
        vendorName: vendor.name || vendor.businessName
      });
    }

    res.status(200).json({
      success: true,
      message: `Booking #${booking.bookingNumber} successfully assigned to ${vendor.name || vendor.businessName}`,
      data: {
        bookingId: booking._id,
        bookingNumber: booking.bookingNumber,
        vendorId: vendor._id,
        vendorName: vendor.name || vendor.businessName,
        status: booking.status
      }
    });
  } catch (error) {
    console.error('Assign vendor error:', error);
    res.status(500).json({ success: false, message: 'Failed to assign vendor. Please try again.' });
  }
};

/**
 * Tax invoice for any paid booking (admin)
 * GET /api/admin/bookings/:id/invoice
 */
const getBookingInvoice = async (req, res) => {
  try {
    const scope = await getCityScope(req);
    if (scope) {
      const target = await Booking.findById(req.params.id).select('address');
      if (!target || !bookingInScope(scope, target)) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
      }
    }
    const invoice = await getInvoiceForBooking(req.params.id);
    res.status(200).json({ success: true, data: invoice });
  } catch (error) {
    if (error instanceof InvoiceError) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    console.error('Admin get invoice error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate invoice' });
  }
};

module.exports = {
  getBookingInvoice,
  getAllBookings,
  getBookingById,
  cancelBooking,
  getBookingAnalytics,
  getAvailableVendorsForBooking,
  assignVendorToBooking
};


