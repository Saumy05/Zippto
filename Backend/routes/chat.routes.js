const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const {
  getChatHistory,
  sendMessage,
  markMessagesRead,
  getUnreadCount
} = require('../controllers/chatController');

// All chat routes require JWT authentication
router.use(authenticate);

// Routes
router.get('/unread-count', getUnreadCount);
router.get('/booking/:bookingId', getChatHistory);
router.post('/booking/:bookingId/send', sendMessage);
router.patch('/booking/:bookingId/read', markMessagesRead);

module.exports = router;
