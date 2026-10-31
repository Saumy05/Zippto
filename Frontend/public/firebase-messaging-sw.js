/**
 * Firebase Messaging Service Worker
 * Handles background push notifications with sound alerts
 * Works reliably even when app is closed, phone is locked, or vendor is using other apps.
 */

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Parse Firebase configuration dynamically from registration URL parameters, with robust fallbacks
const params = new URLSearchParams(self.location.search);
const firebaseConfig = {
  apiKey: params.get('apiKey') || 'AIzaSyA1Nu3UuEGIETspFboy2AcFgbeWm9anCLc',
  authDomain: params.get('authDomain') || 'zippto-4f61f.firebaseapp.com',
  projectId: params.get('projectId') || 'zippto-4f61f',
  storageBucket: params.get('storageBucket') || 'zippto-4f61f.firebasestorage.app',
  messagingSenderId: params.get('messagingSenderId') || '84084901153',
  appId: params.get('appId') || '1:84084901153:web:b3b3a298435787008faa60',
  measurementId: params.get('measurementId') || 'G-H6E8EXY4ZV'
};

// Initialize Firebase if not already initialized
if (!firebase.apps.length && firebaseConfig.apiKey && firebaseConfig.projectId) {
  try {
    firebase.initializeApp(firebaseConfig);
    console.log('[SW] Firebase App initialized');
  } catch (err) {
    console.warn('[SW] Firebase init notice:', err);
  }
}

// Get messaging instance safely
let messaging = null;
try {
  messaging = firebase.messaging();
} catch (err) {
  console.warn('[SW] Firebase messaging instance notice:', err);
}

// Notification sounds based on type
const NOTIFICATION_SOUNDS = {
  new_booking: '/booking-alert.mp3',
  booking_request: '/booking-alert.mp3',
  booking_accepted: '/success.mp3',
  worker_assigned: '/notification.mp3',
  job_assigned: '/booking-alert.mp3',
  booking_completed: '/success.mp3',
  default: '/notification.mp3'
};

/**
 * Unified notification presenter
 * Displays the notification on lock screen and system tray, and alerts open client windows
 */
async function renderNotification(payload) {
  if (!payload) return;

  const data = payload.data || {};
  const notification = payload.notification || {};
  const notificationType = data.type || data.notificationType || 'default';

  let title = data.title || notification.title || '';
  let body = data.body || notification.body || '';

  // Skip completely empty payloads
  if (!title && !body) {
    console.log('[SW] 🚫 Skipping empty notification payload');
    return;
  }

  const origin = self.location.origin || '';
  const defaultIcon = `${origin}/zippto_logo.png`;
  let icon = data.icon || notification.icon || defaultIcon;
  let badge = `${origin}/zippto_logo.png`;

  const bookingId = String(data.bookingId || data.relatedId || '');
  const tag = bookingId ? `booking-${bookingId}` : (data.tag || `notification-${Date.now()}`);

  const isUrgent = [
    'new_booking',
    'booking_request',
    'job_assigned',
    'booking_assigned',
    'booking_no_vendors',
    'booking_timeout'
  ].includes(notificationType);

  let requireInteraction = isUrgent;
  let vibrate = isUrgent ? [500, 200, 500, 200, 500, 300, 500] : [200, 100, 200];
  let actions = [];

  // Enhanced styling for different notification types
  switch (notificationType) {
    case 'booking_requested':
      title = title || '📅 Booking Created!';
      body = body || 'Your service request has been received.';
      actions = [{ action: 'view', title: '👁️ View Status' }];
      break;

    case 'new_booking':
    case 'booking_request':
      // High priority booking alert - like Ola/Uber/Rapido
      title = title || '🔔 New Booking Request!';
      body = body || 'You have a new service request. Tap to Accept!';
      requireInteraction = true; // Stays on screen & lock screen until interacted
      vibrate = [500, 200, 500, 200, 500, 300, 500]; // Powerful vibration
      actions = [
        { action: 'accept', title: '✓ Accept' },
        { action: 'reject', title: '✗ Decline' }
      ];
      break;

    case 'job_assigned':
    case 'booking_assigned':
      title = title || '🔔 New Job Assigned!';
      body = body || 'You have been assigned a new job.';
      requireInteraction = true;
      vibrate = [500, 200, 500, 200, 500];
      actions = [
        { action: 'accept', title: '✓ Accept Job' },
        { action: 'view', title: '👁️ View Details' }
      ];
      break;

    case 'booking_taken':
      title = 'Job Already Taken';
      body = body || 'Another partner has already accepted this booking.';
      requireInteraction = false;
      vibrate = [150];
      break;

    case 'booking_no_vendors':
    case 'booking_timeout':
    case 'booking_rejected':
      title = title || '⚠️ Booking Alert';
      requireInteraction = true;
      vibrate = [500, 200, 500, 200, 500];
      actions = [{ action: 'view', title: '👁️ Open Bookings' }];
      break;

    case 'booking_accepted':
      title = title || '✅ Booking Confirmed!';
      actions = [{ action: 'view', title: '👁️ View Booking' }];
      break;

    case 'worker_assigned':
      title = title || '👷 Worker Assigned';
      actions = [{ action: 'track', title: '📍 Track Worker' }];
      break;

    case 'journey_started':
    case 'worker_started':
      title = title || '📍 Professional is on the way!';
      requireInteraction = true;
      actions = [{ action: 'track', title: '📍 Track Arrival' }];
      break;

    case 'work_done':
    case 'worker_completed':
      title = title || '✅ Work Finished!';
      requireInteraction = true;
      actions = [{ action: 'view', title: '👁️ View Summary' }];
      break;

    case 'bill_generated':
      title = title || '🧾 Service Bill Generated';
      requireInteraction = true;
      actions = [{ action: 'pay_online', title: '💳 Pay Now' }];
      break;

    case 'booking_completed':
      title = title || '🎉 Booking Completed!';
      actions = [{ action: 'rate', title: '⭐ Rate Now' }];
      break;

    default:
      title = title || 'App Notification';
      body = body || 'You have a new update.';
      break;
  }

  const notificationOptions = {
    body,
    icon,
    badge,
    tag,
    sound: NOTIFICATION_SOUNDS[notificationType] || NOTIFICATION_SOUNDS.default,
    data: {
      ...data,
      notificationType,
      bookingId,
      url: data.link || (bookingId ? `/vendor/bookings/${bookingId}` : '/'),
      timestamp: Date.now()
    },
    vibrate,
    requireInteraction,
    actions,
    silent: false,
    renotify: true,
    timestamp: Date.now()
  };

  // Broadcast to all open window clients so the in-app modal and audio ring immediately
  try {
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientList) {
      client.postMessage({
        type: 'PUSH_NOTIFICATION_RECEIVED',
        notification: {
          title,
          ...notificationOptions
        }
      });
    }

    // CRITICAL: For URGENT booking alerts (new_booking, job_assigned), ALWAYS show the system notification!
    // Never suppress on lock screen or when vendor might have the app in background or minimized.
    if (!isUrgent) {
      const isFocused = clientList.some(client => client.focused);
      if (isFocused) {
        console.log('[SW] 🚫 Non-urgent notification suppressed because window is actively focused');
        return;
      }
    }
  } catch (err) {
    console.warn('[SW] Error communicating with clients:', err);
  }

  console.log('[SW] 📲 Displaying system notification:', title, 'tag:', tag);
  return self.registration.showNotification(title, notificationOptions);
}

