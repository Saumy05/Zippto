const express = require('express');
const router = express.Router();
const referralController = require('../../controllers/userControllers/referralController');
const { authenticate } = require('../../middleware/authMiddleware');

// All referral routes require authentication
router.use(authenticate);

router.get('/', referralController.getReferralInfo);
router.post('/apply', referralController.applyReferral);

module.exports = router;
