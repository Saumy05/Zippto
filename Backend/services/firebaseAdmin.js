/**
 * Firebase Admin Service
 * Handles push notification sending via Firebase Cloud Messaging (FCM)
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
const fs = require('fs');

// Initialize Firebase Admin SDK
let serviceAccount;

try {
  if (process.env.FIREBASE_CONFIG) {
    // Production: Use environment variable JSON content
    serviceAccount = typeof process.env.FIREBASE_CONFIG === 'string' 
      ? JSON.parse(process.env.FIREBASE_CONFIG) 
      : process.env.FIREBASE_CONFIG;
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    // Alternative Env Var
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  } else {
    // Local: Use file path if exists
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './config/firebase-service-account.json';
    const resolvedPath = path.resolve(__dirname, '..', serviceAccountPath);
    if (fs.existsSync(resolvedPath)) {
      serviceAccount = require(resolvedPath);
    }
  }
} catch (error) {
  console.warn('⚠️ Firebase credentials could not be loaded:', error.message);
}

// Initialize only if not already initialized
if (!admin.apps.length && serviceAccount) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin SDK initialized successfully');
  } catch (initErr) {
    console.warn('⚠️ Firebase Admin initialization warning:', initErr.message);
  }
}

/**
 * Send push notification to multiple tokens
 * @param {string[]} tokens - Array of FCM tokens
 * @param {Object} payload - Notification payload
 * @param {string} payload.title - Notification title
 * @param {string} payload.body - Notification body
 * @param {Object} payload.data - Additional data (optional)
 * @param {string} payload.icon - Notification icon (optional)
 * @param {boolean} payload.highPriority - Send as high priority (default: true)
 * @returns {Promise<Object>} - Response with success/failure counts
 */
const Settings = require('../models/Settings');

// Push types that must break through on a locked screen (time-critical, need a person to act).
// Android reads sound / lock-screen visibility from the notification channel, so the app
// must create CHANNEL with max importance and public lock-screen visibility.
const URGENT_PUSH_TYPES = new Set([
  'new_booking',           // vendor: new booking request
  'job_assigned',
  'booking_assigned',      // vendor: admin assigned a booking
  'booking_no_vendors',    // admin: booking needs manual assignment
  'booking_timeout',
  'booking_rejected'
]);
// Must match the id of the high-importance channel created in the Flutter app; override per environment if it differs
const URGENT_ANDROID_CHANNEL_ID = process.env.FCM_URGENT_CHANNEL_ID || 'booking_alerts';

const PUSH_SETTING_TTL_MS = 10 * 1000;
const pushSettingCache = { value: null, at: 0 };

/**
 * Send push notification to specific device tokens (Data-Only for maximum reliability)
 * @param {Array<string>} tokens - Array of FCM registration tokens
 * @param {Object} payload - Notification payload
 * @param {string} payload.title - Notification title
 * @param {string} payload.body - Notification body
 * @param {Object} payload.data - Additional data (optional)
 * @param {string} payload.icon - Notification icon (optional)
 * @param {boolean} payload.highPriority - Send as high priority (default: true)
 * @returns {Promise<Object>} - Response with success/failure counts
 */