// Handle Firebase background messages (data-only FCM pushes)
if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    console.log('[SW] 🔔 FCM Background message received:', payload);
    return renderNotification(payload);
  });
}

// Native push event handler - guarantees execution and keeps worker alive via event.waitUntil
self.addEventListener('push', (event) => {
  console.log('[SW] 📨 Native push event received');
  let payload = {};

  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      try {
        payload = { data: { body: event.data.text() } };
      } catch (err) {}
    }
  }

  event.waitUntil(renderNotification(payload));
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] 📱 Notification clicked:', event.action, event.notification.data);

  const notification = event.notification;
  const data = notification.data || {};
  const action = event.action;

  // Close the notification
  notification.close();

  let urlToOpen = data.url || data.link || '/';

  // Handle specific action buttons
  switch (action) {
    case 'accept':
      if (data.bookingId) {
        if (data.notificationType === 'job_assigned') {
          urlToOpen = `/worker/job/${data.bookingId}?action=accept`;
        } else {
          urlToOpen = `/vendor/bookings/${data.bookingId}?action=accept`;
        }
      }
      break;

    case 'reject':
    case 'decline':
      // Vendor declined via lock screen action button
      return;

    case 'view':
    case 'track':
      if (data.bookingId) {
        urlToOpen = data.link || `/user/booking/${data.bookingId}`;
      }
      break;

    case 'view_wallet':
      urlToOpen = '/user/wallet';
      break;

    case 'pay_online':
      urlToOpen = data.bookingId ? `/user/booking/${data.bookingId}` : '/user/bookings';
      break;

    case 'rate':
      urlToOpen = data.bookingId ? `/user/booking/${data.bookingId}?rate=true` : '/user/bookings';
      break;

    default:
      urlToOpen = data.link || data.url || '/';
  }

  // Ensure URL is absolute for browser navigation
  const origin = self.location.origin;
  if (urlToOpen && !urlToOpen.startsWith('http')) {
    urlToOpen = new URL(urlToOpen, origin).href;
  }

  // Focus existing window or open new window
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            url: urlToOpen,
            action,
            data
          });
          if ('navigate' in client) {
            return client.navigate(urlToOpen);
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] ❌ Notification closed:', event.notification.data);
});

// ---------------------------------------------------------------------------
// Offline support (app shell caching)
// ---------------------------------------------------------------------------
const CACHE_NAME = 'zippto-shell-v2';
const SHELL_URL = '/index.html';
const IS_DEV_HOST = ['localhost', '127.0.0.1'].includes(self.location.hostname);

// Install event
self.addEventListener('install', (event) => {
  console.log('[SW] 📦 Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.add(new Request(SHELL_URL, { cache: 'reload' })))
      .catch(() => {})
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] ✅ Service Worker activated');
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (IS_DEV_HOST || request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api')) return;

  // Page loads: network first, fall back to the cached app shell when offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(SHELL_URL, copy));
          }
          return response;
        })
        .catch(() => caches.match(SHELL_URL).then((cached) => cached || Response.error()))
    );
    return;
  }

  // Static files (hashed JS/CSS bundles, images, fonts): cache first, fill the cache on miss
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});

console.log('[SW] 🚀 Firebase Messaging Service Worker loaded v2');
