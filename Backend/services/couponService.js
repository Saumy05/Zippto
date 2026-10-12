const Coupon = require('../models/Coupon');
const CouponRedemption = require('../models/CouponRedemption');
const City = require('../models/City');

class CouponError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * Validates a coupon for a user/order and returns { coupon, discountAmount }.
 * Throws CouponError with a customer-facing message when the coupon cannot be used.
 * `amount` is the pre-GST service subtotal the coupon is evaluated against.
 */
const validateCoupon = async ({ code, amount, userId, cityId, cityName }) => {
  if (!code || !String(code).trim()) throw new CouponError('Please provide a coupon code');

  const coupon = await Coupon.findOne({ code: String(code).trim().toUpperCase(), status: 'active' });
  if (!coupon) throw new CouponError('Invalid or expired coupon code', 404);

  const now = new Date();
  if (coupon.validFrom && now < new Date(coupon.validFrom)) throw new CouponError('This coupon is not active yet');
  if (coupon.validUntil && now > new Date(coupon.validUntil)) throw new CouponError('Coupon code has expired');
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) throw new CouponError('Coupon limit reached');

  const orderAmount = Number(amount) || 0;
  if (orderAmount <= 0) throw new CouponError('Coupon cannot be applied to this order');
  if (orderAmount < coupon.minOrderValue) {
    throw new CouponError(`Minimum order value of ₹${coupon.minOrderValue} required for this coupon`);
  }

  if (coupon.cityIds?.length > 0) {
    let resolvedCityId = cityId;
    if (!resolvedCityId && cityName) {
      const city = await City.findOne({ name: new RegExp(`^${String(cityName).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }).select('_id').lean();
      resolvedCityId = city?._id;
    }
    // A city-restricted coupon is only valid when we can positively match the user's city
    if (!resolvedCityId || !coupon.cityIds.some((id) => id.toString() === resolvedCityId.toString())) {
      throw new CouponError('Coupon is not valid in your selected city');
    }
  }

  if (userId) {
    const used = await CouponRedemption.countDocuments({ couponId: coupon._id, userId, released: false });
    if (used >= (coupon.perUserLimit || 1)) throw new CouponError('You have already used this coupon');
  }

  let discountAmount = coupon.discountType === 'percentage'
    ? (orderAmount * coupon.discountValue) / 100
    : coupon.discountValue;
  if (coupon.discountType === 'percentage' && coupon.maxDiscount !== null && discountAmount > coupon.maxDiscount) {
    discountAmount = coupon.maxDiscount;
  }
  discountAmount = Math.round(Math.min(discountAmount, orderAmount) * 100) / 100;

  return { coupon, discountAmount };
};

/** Atomically takes one use of the coupon; false if the usage limit was hit in the meantime. */
const claimCoupon = async (couponId) => {
  const claimed = await Coupon.findOneAndUpdate(
    { _id: couponId, $or: [{ usageLimit: null }, { $expr: { $lt: ['$usedCount', '$usageLimit'] } }] },
    { $inc: { usedCount: 1 } },
    { new: true }
  );
  return !!claimed;
};

const releaseCouponClaim = async (couponId) => {
  await Coupon.updateOne({ _id: couponId, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } });
};

/** Gives the coupon use back (booking cancelled / failed). Safe to call more than once. */
const releaseRedemptionForBooking = async (bookingId) => {
  const redemption = await CouponRedemption.findOneAndUpdate(
    { bookingId, released: false },
    { $set: { released: true } }
  );
  if (redemption) await releaseCouponClaim(redemption.couponId);
};

/**
 * Amount the customer actually pays for a bill: bill total minus the coupon that was applied at booking.
 * Never below ₹1, because every payment flow rejects a zero amount.
 */
const payableAfterCoupon = (booking, billTotal) => {
  const total = Number(billTotal) || 0;
  const discount = Number(booking?.couponDiscount) || 0;
  if (discount <= 0) return total;
  return Math.max(Math.min(1, total), Math.round((total - discount) * 100) / 100);
};

module.exports = {
  payableAfterCoupon, CouponError, validateCoupon, claimCoupon, releaseCouponClaim, releaseRedemptionForBooking };
