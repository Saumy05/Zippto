const mongoose = require('mongoose');
const Coupon = require('../../models/Coupon');
const CouponRedemption = require('../../models/CouponRedemption');
const City = require('../../models/City');
const { validateCoupon, CouponError } = require('../../services/couponService');

/**
 * Validate and apply coupon code for cart
 * POST /api/user/coupons/apply
 */
const applyCoupon = async (req, res) => {
  try {
    const { code, cartAmount, cityId, city } = req.body;
    const { coupon, discountAmount } = await validateCoupon({
      code,
      amount: cartAmount,
      userId: req.user.id,
      cityId,
      cityName: city
    });

    res.status(200).json({
      success: true,
      message: 'Coupon applied successfully',
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount,
        description: coupon.description
      }
    });
  } catch (error) {
    if (error instanceof CouponError) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    console.error('Apply coupon error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to apply coupon. Please try again.'
    });
  }
};

/**
 * Get available public coupons
 * GET /api/user/coupons
 */
const getPublicCoupons = async (req, res) => {
  try {
    const { cityId, city } = req.query;
    const now = new Date();

    // Only coupons that are currently live per the admin's configuration
    const coupons = await Coupon.find({
      status: 'active',
      validFrom: { $lte: now },
      validUntil: { $gte: now }
    })
      .select('code description discountType discountValue maxDiscount minOrderValue validUntil usageLimit usedCount perUserLimit cityIds')
      .sort({ createdAt: -1 })
      .lean();

    // Resolve the customer's city once; city-restricted coupons are hidden unless it matches
    let resolvedCityId = cityId;
    if (!resolvedCityId && city) {
      const found = await City.findOne({ name: new RegExp(`^${String(city).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }).select('_id').lean();
      resolvedCityId = found?._id;
    }

    // How many times this customer already used each coupon
    const usage = await CouponRedemption.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.user.id), released: false, couponId: { $in: coupons.map((c) => c._id) } } },
      { $group: { _id: '$couponId', count: { $sum: 1 } } }
    ]);
    const usedByUser = new Map(usage.map((u) => [String(u._id), u.count]));

    const available = coupons
      .filter((c) => c.usageLimit === null || c.usageLimit === undefined || c.usedCount < c.usageLimit)
      .filter((c) => (usedByUser.get(String(c._id)) || 0) < (c.perUserLimit || 1))
      .filter((c) => !c.cityIds?.length || (resolvedCityId && c.cityIds.some((id) => String(id) === String(resolvedCityId))))
      .map(({ usageLimit, usedCount, perUserLimit, cityIds, ...publicFields }) => publicFields);

    res.status(200).json({
      success: true,
      coupons: available
    });
  } catch (error) {
    console.error('Get public coupons error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch coupons.'
    });
  }
};

module.exports = {
  applyCoupon,
  getPublicCoupons
};
