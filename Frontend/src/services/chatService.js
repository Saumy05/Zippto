import api from './api';
import { uploadToCloudinary } from '../utils/cloudinaryUpload';

export const chatService = {
  /**
   * Get paginated chat history for a booking
   * @param {string} bookingId
   * @param {Object} params - { limit, before }
   */
  getChatHistory: async (bookingId, params = {}) => {
    try {
      const response = await api.get(`/chat/booking/${bookingId}`, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch chat history' };
    }
  },

  /**
   * Send a chat message (REST fallback)
   * @param {string} bookingId
   * @param {Object} payload - { clientMessageId, type, text, mediaUrl }
   */
  sendMessage: async (bookingId, payload) => {
    try {
      const response = await api.post(`/chat/booking/${bookingId}/send`, payload);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to send message' };
    }
  },

  /**
   * Mark messages as read
   * @param {string} bookingId
   * @param {string[]} messageIds
   */
  markChatRead: async (bookingId, messageIds = []) => {
    try {
      const response = await api.patch(`/chat/booking/${bookingId}/read`, { messageIds });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to mark messages as read' };
    }
  },

  /**
   * Get total unread chat count across active bookings
   */
  getUnreadChatCount: async () => {
    try {
      const response = await api.get('/chat/unread-count');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get unread chat count' };
    }
  },

  /**
   * Upload chat image attachment via Cloudinary with server fallback
   * @param {File} file
   * @param {Function} onProgress
   */
  uploadChatImage: async (file, onProgress) => {
    return await uploadToCloudinary(file, 'zippto_chat', onProgress);
  }
};

export default chatService;
