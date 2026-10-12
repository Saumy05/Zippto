const Booking = require('../../models/Booking');
const User = require('../../models/User');
const Vendor = require('../../models/Vendor');
const Service = require('../../models/UserService');
const Category = require('../../models/Category');
const Ticket = require('../../models/Ticket');
const Coupon = require('../../models/Coupon');
const { getCityScope, bookingScope, vendorScope, userScope } = require('../../utils/cityScope');

/**
 * Unified global search across admin resources
 * GET /api/admin/search?q=query
 */
const searchAdmin = async (req, res) => {
  try {
    const q = (req.query.q || req.query.query || '').trim().replace(/^#/, '');
    if (!q || q.length < 2) {
      return res.status(200).json({
        success: true,
        data: {
          bookings: [],
          users: [],
          vendors: [],
          services: [],
          tickets: [],
          coupons: []
        }
      });
    }

    const scope = await getCityScope(req);
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    // Let bookings be found by customer name/phone too
    const matchedUserIds = await User.find({
      ...userScope(scope),
      $or: [{ name: regex }, { phone: regex }]
    })
      .select('_id')
      .limit(25)
      .lean()
      .then((docs) => docs.map((d) => d._id))
      .catch(() => []);

    const [bookings, users, vendors, services, tickets, coupons] = await Promise.all([
      // Bookings search
      Booking.find({
        ...bookingScope(scope),
        $or: [
          { bookingNumber: regex },
          { serviceName: regex },
          ...(matchedUserIds.length ? [{ userId: { $in: matchedUserIds } }] : [])
        ]
      })
        .select('bookingNumber serviceName status scheduledDate totalAmount address createdAt')
        .populate('userId', 'name phone email')
        .populate('vendorId', 'name businessName phone')
        .sort({ createdAt: -1 })
        .limit(6)
        .lean()
        .catch(err => {
          console.warn('Booking search error:', err.message);
          return [];
        }),

      // Users search
      User.find({
        ...userScope(scope),
        $or: [
          { name: regex },
          { phone: regex },
          { email: regex }
        ]
      })
        .select('name phone email isActive profilePhoto addresses createdAt')
        .sort({ createdAt: -1 })
        .limit(6)
        .lean()
        .catch(err => {
          console.warn('User search error:', err.message);
          return [];
        }),

      // Vendors search
      Vendor.find({
        ...vendorScope(scope),
        $or: [
          { name: regex },
          { businessName: regex },
          { phone: regex },
          { email: regex }
        ]
      })
        .select('name businessName phone email approvalStatus isActive profilePhoto address createdAt')
        .sort({ createdAt: -1 })
        .limit(6)
        .lean()
        .catch(err => {
          console.warn('Vendor search error:', err.message);
          return [];
        }),

      // Services / Catalog search
      Service.find({
        title: regex
      })
        .select('title description iconUrl basePrice categoryId brandId status')
        .populate('categoryId', 'title')
        .populate('brandId', 'title')
        .limit(6)
        .lean()
        .catch(err => {
          console.warn('Service search error:', err.message);
          return [];
        }),

      // Support Tickets search
      Ticket.find({
        $or: [
          { ticketNumber: regex },
          { subject: regex }
        ]
      })
        .select('ticketNumber subject status priority category createdAt')
        .limit(5)
        .lean()
        .catch(err => {
          console.warn('Ticket search error:', err.message);
          return [];
        }),

      // Coupons search
      Coupon.find({
        $or: [
          { code: regex },
          { description: regex }
        ]
      })
        .select('code description discountType discountValue status validUntil')
        .limit(5)
        .lean()
        .catch(err => {
          console.warn('Coupon search error:', err.message);
          return [];
        })
    ]);

    res.status(200).json({
      success: true,
      data: {
        bookings,
        users,
        vendors,
        services,
        tickets,
        coupons
      }
    });
  } catch (error) {
    console.error('Admin global search error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute search',
      error: error.message
    });
  }
};

module.exports = {
  searchAdmin
};
