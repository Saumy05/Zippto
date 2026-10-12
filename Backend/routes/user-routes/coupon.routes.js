const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isUser } = require('../../middleware/roleMiddleware');
const { applyCoupon, getPublicCoupons } = require('../../controllers/userControllers/couponController');

// GET /api/users/coupons - Get list of available active coupons
router.get('/coupons', authenticate, isUser, getPublicCoupons);

// POST /api/users/coupons/apply - Validate and apply coupon
router.post('/coupons/apply', authenticate, isUser, applyCoupon);

module.exports = router;