async function sendPushNotification(tokens, payload) {
  try {
    if (!admin.apps.length) {
      console.warn('[FCM] Firebase Admin SDK is not initialized, skipping push');
      return { successCount: 0, failureCount: 0 };
    }

    // Dynamic Global Toggle Check
    try {
      // Short cache: a booking alert fans out to many vendors at once and each push re-read this setting
      if (Date.now() - pushSettingCache.at > PUSH_SETTING_TTL_MS) {
        pushSettingCache.value = await Settings.findOne({ type: 'global' }).select('isPushNotificationEnabled').lean();
        pushSettingCache.at = Date.now();
      }
      const globalSettings = pushSettingCache.value;
      if (globalSettings && globalSettings.isPushNotificationEnabled === false) {
        console.log('[FCM] Push notifications are globally disabled by Admin in Settings');
        return { successCount: 0, failureCount: 0, disabled: true };
      }
    } catch (settingErr) {
      // Fallback: proceed if settings check fails
    }

    if (!tokens || tokens.length === 0) {
      console.log('No FCM tokens provided');
      return { successCount: 0, failureCount: 0 };
    }

    // Remove duplicates and empty values (Robust deduplication)
    const uniqueTokens = Array.from(new Set(tokens.filter(t => t && typeof t === 'string' && t.trim().length > 0)));

    if (uniqueTokens.length === 0) {
      console.log('No valid FCM tokens after filtering');
      return { successCount: 0, failureCount: 0 };
    }

    // Ensure data values are strings (FCM requirement)
    const stringData = {
      // Always include title and body in data for data-only notifications and Service Worker access
      title: payload.title || (payload.body ? 'New Update' : 'App Notification'),
      body: payload.body || ''
    };
    if (payload.data) {
      Object.keys(payload.data).forEach(key => {
        stringData[key] = String(payload.data[key]);
      });
    }

    const message = {
      data: stringData,
      tokens: uniqueTokens,
      // Android specific configuration for high priority
      android: {
        priority: 'high', // HIGH priority for immediate delivery
        // notification block removed to ensure Data-Only message
      },
      // iOS/APNs specific configuration
      apns: {
        headers: {
          'apns-priority': '10', // Highest priority for immediate delivery
          'apns-push-type': 'alert'
        },
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            'content-available': 1, // Wake up app in background
            'mutable-content': 1
          }
        }
      },
      // Web push configuration
      webpush: {
        headers: {
          Urgency: 'high',
          TTL: '86400' // 24 hours
        },
        fcmOptions: {
          link: payload.data?.link || '/'
        }
      },
      priority: payload.highPriority !== false ? 'high' : 'normal'
    };

    // Standard notification block (Top-level)
    message.notification = {
      title: payload.title || 'App Notification',
      body: payload.body || 'New Update',
    };
    
    // Android specific (Sound, Priority, Channel, Icon)
    message.android.notification = {
      title: message.notification.title,
      body: message.notification.body,
      color: '#f44336'
    };

    // iOS/APNs specific (Sound, Alert, Badge)
    message.apns.payload.aps.alert = {
      title: message.notification.title,
      body: message.notification.body,
    };

    // WebPush specific (Title, Body, Icon, Badge)
    message.webpush.notification = {
      title: message.notification.title,
      body: message.notification.body,
      icon: payload.icon || '/zippto_logo.png',
      badge: '/zippto_logo.png',
    };

    // Ensure critical fields are also in data for background handling
    message.data.title = payload.title || 'App Notification';
    message.data.body = payload.body || 'New Update';
    if (payload.icon) message.data.icon = payload.icon;

    // A booking's alert and its later "job taken" notice share a tag / collapse id, so the system tray
    // swaps the stale alert for the notice by itself, even while the phone is locked and the app is
    // asleep (no app code involved).
    const bookingTag = String(payload.data?.bookingId || payload.data?.relatedId || '');

    // Urgent alerts: show on the lock screen, ring, vibrate and stay until acted on
    if (URGENT_PUSH_TYPES.has(String(payload.data?.type || ''))) {
      if (bookingTag) {
        message.android.notification.tag = bookingTag;
        message.apns.headers['apns-collapse-id'] = bookingTag.slice(0, 64);
      }
      Object.assign(message.android.notification, {
        channelId: URGENT_ANDROID_CHANNEL_ID,
        priority: 'max',
        visibility: 'public',
        defaultSound: true,
        defaultVibrateTimings: true,
        sticky: false
      });
      message.android.ttl = 5 * 60 * 1000; // a booking alert is useless after the search window

      message.apns.headers['apns-expiration'] = String(Math.floor(Date.now() / 1000) + 300);
      message.apns.payload.aps.sound = 'default';
      // Time Sensitive: delivered immediately and shown on the lock screen even in Focus modes
      message.apns.payload.aps['interruption-level'] = 'time-sensitive';

      message.webpush.headers.Urgency = 'high';
      message.webpush.headers.urgency = 'high';
      message.webpush.headers.TTL = '300';
      Object.assign(message.webpush.notification, {
        requireInteraction: true,
        vibrate: [500, 200, 500, 200, 500, 300, 500],
        silent: false,
        tag: bookingTag || String(payload.data?.type || 'booking_alert'),
        renotify: true,
        actions: [
          { action: 'accept', title: '✓ Accept' },
          { action: 'reject', title: '✗ Decline' }
        ]
      });
    }

    // "Job already taken": replaces the booking alert still showing on other vendors' lock screens
    if (String(payload.data?.type || '') === 'booking_taken' && bookingTag) {
      message.android.notification.tag = bookingTag;
      message.android.ttl = 60 * 1000;
      message.apns.headers['apns-collapse-id'] = bookingTag.slice(0, 64);
      message.apns.payload.aps['interruption-level'] = 'passive'; // no sound / wake for a notice
      message.webpush.headers.TTL = '60';
      Object.assign(message.webpush.notification, { tag: bookingTag, silent: true, renotify: false });
    }

    // Log intent
    console.log(`[FCM] Sending standard notification to ${uniqueTokens.length} tokens:`, payload.title);

    const response = await admin.messaging().sendEachForMulticast(message);

    console.log(`✅ Push notification sent - Success: ${response.successCount}, Failed: ${response.failureCount}`);

    // Log failed tokens for debugging and cleanup invalid ones
    if (response.failureCount > 0) {
      const invalidTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          console.log(`❌ Failed token[${idx}]: ${errorCode} - ${resp.error?.message}`);

          if (errorCode === 'messaging/registration-token-not-registered' ||
            errorCode === 'messaging/invalid-registration-token') {
            invalidTokens.push(uniqueTokens[idx]);
          }
        }
      });

      // Cleanup invalid tokens
      if (invalidTokens.length > 0) {
        removeInvalidTokens(invalidTokens);
      }
    }

    return response;
  } catch (error) {
    console.error('❌ Error sending push notification:', error);
    throw error;
  }
}

