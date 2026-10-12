import api from '../../../services/api';

export const adminSearchService = {
  search: async (query) => {
    try {
      const response = await api.get('/admin/search', {
        params: { q: query }
      });
      return response.data;
    } catch (error) {
      console.error('Admin search service error:', error);
      return {
        success: false,
        data: {
          bookings: [],
          users: [],
          vendors: [],
          services: [],
          tickets: [],
          coupons: []
        }
      };
    }
  }
};

export default adminSearchService;
