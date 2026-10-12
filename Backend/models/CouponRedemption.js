const mongoose = require('mongoose');

// One row per booking that used a coupon; powers the per-user limit and is released if the booking is cancelled.
const couponRedemptionSchema = new mongoose.Schema({
  couponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null, index: true },
  code: { type: String, required: true },
  discountAmount: { type: Number, required: true, min: 0 },
  released: { type: Boolean, default: false }
}, { timestamps: true });

couponRedemptionSchema.index({ couponId: 1, userId: 1, released: 1 });

module.exports = mongoose.model('CouponRedemption', couponRedemptionSchema);