/**
 * Remove invalid FCM tokens from all collections
 * @param {string[]} tokens - Array of invalid tokens to remove
 */
async function removeInvalidTokens(tokens) {
  try {
    console.log(`[FCM Cleanup] Removing ${tokens.length} invalid tokens...`);
    const User = require('../models/User');
    const Vendor = require('../models/Vendor');

    const updateQuery = {
      $pull: {
        fcmTokens: { $in: tokens },
        fcmTokenMobile: { $in: tokens }
      }
    };

    // We run updates in parallel for all collections as a token might belong to any
    await Promise.all([
      User.updateMany({ $or: [{ fcmTokens: { $in: tokens } }, { fcmTokenMobile: { $in: tokens } }] }, updateQuery),
      Vendor.updateMany({ $or: [{ fcmTokens: { $in: tokens } }, { fcmTokenMobile: { $in: tokens } }] }, updateQuery)
    ]);

    console.log('[FCM Cleanup] ✅ Invalid tokens removed from database');
  } catch (err) {
    console.error('[FCM Cleanup] ❌ Error removing tokens:', err);
  }
}

/**
 * Send notification to a specific user
 * @param {string} userId - User's MongoDB _id
 * @param {Object} payload - Notification payload
 * @param {boolean} includeMobile - Include mobile tokens (default: true)
 */
async function sendNotificationToUser(userId, payload, includeMobile = true) {
  try {
    const User = require('../models/User');
    const user = await User.findById(userId);

    if (!user) {
      console.log(`[FCM] ❌ User not found for notification: ${userId}`);
      return;
    }

    let tokens = [];
    if (user.fcmTokens && user.fcmTokens.length > 0) {
      tokens = [...tokens, ...user.fcmTokens];
    }
    if (includeMobile && user.fcmTokenMobile && user.fcmTokenMobile.length > 0) {
      tokens = [...tokens, ...user.fcmTokenMobile];
    }

    if (tokens.length === 0) {
      console.log(`[FCM] ⚠️ No FCM tokens found for user: ${userId}`);
      return;
    }

    console.log(`[FCM] 📤 Sending notification to user ${user.name} (${userId}) on ${tokens.length} devices`);

    // Add priority and sound for user notifications too
    const finalPayload = {
      ...payload,
      highPriority: payload.priority === 'high' ||
        ['booking_accepted', 'journey_started', 'work_done', 'work_completed', 'booking_completed', 'vendor_reached', 'visit_verified', 'payment_success', 'payment_received', 'work_started', 'in_progress'].includes(payload.data?.type),
      dataOnly: false // Explicitly disable dataOnly to force system tray notification
    };

    await sendPushNotification(tokens, finalPayload);
  } catch (error) {
    console.error(`[FCM] ❌ Error sending notification to user ${userId}:`, error);
  }
}

/**
 * Send notification to a specific vendor
 * @param {string} vendorId - Vendor's MongoDB _id
 * @param {Object} payload - Notification payload
 * @param {boolean} includeMobile - Include mobile tokens (default: true)
 */
