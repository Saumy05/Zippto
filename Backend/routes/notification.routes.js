const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { isUser, isVendor, isAdmin } = require('../middleware/roleMiddleware');
const {
  getUserNotifications,
  getVendorNotifications,
  getAdminNotifications,
  broadcastNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  getUnreadNotificationCount
} = require('../controllers/notificationControllers/notificationController');

// Routes
router.get('/unread-count', authenticate, getUnreadNotificationCount);
router.get('/user', authenticate, isUser, getUserNotifications);
router.get('/vendor', authenticate, isVendor, getVendorNotifications);
router.get('/admin', authenticate, isAdmin, getAdminNotifications);
router.post('/broadcast', authenticate, isAdmin, broadcastNotification);
router.put('/:id/read', authenticate, markAsRead);
router.put('/read-all', authenticate, markAllAsRead);
router.delete('/delete-all', authenticate, deleteAllNotifications);
router.delete('/:id', authenticate, deleteNotification);

module.exports = router;

