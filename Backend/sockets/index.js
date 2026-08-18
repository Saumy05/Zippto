// Socket.io initialization
const { Server } = require('socket.io');
const { authenticateSocket } = require('../middleware/authMiddleware');

let io = null;

const initializeSocket = (server) => {
  io = new Server(server, {
    pingTimeout: 60000,
    pingInterval: 25000,
    cors: {
      origin: [process.env.FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'].filter(Boolean),
      credentials: true,
      methods: ["GET", "POST"]
    },
    transports: ['polling', 'websocket']
  });

  // Authentication middleware for Socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      // Verify token using the same method as HTTP middleware
      const { verifyAccessToken } = require('../utils/tokenService');
      const decoded = verifyAccessToken(token);

      socket.userId = decoded.userId;
      socket.userRole = decoded.role;

      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} (User: ${socket.userId}, Role: ${socket.userRole})`);

    // Join user-specific room for notifications
    if (socket.userRole === 'USER') {
      socket.join(`user_${socket.userId.toString()}`);
    } else if (socket.userRole === 'VENDOR') {
      socket.join(`vendor_${socket.userId.toString()}`);
      // Update vendor online status
      updateVendorOnlineStatus(socket.userId, true, socket.id);
    } else if (socket.userRole === 'WORKER') {
      socket.join(`worker_${socket.userId.toString()}`);
      // Update worker online status
      updateWorkerOnlineStatus(socket.userId, true, socket.id);
    } else if (socket.userRole === 'ADMIN') {
      socket.join(`admin_${socket.userId.toString()}`);
    }

    // Explicit Room Join Events (Fallback/Frontend Initiated)
    socket.on('join_vendor_room', (vendorId) => {
      // Security check: ensure the socket user actually IS this vendor
      if (socket.userRole === 'VENDOR' && socket.userId.toString() === vendorId.toString()) {
        socket.join(`vendor_${vendorId.toString()}`);
        console.log(`Socket ${socket.id} explicitly joined room vendor_${vendorId}`);
      }
    });

    socket.on('join_user_room', (userId) => {
      // Ensure strings for comparison
      if (socket.userRole === 'USER' && socket.userId.toString() === userId.toString()) {
        socket.join(`user_${userId.toString()}`);
        console.log(`Socket ${socket.id} explicitly joined room user_${userId}`);
      }
    });

    socket.on('join_worker_room', (workerId) => {
      if (socket.userRole === 'WORKER' && socket.userId === workerId) {
        socket.join(`worker_${workerId}`);
        console.log(`Socket ${socket.id} explicitly joined room worker_${workerId}`);
      }
    });

    // Live Tracking Events
    socket.on('join_tracking', async (bookingId) => {
      socket.join(`booking_${bookingId}`);
      console.log(`User ${socket.userId} joined tracking for booking_${bookingId}`);

      // Disconnect Recovery: Send last known location from Redis
      try {
        const { getLiveLocation, getVendorLocation } = require('../services/redisService');
        let cachedLocation = await getLiveLocation(bookingId);
        if (!cachedLocation) {
          const Booking = require('../models/Booking');
          const b = await Booking.findById(bookingId).select('vendorId workerId');
          if (b?.vendorId) {
            const vLoc = await getVendorLocation(b.vendorId);
            if (vLoc) cachedLocation = vLoc;
          }
        }
        if (cachedLocation) {
          socket.emit('live_location_update', cachedLocation);
          console.log(`[Socket] Sent cached location to user for booking ${bookingId}`);
        }
      } catch (error) {
        console.error('[Socket] Error fetching cached location:', error);
      }
    });

    // Vendor acknowledges receiving booking alert
    socket.on('booking_alert_received', async (data) => {
      try {
        const BookingRequest = require('../models/BookingRequest');
        await BookingRequest.findOneAndUpdate(
          { bookingId: data.bookingId, vendorId: socket.userId },
          { status: 'VIEWED', viewedAt: new Date(), socketDelivered: true }
        );
        console.log(`[Socket] Vendor ${socket.userId} viewed booking ${data.bookingId}`);
      } catch (error) {
        console.error('[Socket] Error updating booking request:', error);
      }
    });

    // Worker/Vendor sets availability
    socket.on('set_availability', async (data) => {
      try {
        const Vendor = require('../models/Vendor');
        const Worker = require('../models/Worker');

        if (socket.userRole === 'VENDOR') {
          await Vendor.findByIdAndUpdate(socket.userId, {
            availability: data.status // 'AVAILABLE', 'BUSY', etc.
          });
        } else if (socket.userRole === 'WORKER') {
          await Worker.findByIdAndUpdate(socket.userId, {
            status: data.status // 'ONLINE', 'BUSY', etc.
          });
        }
        console.log(`[Socket] ${socket.userRole} ${socket.userId} set availability to ${data.status}`);
      } catch (error) {
        console.error('[Socket] Error setting availability:', error);
      }
    });

    // Rate limiting map for location updates
    const locationUpdateTimestamps = new Map();

    socket.on('update_location', async (data) => {
      // data: { bookingId, lat, lng, heading }
      const lat = parseFloat(data.lat);
      const lng = parseFloat(data.lng);
      const heading = parseFloat(data.heading) || 0;

      if (isNaN(lat) || isNaN(lng)) return;

      // Rate limiting: max 1 update per 2 seconds per booking
      const rateLimitKey = `${socket.userId}:${data.bookingId}`;
      const lastUpdate = locationUpdateTimestamps.get(rateLimitKey) || 0;
      const now = Date.now();
      if (now - lastUpdate < 2000) {
        return; // Skip this update, too frequent
      }
      locationUpdateTimestamps.set(rateLimitKey, now);

      const locationPayload = {
        lat,
        lng,
        heading,
        role: socket.userRole
      };

      // DEBUG: Log the broadcast
      console.log(`[Socket] 📍 Broadcasting location to booking_${data.bookingId}:`, { lat: lat.toFixed(6), lng: lng.toFixed(6), heading });

      // 1. Broadcast to everyone in the booking room (User is listening)
      socket.to(`booking_${data.bookingId}`).emit('live_location_update', locationPayload);

      // 2. Cache in Redis with TTL for disconnect recovery
      try {
        const { setLiveLocation, setVendorLocation } = require('../services/redisService');
        await setLiveLocation(data.bookingId, locationPayload, 30); // 30 second TTL

        // Also update vendor geo cache
        if (socket.userRole === 'VENDOR') {
          await setVendorLocation(socket.userId, lat, lng);
        }
      } catch (error) {
        console.error('[Socket] Error caching live location:', error);
      }

      // 3. Save latest location to Database (for initial tracking load)
      try {
        const Vendor = require('../models/Vendor');
        const Worker = require('../models/Worker');

        const updateData = {
          location: {
            lat,
            lng,
            heading,
            updatedAt: new Date()
          },
          geoLocation: {
            type: 'Point',
            coordinates: [lng, lat]
          }
        };

        if (socket.userRole === 'VENDOR') {
          await Vendor.findByIdAndUpdate(socket.userId, updateData);
        } else if (socket.userRole === 'WORKER') {
          await Worker.findByIdAndUpdate(socket.userId, updateData);
        }
      } catch (error) {
        console.error('Error saving live location:', error);
      }
    });

    // ==========================================
    // IN-APP REAL-TIME BOOKING CHAT GATEWAY
    // ==========================================
    const chatService = require('../services/chatService');

    // 1. Join Chat Room
    socket.on('join_chat', async (data) => {
      try {
        const bookingId = typeof data === 'object' ? data.bookingId : data;
        if (!bookingId) return;

        // Unified participant authorization check
        const { booking, isReadOnly, participantRole } = await chatService.assertBookingChatParticipant(
          bookingId,
          { id: socket.userId, role: socket.userRole }
        );

        const chatRoom = `chat_booking_${bookingId.toString()}`;
        socket.join(chatRoom);
        console.log(`[Socket Chat] ${socket.userRole} ${socket.userId} joined ${chatRoom} (read-only: ${isReadOnly})`);

        // Ack to joining socket
        socket.emit('chat_joined', {
          bookingId,
          isReadOnly,
          participantRole
        });

        // Broadcast presence to other participants in the room
        socket.to(chatRoom).emit('user_presence_update', {
          bookingId,
          userId: socket.userId,
          role: socket.userRole,
          isOnline: true
        });
      } catch (err) {
        console.error('[Socket Chat] join_chat error:', err.message);
        socket.emit('chat_error', { message: err.message });
      }
    });

    // 2. Leave Chat Room
    socket.on('leave_chat', async (data) => {
      try {
        const bookingId = typeof data === 'object' ? data.bookingId : data;
        if (!bookingId) return;

        const chatRoom = `chat_booking_${bookingId.toString()}`;
        socket.leave(chatRoom);
        console.log(`[Socket Chat] ${socket.userRole} ${socket.userId} left ${chatRoom}`);

        socket.to(chatRoom).emit('user_presence_update', {
          bookingId,
          userId: socket.userId,
          role: socket.userRole,
          isOnline: false
        });
      } catch (err) {
        console.error('[Socket Chat] leave_chat error:', err.message);
      }
    });

    // 3. Send Real-Time Chat Message
    socket.on('send_chat_message', async (data, callback) => {
      try {
        const { bookingId, clientMessageId, type, text, mediaUrl } = data || {};

        const { message, isDuplicate, booking, isReadOnly } = await chatService.createMessage({
          bookingId,
          actor: { id: socket.userId, role: socket.userRole },
          clientMessageId,
          type,
          text,
          mediaUrl
        });

        const chatRoom = `chat_booking_${bookingId.toString()}`;

        // Broadcast to all sockets in the chat room (including sender or sender gets ack)
        io.to(chatRoom).emit('new_chat_message', message);

        // Send offline push notification if recipient is not in chat
        if (!isDuplicate) {
          chatService.sendOfflinePushNotification(
            io,
            booking,
            { id: socket.userId, role: socket.userRole },
            message
          );
        }

        if (typeof callback === 'function') {
          callback({ success: true, data: message, isDuplicate, isReadOnly });
        }
      } catch (err) {
        console.error('[Socket Chat] send_chat_message error:', err.message);
        if (typeof callback === 'function') {
          callback({ success: false, message: err.message });
        } else {
          socket.emit('chat_error', { message: err.message });
        }
      }
    });

    // 4. Typing Start
    socket.on('typing_start', async (data) => {
      try {
        const bookingId = typeof data === 'object' ? data.bookingId : data;
        if (!bookingId) return;

        await chatService.assertBookingChatParticipant(
          bookingId,
          { id: socket.userId, role: socket.userRole }
        );

        socket.to(`chat_booking_${bookingId.toString()}`).emit('typing_start', {
          bookingId,
          senderId: socket.userId,
          senderRole: socket.userRole
        });
      } catch (err) {
        // Silently ignore typing auth fails
      }
    });

    // 5. Typing Stop
    socket.on('typing_stop', async (data) => {
      try {
        const bookingId = typeof data === 'object' ? data.bookingId : data;
        if (!bookingId) return;

        socket.to(`chat_booking_${bookingId.toString()}`).emit('typing_stop', {
          bookingId,
          senderId: socket.userId,
          senderRole: socket.userRole
        });
      } catch (err) {
        // Silently ignore
      }
    });

    // 6. Mark Messages Read
    socket.on('mark_chat_read', async (data, callback) => {
      try {
        const { bookingId, messageIds } = data || {};
        if (!bookingId) return;

        const result = await chatService.markMessagesRead(
          bookingId,
          { id: socket.userId, role: socket.userRole },
          messageIds
        );

        // Broadcast read confirmation to chat room so sender sees blue checkmarks
        io.to(`chat_booking_${bookingId.toString()}`).emit('messages_read', result);

        if (typeof callback === 'function') {
          callback({ success: true, data: result });
        }
      } catch (err) {
        console.error('[Socket Chat] mark_chat_read error:', err.message);
        if (typeof callback === 'function') {
          callback({ success: false, message: err.message });
        }
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
      // Update online status
      if (socket.userRole === 'VENDOR') {
        updateVendorOnlineStatus(socket.userId, false, null);
      } else if (socket.userRole === 'WORKER') {
        updateWorkerOnlineStatus(socket.userId, false, null);
      }
    });
  });

  console.log('Socket.io initialized successfully');
};

// Helper function to update vendor online status
const updateVendorOnlineStatus = async (vendorId, isOnline, socketId) => {
  try {
    const Vendor = require('../models/Vendor');
    const { setVendorOnline, setVendorAvailability } = require('../services/redisService');

    const updateData = {
      isOnline,
      currentSocketId: socketId
    };

    if (isOnline) {
      updateData.availability = 'AVAILABLE';
    } else {
      updateData.lastSeenAt = new Date();
      updateData.availability = 'OFFLINE';
    }

    // Update MongoDB
    await Vendor.findByIdAndUpdate(vendorId, updateData);

    // Update Redis cache (fast lookup)
    await setVendorOnline(vendorId, isOnline);
    await setVendorAvailability(vendorId, updateData.availability);

    console.log(`[Socket] Vendor ${vendorId} is now ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
  } catch (error) {
    console.error('[Socket] Error updating vendor online status:', error);
  }
};

// Helper function to update worker online status
const updateWorkerOnlineStatus = async (workerId, isOnline, socketId) => {
  try {
    const Worker = require('../models/Worker');

    const updateData = {
      status: isOnline ? 'ONLINE' : 'OFFLINE',
      // currentSocketId: socketId // Add to model if needed
    };

    if (!isOnline) {
      updateData.lastSeenAt = new Date(); // Add to model if needed
    }

    // Update MongoDB
    await Worker.findByIdAndUpdate(workerId, updateData);

    console.log(`[Socket] Worker ${workerId} is now ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
  } catch (error) {
    console.error('[Socket] Error updating worker online status:', error);
  }
};

// Get io instance for emitting notifications
const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

module.exports = { initializeSocket, getIO };

