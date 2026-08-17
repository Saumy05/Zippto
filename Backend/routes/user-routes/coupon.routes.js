const express = require('express');
const router = express.Router();
const { applyCoupon, getPublicCoupons } = require('../../controllers/userControllers/couponController');

// GET /api/users/coupons - Get list of available active coupons
router.get('/coupons', getPublicCoupons);

// POST /api/users/coupons/apply - Validate and apply coupon
router.post('/coupons/apply', applyCoupon);

module.exports = router;
