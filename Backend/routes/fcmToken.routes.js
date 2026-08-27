/**
 * Unified FCM Token Routes
 * Handles FCM tokens for all authenticated roles (User, Vendor, Admin)
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { sendPushNotification } = require('../services/firebaseAdmin');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Admin = require('../models/Admin');
const { USER_ROLES } = require('../utils/constants');

const MAX_TOKENS = 10; // Maximum tokens per platform

// Helper to determine the Mongoose Model based on role
const getModelForRole = (role) => {
  const normalized = (role || '').toUpperCase();
  if (normalized === 'VENDOR') return Vendor;
  if (normalized === 'ADMIN' || normalized === 'SUPER_ADMIN') return Admin;
  return User;
};

/**
 * @route   POST /api/fcm-tokens/save
 * @desc    Save FCM token (User, Vendor, or Admin)
 * @access  Private
 */
router.post('/save', authenticate, async (req, res) => {
  try {
    const { token, platform = 'mobile' } = req.body;
    const userId = req.user._id || req.userId;
    const Model = getModelForRole(req.userRole);

    if (!token) {
      return res.status(400).json({ success: false, error: 'Token is required' });
    }

    // Use atomic updates to prevent VersionError (Race Conditions)
    // 1. Remove token if it exists (to avoid duplicates)
    const pullQuery = platform === 'mobile'
      ? { $pull: { fcmTokenMobile: token } }
      : { $pull: { fcmTokens: token } };

    await Model.findByIdAndUpdate(userId, pullQuery);

    // 2. Add token to front with limit
    const pushQuery = platform === 'mobile'
      ? {
          $push: {
            fcmTokenMobile: {
              $each: [token],
              $position: 0,
              $slice: MAX_TOKENS
            }
          }
        }
      : {
          $push: {
            fcmTokens: {
              $each: [token],
              $position: 0,
              $slice: MAX_TOKENS
            }
          }
        };

    const doc = await Model.findByIdAndUpdate(userId, pushQuery, { new: true });

    if (!doc) {
      return res.status(404).json({ success: false, error: 'Account not found' });
    }

    res.json({ success: true, message: 'FCM token saved successfully' });
  } catch (error) {
    console.error('Error saving FCM token:', error);
    res.status(500).json({ success: false, error: 'Failed to save FCM token' });
  }
});

/**
 * @route   DELETE /api/fcm-tokens/remove
 * @desc    Remove specific FCM token
 * @access  Private
 */
router.delete('/remove', authenticate, async (req, res) => {
  try {
    const { token, platform = 'mobile' } = req.body;
    const userId = req.user._id || req.userId;
    const Model = getModelForRole(req.userRole);

    if (!token) {
      return res.status(400).json({ success: false, error: 'Token is required' });
    }

    const pullQuery = platform === 'mobile'
      ? { $pull: { fcmTokenMobile: token } }
      : { $pull: { fcmTokens: token } };

    const doc = await Model.findByIdAndUpdate(userId, pullQuery, { new: true });

    if (!doc) {
      return res.status(404).json({ success: false, error: 'Account not found' });
    }

    res.json({ success: true, message: 'FCM token removed successfully' });
  } catch (error) {
    console.error('Error removing FCM token:', error);
    res.status(500).json({ success: false, error: 'Failed to remove FCM token' });
  }
});

/**
 * @route   DELETE /api/fcm-tokens/remove-all
 * @desc    Remove ALL FCM tokens for a specific platform (e.g. on logout)
 * @access  Private
 */
router.delete('/remove-all', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.userId;
    const { platform = 'mobile' } = req.body;
    const Model = getModelForRole(req.userRole);

    const updateQuery = platform === 'mobile'
      ? { $set: { fcmTokenMobile: [] } }
      : { $set: { fcmTokens: [] } };

    const doc = await Model.findByIdAndUpdate(userId, updateQuery, { new: true });

    if (!doc) {
      return res.status(404).json({ success: false, error: 'Account not found' });
    }

    console.log(`[FCM] ✅ All ${platform} tokens removed for: ${userId}`);
    res.json({ success: true, message: `All ${platform} FCM tokens removed successfully` });
  } catch (error) {
    console.error('Error removing FCM tokens:', error);
    res.status(500).json({ success: false, error: 'Failed to remove FCM tokens' });
  }
});

/**
 * @route   POST /api/fcm-tokens/test
 * @desc    Send test push notification to the logged-in device
 * @access  Private
 */
router.post('/test', authenticate, async (req, res) => {
  try {
    const { token } = req.body;
    let tokens = [];

    if (token) {
      tokens = [token];
    } else {
      const userId = req.user._id || req.userId;
      const Model = getModelForRole(req.userRole);
      const doc = await Model.findById(userId);

      if (!doc) {
        return res.status(404).json({ success: false, error: 'Account not found' });
      }

      tokens = [...(doc.fcmTokens || []), ...(doc.fcmTokenMobile || [])];
    }

    const uniqueTokens = [...new Set(tokens.filter(Boolean))];

    if (uniqueTokens.length === 0) {
      return res.status(400).json({ success: false, error: 'No FCM tokens provided or found in account' });
    }

    const response = await sendPushNotification(uniqueTokens, {
      title: '🔔 Test Notification',
      body: 'Push notification is working perfectly on Zippto!',
      data: {
        type: 'test',
        link: '/'
      }
    });

    res.json({
      success: true,
      message: 'Test notification sent',
      successCount: response.successCount,
      failureCount: response.failureCount
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
