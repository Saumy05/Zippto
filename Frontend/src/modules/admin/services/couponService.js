import api from '../../../services/api';

const couponService = {
  getAll: async () => (await api.get('/admin/coupons')).data,
  create: async (data) => (await api.post('/admin/coupons', data)).data,
  update: async (id, data) => (await api.put(`/admin/coupons/${id}`, data)).data,
  remove: async (id) => (await api.delete(`/admin/coupons/${id}`)).data
};

export default couponService;
