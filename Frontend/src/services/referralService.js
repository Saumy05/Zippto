import api from './api';

export const referralService = {
  /**
   * Get user referral details, code, link, stats, and invited friends
   */
  getReferralInfo: async () => {
    const response = await api.get('/users/referral');
    return response.data;
  },

  /**
   * Apply a friend's referral code
   */
  applyReferralCode: async (referralCode) => {
    const response = await api.post('/users/referral/apply', { referralCode });
    return response.data;
  }
};

export default referralService;
