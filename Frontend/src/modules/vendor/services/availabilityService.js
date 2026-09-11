/**
 * Availability Service
 * Manages vendor online/offline status
 */

import api from '../../../services/api';

/**
 * Toggle vendor online/offline availability
 * @param {boolean} isOnline - true = Online, false = Offline
 * @returns {Promise<Object>} Updated availability state
 */
export const updateAvailability = async (isOnline) => {
  const response = await api.patch('/vendors/availability', { isOnline });
  return response.data;
};

/**
 * Get vendor availability from profile API
 * @returns {Promise<{ isOnline: boolean, availability: string }>}
 */
export const getAvailability = async () => {
  const response = await api.get('/vendors/profile');
  const { isOnline = false, availability = 'OFFLINE' } = response.data.vendor || {};
  return { isOnline, availability };
};
