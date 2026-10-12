import api from '../../../services/api';

const ticketService = {
  getAll: async (params = {}) => (await api.get('/admin/tickets', { params })).data,
  update: async (id, data) => (await api.put(`/admin/tickets/${id}`, data)).data
};

export default ticketService;
