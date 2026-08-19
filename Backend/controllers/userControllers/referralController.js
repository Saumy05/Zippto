const referralService = require('../../services/referralService');

/**
 * Get logged in user's referral code, link, earnings, and invited friends
 * GET /api/users/referral
 */
const getReferralInfo = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const data = await referralService.getReferralDashboard(userId);
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Get referral info error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch referral details'
    });
  }
};

/**
 * Apply a referral code for the logged in user
 * POST /api/users/referral/apply
 */
const applyReferral = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { referralCode } = req.body;

    const result = await referralService.applyReferralCode(userId, referralCode);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Apply referral error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to apply referral code'
    });
  }
};

module.exports = {
  getReferralInfo,
  applyReferral
};
