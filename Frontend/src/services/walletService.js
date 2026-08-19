import api from './api';

/**
 * Wallet Service
 * Handles all API calls for User Wallet
 */

export const walletService = {
  // Get wallet balance and financial overview
  getBalance: async () => {
    const response = await api.get('/user/wallet/balance');
    return response.data;
  },

  // Request wallet withdrawal to Bank or UPI
  requestWithdrawal: async (data) => {
    const response = await api.post('/user/wallet/withdraw', data);
    return response.data;
  },

  // Get user's withdrawal requests history
  getWithdrawals: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);

    const response = await api.get(`/user/wallet/withdrawals${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
    return response.data;
  },

  // Get wallet transaction history with filters
  getTransactions: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.type) queryParams.append('type', params.type);

    const response = await api.get(`/user/wallet/transactions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
    return response.data;
  }
};

export default walletService;