async function sendNotificationToVendor(vendorId, payload, includeMobile = true) {
  try {
    const Vendor = require('../models/Vendor');
    const vendor = await Vendor.findById(vendorId).select('name businessName fcmTokens fcmTokenMobile').lean();

    if (!vendor) {
      console.log(`[FCM] ❌ Vendor not found for notification: ${vendorId}`);
      return;
    }

    let tokens = [];
    if (vendor.fcmTokens && vendor.fcmTokens.length > 0) {
      tokens = [...tokens, ...vendor.fcmTokens];
    }
    if (includeMobile && vendor.fcmTokenMobile && vendor.fcmTokenMobile.length > 0) {
      tokens = [...tokens, ...vendor.fcmTokenMobile];
    }

    if (tokens.length === 0) {
      console.log(`[FCM] ⚠️ No FCM tokens found for vendor: ${vendorId}`);
      return;
    }

    console.log(`[FCM] 📤 Sending notification to vendor ${vendor.businessName || vendor.name} (${vendorId}) on ${tokens.length} devices`);

    const finalPayload = {
      ...payload,
      title: `🏢 [Partner] ${payload.title}` // Add identification
    };

    await sendPushNotification(tokens, finalPayload);
  } catch (error) {
    console.error(`[FCM] ❌ Error sending notification to vendor ${vendorId}:`, error);
  }
}

/**
 * Fast Multicast: Send urgent booking alert push to multiple vendors simultaneously in a single multicast call.
 * Bulk inserts in-app Notification documents in parallel so no vendor is delayed.
 * @param {Array<Object|string>} vendors - Array of vendor objects or vendor IDs
 * @param {Object} booking - Booking details for the notification
 * @returns {Promise<Object>}
 */
async function sendBookingAlertToVendors(vendors, booking) {
  try {
    if (!vendors || vendors.length === 0) return { successCount: 0, failureCount: 0 };

    const Vendor = require('../models/Vendor');
    const Notification = require('../models/Notification');

    const vendorIds = vendors.map(v => (v && v._id ? v._id.toString() : String(v)));

    // Collect tokens from passed vendor objects if already available in memory; otherwise fetch via single query
    let allTokens = [];
    const missingVendorIds = [];

    vendors.forEach(v => {
      if (v && typeof v === 'object' && (v.fcmTokens || v.fcmTokenMobile)) {
        if (Array.isArray(v.fcmTokens)) allTokens.push(...v.fcmTokens);
        if (Array.isArray(v.fcmTokenMobile)) allTokens.push(...v.fcmTokenMobile);
      } else {
        const id = v && v._id ? v._id.toString() : String(v);
        missingVendorIds.push(id);
      }
    });

    if (missingVendorIds.length > 0) {
      const dbVendors = await Vendor.find({ _id: { $in: missingVendorIds } })
        .select('name businessName fcmTokens fcmTokenMobile')
        .lean();

      dbVendors.forEach(v => {
        if (Array.isArray(v.fcmTokens)) allTokens.push(...v.fcmTokens);
        if (Array.isArray(v.fcmTokenMobile)) allTokens.push(...v.fcmTokenMobile);
      });
    }

    allTokens = Array.from(new Set(allTokens.filter(t => t && typeof t === 'string' && t.trim().length > 0)));

    const bookingId = (booking._id || booking.bookingId || '').toString();
    const serviceName = booking.serviceName || booking.serviceCategory || 'Service Request';
    const customerName = booking.customerName || 'Customer';
    const customerPhone = booking.customerPhone || '';
    const price = booking.finalAmount || booking.price || 0;
    const priceText = price > 0 ? `₹${price}` : 'New Request';

    const title = '🏢 [Partner] 🔔 New Booking Request!';
    const body = `New ${serviceName} booking (${priceText}) from ${customerName}. Tap to Accept!`;

    const pushPayload = {
      title,
      body,
      highPriority: true,
      data: {
        type: 'new_booking',
        bookingId,
        relatedId: bookingId,
        relatedType: 'booking',
        serviceName,
        customerName,
        customerPhone,
        price: String(price),
        distance: String(booking.distance || ''),
        link: `/vendor/bookings/${bookingId}`,
        createdAt: new Date().toISOString()
      }
    };

    // 1. Send ONE fast multicast push to all vendor tokens simultaneously
    const pushPromise = allTokens.length > 0
      ? sendPushNotification(allTokens, pushPayload).catch(err => {
          console.error('[sendBookingAlertToVendors] FCM Multicast error:', err.message);
          return { successCount: 0, failureCount: 0 };
        })
      : Promise.resolve({ successCount: 0, failureCount: 0 });

    // 2. Bulk insert in-app Notification records in parallel
    const notificationsToInsert = vendorIds.map(vId => ({
      vendorId: vId,
      type: 'booking_request',
      title: 'New Booking Request',
      message: body,
      relatedId: bookingId,
      relatedType: 'booking',
      data: {
        bookingId,
        serviceName,
        customerName,
        price,
        distance: booking.distance || null
      },
      actionUrl: `/vendor/bookings/${bookingId}`
    }));

    const dbPromise = Notification.insertMany(notificationsToInsert, { ordered: false }).catch(err => {
      console.error('[sendBookingAlertToVendors] Notification bulk insert error:', err.message);
    });

    const [pushResult] = await Promise.all([pushPromise, dbPromise]);
    console.log(`[sendBookingAlertToVendors] Instant alert for booking #${booking.bookingNumber || bookingId} sent to ${vendorIds.length} vendors (${allTokens.length} tokens)`);
    return pushResult;
  } catch (error) {
    console.error('[sendBookingAlertToVendors] Error:', error);
    return { successCount: 0, failureCount: 0 };
  }
}

