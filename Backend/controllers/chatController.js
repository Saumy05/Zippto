const chatService = require('../services/chatService');
const { getIO } = require('../sockets');

/**
 * Get paginated chat history for a booking
 * GET /api/chat/booking/:bookingId
 */
const getChatHistory = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { limit, before } = req.query;

    const result = await chatService.getChatHistory(bookingId, req.user, { limit, before });

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get chat history error:', error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to fetch chat history'
    });
  }
};

/**
 * Send a chat message (REST fallback)
 * POST /api/chat/booking/:bookingId/send
 */
const sendMessage = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { clientMessageId, type, text, mediaUrl } = req.body;

    const { message, isDuplicate, booking, isReadOnly } = await chatService.createMessage({
      bookingId,
      actor: req.user,
      clientMessageId,
      type,
      text,
      mediaUrl
    });

    // Broadcast message via Socket.io if not duplicate
    try {
      const io = getIO();
      if (io) {
        io.to(`chat_booking_${bookingId}`).emit('new_chat_message', message);
        // Send offline push notification if recipient is not in chat
        chatService.sendOfflinePushNotification(io, booking, req.user, message);
      }
    } catch (socketErr) {
      console.warn('[ChatController] Socket broadcast warning:', socketErr.message);
    }

    res.status(isDuplicate ? 200 : 201).json({
      success: true,
      data: message,
      isDuplicate,
      isReadOnly
    });
  } catch (error) {
    console.error('Send chat message error:', error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to send message'
    });
  }
};

/**
 * Mark messages as read by the current user
 * PATCH /api/chat/booking/:bookingId/read
 */
const markMessagesRead = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { messageIds } = req.body;

    const result = await chatService.markMessagesRead(bookingId, req.user, messageIds);

    // Broadcast read event to socket room
    try {
      const io = getIO();
      if (io) {
        io.to(`chat_booking_${bookingId}`).emit('messages_read', result);
      }
    } catch (socketErr) {
      console.warn('[ChatController] Socket read broadcast warning:', socketErr.message);
    }

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Mark chat read error:', error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to mark messages as read'
    });
  }
};

/**
 * Get total unread chat count across active bookings
 * GET /api/chat/unread-count
 */
const getUnreadCount = async (req, res) => {
  try {
    const result = await chatService.getUnreadCount(req.user);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get unread chat count error:', error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to get unread count'
    });
  }
};

module.exports = {
  getChatHistory,
  sendMessage,
  markMessagesRead,
  getUnreadCount
};
