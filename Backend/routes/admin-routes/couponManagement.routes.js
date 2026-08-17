const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isAdmin } = require('../../middleware/roleMiddleware');
const {
  getAllCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon
} = require('../../controllers/adminControllers/couponManagementController');

router.use(authenticate, isAdmin);

router.get('/coupons', getAllCoupons);
router.post('/coupons', createCoupon);
router.put('/coupons/:id', updateCoupon);
router.delete('/coupons/:id', deleteCoupon);

module.exports = router;
