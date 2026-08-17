const Coupon = require('../../models/Coupon');

/**
 * Validate and apply coupon code for cart
 * POST /api/user/coupons/apply
 */
const applyCoupon = async (req, res) => {
  try {
    const { code, cartAmount, cityId } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a coupon code'
      });
    }

    const coupon = await Coupon.findOne({
      code: code.trim().toUpperCase(),
      status: 'active'
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired coupon code'
      });
    }

    // Check expiry
    const now = new Date();
    if (coupon.validFrom && now < new Date(coupon.validFrom)) {
      return res.status(400).json({
        success: false,
        message: 'This coupon is not active yet'
      });
    }

    if (coupon.validUntil && now > new Date(coupon.validUntil)) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code has expired'
      });
    }

    // Check usage limits
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({
        success: false,
        message: 'Coupon limit reached'
      });
    }

    // Check minimum order value
    const amount = Number(cartAmount) || 0;
    if (amount < coupon.minOrderValue) {
      return res.status(400).json({
        success: false,
        message: `Minimum order value of ₹${coupon.minOrderValue} required for this coupon`
      });
    }

    // Check city restrictions if specified
    if (coupon.cityIds && coupon.cityIds.length > 0 && cityId) {
      const cityMatched = coupon.cityIds.some(id => id.toString() === cityId.toString());
      if (!cityMatched) {
        return res.status(400).json({
          success: false,
          message: 'Coupon is not valid in your selected city'
        });
      }
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = (amount * coupon.discountValue) / 100;
      if (coupon.maxDiscount !== null && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount;
      }
    } else {
      discountAmount = coupon.discountValue;
    }

    // Cap discount at total cart amount
    discountAmount = Math.min(discountAmount, amount);

    res.status(200).json({
      success: true,
      message: 'Coupon applied successfully',
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount: Math.round(discountAmount * 100) / 100,
        description: coupon.description
      }
    });
  } catch (error) {
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
    const { cityId } = req.query;
    const now = new Date();

    const query = {
      status: 'active',
      validFrom: { $lte: now },
      validUntil: { $gte: now }
    };

    if (cityId) {
      query.$or = [
        { cityIds: { $size: 0 } },
        { cityIds: cityId }
      ];
    }

    const coupons = await Coupon.find(query)
      .select('code description discountType discountValue maxDiscount minOrderValue validUntil')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      coupons
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
