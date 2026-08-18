import api from './api';

export const adminBookingService = {
  // Get all bookings with filters and search
  getAllBookings: async (params) => {
    try {
      const response = await api.get('/admin/bookings', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch bookings' };
    }
  },

  // Get booking details by ID
  getBookingById: async (id) => {
    try {
      const response = await api.get(`/admin/bookings/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch booking details' };
    }
  },

  // Get available matching vendors for manual assignment
  getAvailableVendors: async (bookingId, params = {}) => {
    try {
      const response = await api.get(`/admin/bookings/${bookingId}/available-vendors`, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch available vendors' };
    }
  },

  // Manually assign vendor to booking
  assignVendor: async (bookingId, data) => {
    try {
      const response = await api.post(`/admin/bookings/${bookingId}/assign-vendor`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to assign vendor' };
    }
  },

  // Get booking analytics
  getAnalytics: async (filters = {}) => {
    try {
      const response = await api.get('/admin/bookings/analytics', { params: filters });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch analytics' };
    }
  },

  // Cancel booking
  cancelBooking: async (id, reason) => {
    try {
      const response = await api.post(`/admin/bookings/${id}/cancel`, { cancellationReason: reason });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to cancel booking' };
    }
  }
};
