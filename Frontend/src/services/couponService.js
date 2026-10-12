import api from './api';

export const couponService = {
  // Validates a code for the given pre-GST service subtotal and returns the discount it would give
  apply: async ({ code, cartAmount, city }) => {
    const response = await api.post('/users/coupons/apply', { code, cartAmount, city });
    return response.data;
  },
  // Coupons this customer can currently use (admin-configured validity, limits and city rules already applied)
  getAvailable: async ({ city } = {}) => {
    const response = await api.get('/users/coupons', { params: { city } });
    return response.data;
  }
};
