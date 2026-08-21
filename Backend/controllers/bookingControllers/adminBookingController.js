const Booking = require('../../models/Booking');
const { validationResult } = require('express-validator');
const { BOOKING_STATUS } = require('../../utils/constants');

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

    // Build query
    const query = {};

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

    if (!booking) {
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

    if (!booking) {
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

    // Build date filter
    const dateFilter = {};
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

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const query = {
      isApproved: true,
      status: { $ne: 'SUSPENDED' }
    };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { businessName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const allVendors = await Vendor.find(query)
      .select('name businessName phone profilePhoto isOnline availability serviceCategory service skills rating totalJobs city address')
      .sort({ isOnline: -1, rating: -1 })
      .limit(30)
      .lean();

    // Score/sort vendors: matching category first, then online
    const targetCat = (booking.serviceCategory || booking.categoryId?.slug || booking.categoryId?.title || '').toLowerCase();

    const scoredVendors = allVendors.map(v => {
      let matchesCategory = false;
      const vCats = [
        ...(Array.isArray(v.serviceCategory) ? v.serviceCategory : [v.serviceCategory]),
        ...(Array.isArray(v.service) ? v.service : [v.service]),
        ...(Array.isArray(v.skills) ? v.skills : [v.skills])
      ].filter(Boolean).map(s => String(s).toLowerCase());

      if (targetCat && vCats.some(c => c.includes(targetCat) || targetCat.includes(c))) {
        matchesCategory = true;
      }

      return {
        id: v._id.toString(),
        name: v.name || v.businessName || 'Partner',
        businessName: v.businessName || '',
        phone: v.phone || '',
        profilePhoto: v.profilePhoto || null,
        isOnline: Boolean(v.isOnline),
        availability: v.availability || 'AVAILABLE',
        rating: v.rating || 4.8,
        totalJobs: v.totalJobs || 0,
        city: v.city || (typeof v.address === 'object' ? v.address?.city : v.address) || '',
        matchesCategory
      };
    });

    // Sort: matching category first, then online
    scoredVendors.sort((a, b) => {
      if (a.matchesCategory && !b.matchesCategory) return -1;
      if (!a.matchesCategory && b.matchesCategory) return 1;
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
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
    const { vendorId, notes } = req.body;
    const Vendor = require('../../models/Vendor');
    const BookingRequest = require('../../models/BookingRequest');
    const { createNotification } = require('../notificationControllers/notificationController');
    const { getIO } = require('../../sockets');

    if (!vendorId) {
      return res.status(400).json({ success: false, message: 'Vendor ID is required' });
    }

    const [booking, vendor] = await Promise.all([
      Booking.findById(id),
      Vendor.findById(vendorId)
    ]);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    // Generate visit verification OTP if not present
    if (!booking.verificationCode) {
      booking.verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
    }

    // Assign Vendor & Accept Booking
    booking.vendorId = vendor._id;
    booking.status = BOOKING_STATUS.ACCEPTED;
    booking.assignedBy = 'admin';
    booking.assignedAt = new Date();
    booking.acceptedAt = new Date();
    if (notes) {
      booking.adminNotes = notes;
    }

    await booking.save();

    // Create or update BookingRequest as ACCEPTED
    await BookingRequest.findOneAndUpdate(
      { bookingId: booking._id, vendorId: vendor._id },
      {
        status: 'ACCEPTED',
        respondedAt: new Date(),
        acceptedAt: new Date()
      },
      { upsert: true, new: true }
    );

    const io = getIO();

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

module.exports = {
  getAllBookings,
  getBookingById,
  cancelBooking,
  getBookingAnalytics,
  getAvailableVendorsForBooking,
  assignVendorToBooking
};


