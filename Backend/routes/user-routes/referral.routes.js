const express = require('express');
const router = express.Router();
const referralController = require('../../controllers/userControllers/referralController');
const { protect } = require('../../middlewares/authMiddleware');

// All referral routes require authentication
router.use(protect);

router.get('/', referralController.getReferralInfo);
router.post('/apply', referralController.applyReferral);

module.exports = router;