/**
 * Tell vendors that a booking they were alerted about has been taken (or is no longer available).
 * Replaces their still-visible alert notification in a single batch multicast push.
 * @param {Array<string|ObjectId>} vendorIds
 * @param {string|ObjectId} bookingId
 * @param {string} [message]
 */
async function sendBookingTakenPush(vendorIds, bookingId, message = 'Another partner has already accepted this booking.') {
  try {
    if (!vendorIds || vendorIds.length === 0) return;

    const Vendor = require('../models/Vendor');
    const id = String(bookingId);

    const vendors = await Vendor.find({ _id: { $in: vendorIds } })
      .select('fcmTokens fcmTokenMobile')
      .lean();

    let allTokens = [];
    vendors.forEach(v => {
      if (Array.isArray(v.fcmTokens)) allTokens.push(...v.fcmTokens);
      if (Array.isArray(v.fcmTokenMobile)) allTokens.push(...v.fcmTokenMobile);
    });

    allTokens = Array.from(new Set(allTokens.filter(t => t && typeof t === 'string' && t.trim().length > 0)));
    if (allTokens.length === 0) return;

    await sendPushNotification(allTokens, {
      title: 'Job already taken',
      body: message,
      highPriority: false,
      data: {
        type: 'booking_taken',
        bookingId: id,
        relatedId: id,
        link: '/vendor/dashboard'
      }
    });
  } catch (err) {
    console.error('[sendBookingTakenPush] Error:', err.message);
  }
}

/**
 * Send notification to a specific admin
 * @param {string} adminId - Admin's MongoDB _id
 * @param {Object} payload - Notification payload
 * @param {boolean} includeMobile - Include mobile tokens (default: true)
 */
async function sendNotificationToAdmin(adminId, payload, includeMobile = true) {
  try {
    let adminUser = null;
    try {
      const Admin = require('../models/Admin');
      adminUser = await Admin.findById(adminId);
    } catch (e) {
      const User = require('../models/User');
      adminUser = await User.findById(adminId);
    }

    if (!adminUser) {
      console.log(`Admin not found: ${adminId}`);
      return;
    }

    let tokens = [];
    if (adminUser.fcmTokens && adminUser.fcmTokens.length > 0) {
      tokens = [...tokens, ...adminUser.fcmTokens];
    }
    if (includeMobile && adminUser.fcmTokenMobile && adminUser.fcmTokenMobile.length > 0) {
      tokens = [...tokens, ...adminUser.fcmTokenMobile];
    }

    console.log(`[FCM] 📤 Sending notification to admin (${adminId}) on ${tokens.length} devices`);

    const finalPayload = {
      ...payload,
      title: `🛡️ [Admin] ${payload.title}` // Add identification
    };

    await sendPushNotification(tokens, finalPayload);
  } catch (error) {
    console.error(`[FCM] ❌ Error sending notification to admin ${adminId}:`, error);
  }
}

/**
 * Send a notification to every admin that has a registered device (global admin alerts).
 * @param {Object} payload - Notification payload
 */
async function sendNotificationToAllAdmins(payload) {
  try {
    const Admin = require('../models/Admin');
    const admins = await Admin.find({
      $or: [
        { fcmTokens: { $exists: true, $not: { $size: 0 } } },
        { fcmTokenMobile: { $exists: true, $not: { $size: 0 } } }
      ]
    }).select('fcmTokens fcmTokenMobile').lean();

    const tokens = admins.flatMap(a => [...(a.fcmTokens || []), ...(a.fcmTokenMobile || [])]);
    if (tokens.length === 0) {
      console.log('[FCM] ⚠️ No admin devices registered for push');
      return;
    }

    await sendPushNotification(tokens, { ...payload, title: `🛡️ [Admin] ${payload.title}` });
  } catch (error) {
    console.error('[FCM] ❌ Error sending notification to all admins:', error);
  }
}

module.exports = {
  sendPushNotification,
  sendNotificationToUser,
  sendNotificationToVendor,
  sendBookingAlertToVendors,
  sendBookingTakenPush,
  sendNotificationToAdmin,
  sendNotificationToAllAdmins
};
