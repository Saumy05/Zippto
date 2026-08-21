const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const ChatMessage = require('../models/ChatMessage');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Service = require('../models/Service');
const UserService = require('../models/UserService');
const Settings = require('../models/Settings');
const { sendNotificationToUser, sendNotificationToVendor } = require('./firebaseAdmin');

// Allowed status mapping
const WRITABLE_STATUSES = [
  'confirmed',
  'accepted',
  'assigned',
  'journey_started',
  'visited',
  'in_progress',
  'work_done',
  'awaiting_payment'
];

const READONLY_STATUSES = [
  'completed'
];

/**
 * Unified authorization helper for in-app booking chat
 * Verifies:
 * 1. Booking exists
 * 2. Actor is an authorized participant (Customer, Vendor, Worker, or Admin)
 * 3. Booking lifecycle status permits chat
 */
const assertBookingChatParticipant = async (bookingId, actor) => {
  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    const error = new Error('Invalid Booking ID');
    error.status = 400;
    throw error;
  }

  const actorId = (actor.id || actor.userId || actor._id || '').toString();
  const actorRole = (actor.role || actor.userRole || '').toUpperCase();

  const booking = await Booking.findById(bookingId)
    .populate('userId', 'name phone profilePicture')
    .populate('vendorId', 'name businessName phone profilePhoto')
    .populate('serviceId', 'title');

  if (!booking) {
    const error = new Error('Booking not found');
    error.status = 404;
    throw error;
  }

  // Dynamic Global In-App Chat Toggle Check
  try {
    const globalSettings = await Settings.findOne({ type: 'global' }).select('isChatEnabled').lean();
    if (globalSettings && globalSettings.isChatEnabled === false && !['ADMIN', 'SUPER_ADMIN'].includes(actorRole)) {
      const error = new Error('In-App Chat Messaging is currently paused by platform administration.');
      error.status = 403;
      throw error;
    }
  } catch (settingErr) {
    if (settingErr.status === 403) throw settingErr;
  }

  let isAuthorized = false;
  let senderName = actor.name || 'Participant';

  if (actorRole === 'ADMIN' || actorRole === 'SUPER_ADMIN') {
    isAuthorized = true;
    senderName = actor.name || 'Support Admin';
    const normalizedStatus = (booking.status || '').toLowerCase();
    return {
      booking,
      isReadOnly: !WRITABLE_STATUSES.includes(normalizedStatus),
      participantRole: 'ADMIN',
      senderName
    };
  } else if (actorRole === 'USER') {
    const bookingUserId = (booking.userId?._id || booking.userId || '').toString();
    if (bookingUserId === actorId) {
      isAuthorized = true;
      senderName = booking.userId?.name || booking.customerName || actor.name || 'Customer';
    }
  } else if (actorRole === 'VENDOR') {
    const bookingVendorId = (booking.vendorId?._id || booking.vendorId || '').toString();
    if (bookingVendorId && bookingVendorId === actorId) {
      isAuthorized = true;
      senderName = booking.vendorId?.name || booking.vendorId?.businessName || actor.name || 'Service Partner';
    }
  }

  if (!isAuthorized) {
    const error = new Error('You are not authorized to participate in this chat');
    error.status = 403;
    throw error;
  }

  const normalizedStatus = (booking.status || '').toLowerCase();

  if (READONLY_STATUSES.includes(normalizedStatus)) {
    return {
      booking,
      isReadOnly: true,
      participantRole: actorRole,
      senderName
    };
  }

  if (!WRITABLE_STATUSES.includes(normalizedStatus)) {
    const error = new Error(`Chat is unavailable for this booking (Status: ${booking.status})`);
    error.status = 400;
    throw error;
  }

  return {
    booking,
    isReadOnly: false,
    participantRole: actorRole,
    senderName
  };
};

/**
 * Get paginated chat history for a booking
 */
const getChatHistory = async (bookingId, actor, { limit = 50, before = null } = {}) => {
  const { booking, isReadOnly, participantRole } = await assertBookingChatParticipant(bookingId, actor);

  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
  const query = { bookingId };

  if (before && mongoose.Types.ObjectId.isValid(before)) {
    query._id = { $lt: new mongoose.Types.ObjectId(before) };
  }

  // Fetch in descending order to get latest messages first
  const rawMessages = await ChatMessage.find(query)
    .sort({ createdAt: -1 })
    .limit(parsedLimit)
    .lean();

  // Reverse back to chronological order for client display
  const messages = [...rawMessages].reverse();

  return {
    booking: {
      id: booking._id,
      bookingNumber: booking.bookingNumber,
      status: booking.status,
      serviceName: booking.serviceName || booking.serviceId?.title,
      customer: {
        id: booking.userId?._id,
        name: booking.userId?.name || booking.customerName,
        phone: booking.userId?.phone || booking.customerPhone,
        avatar: booking.userId?.profilePicture || null
      },
      partner: booking.vendorId ? {
        id: booking.vendorId?._id,
        name: booking.vendorId?.name || booking.vendorId?.businessName,
        phone: booking.vendorId?.phone,
        avatar: booking.vendorId?.profilePhoto || null,
        rating: booking.vendorId?.rating || 4.8
      } : null
    },
    isReadOnly,
    messages,
    pagination: {
      limit: parsedLimit,
      hasMore: rawMessages.length === parsedLimit,
      oldestMessageId: rawMessages[rawMessages.length - 1]?._id || null
    }
  };
};

/**
 * Create chat message with client idempotency and multi-party read initialization
 */
const createMessage = async ({
  bookingId,
  actor,
  clientMessageId,
  type = 'TEXT',
  text = '',
  mediaUrl = null
}) => {
  if (!clientMessageId) {
    const error = new Error('clientMessageId is required for idempotency');
    error.status = 400;
    throw error;
  }

  const { booking, isReadOnly, participantRole, senderName } = await assertBookingChatParticipant(bookingId, actor);

  if (isReadOnly) {
    const error = new Error('This booking is completed. Chat is read-only.');
    error.status = 400;
    throw error;
  }

  const actorId = (actor.id || actor.userId).toString();

  // 1. Idempotency Check: Return existing if already saved
  const existingMessage = await ChatMessage.findOne({
    bookingId,
    senderId: actorId,
    clientMessageId
  }).lean();

  if (existingMessage) {
    return {
      message: existingMessage,
      isDuplicate: true,
      booking,
      isReadOnly
    };
  }

  // 2. Validate Type & Content
  const trimmedText = (text || '').trim();
  let messageType = type.toUpperCase();

  if (!['TEXT', 'IMAGE', 'IMAGE_WITH_TEXT', 'SYSTEM'].includes(messageType)) {
    messageType = 'TEXT';
  }

  if (mediaUrl && trimmedText) {
    messageType = 'IMAGE_WITH_TEXT';
  } else if (mediaUrl) {
    messageType = 'IMAGE';
  }

  if (messageType === 'TEXT' && !trimmedText) {
    const error = new Error('Message text cannot be empty');
    error.status = 400;
    throw error;
  }

  // 3. Create authoritative message in DB
  const newMessage = await ChatMessage.create({
    bookingId: booking._id,
    senderId: actorId,
    senderRole: participantRole,
    senderName,
    type: messageType,
    text: trimmedText,
    mediaUrl: mediaUrl || null,
    clientMessageId,
    readBy: [
      {
        userId: actorId,
        role: participantRole,
        readAt: new Date()
      }
    ]
  });

  return {
    message: newMessage.toObject(),
    isDuplicate: false,
    booking,
    isReadOnly
  };
};

/**
 * Mark messages as read by the current participant
 */
const markMessagesRead = async (bookingId, actor, messageIds = []) => {
  const { booking, isReadOnly } = await assertBookingChatParticipant(bookingId, actor);
  const actorId = (actor.id || actor.userId).toString();
  const actorRole = (actor.role || actor.userRole || '').toUpperCase();

  const query = {
    bookingId: booking._id,
    senderId: { $ne: actorId },
    'readBy.userId': { $ne: actorId }
  };

  if (Array.isArray(messageIds) && messageIds.length > 0) {
    const validIds = messageIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length > 0) {
      query._id = { $in: validIds };
    }
  }

  const result = await ChatMessage.updateMany(query, {
    $push: {
      readBy: {
        userId: actorId,
        role: actorRole,
        readAt: new Date()
      }
    }
  });

  return {
    success: true,
    bookingId: booking._id,
    readerId: actorId,
    readerRole: actorRole,
    updatedCount: result.modifiedCount,
    readAt: new Date()
  };
};

/**
 * Get total unread chat count across active bookings for an actor
 */
const getUnreadCount = async (actor) => {
  const actorId = (actor.id || actor.userId).toString();
  const actorRole = (actor.role || actor.userRole || '').toUpperCase();

  const bookingQuery = {
    status: { $in: WRITABLE_STATUSES }
  };

  if (actorRole === 'USER') {
    bookingQuery.userId = actorId;
  } else if (actorRole === 'VENDOR') {
    bookingQuery.vendorId = actorId;
  } else if (actorRole === 'ADMIN') {
    // Admin unreads not grouped by personal booking
    return { totalUnread: 0, bookings: [] };
  } else {
    return { totalUnread: 0, bookings: [] };
  }

  const activeBookings = await Booking.find(bookingQuery, '_id bookingNumber').lean();
  const bookingIds = activeBookings.map(b => b._id);

  if (bookingIds.length === 0) {
    return { totalUnread: 0, bookings: [] };
  }

  const unreadAgg = await ChatMessage.aggregate([
    {
      $match: {
        bookingId: { $in: bookingIds },
        senderId: { $ne: new mongoose.Types.ObjectId(actorId) },
        'readBy.userId': { $ne: new mongoose.Types.ObjectId(actorId) }
      }
    },
    {
      $group: {
        _id: '$bookingId',
        unreadCount: { $sum: 1 }
      }
    }
  ]);

  const bookingMap = new Map(activeBookings.map(b => [b._id.toString(), b.bookingNumber]));
  let totalUnread = 0;

  const bookings = unreadAgg.map(item => {
    const bId = item._id.toString();
    totalUnread += item.unreadCount;
    return {
      bookingId: bId,
      bookingNumber: bookingMap.get(bId) || bId,
      unreadCount: item.unreadCount
    };
  });

  return {
    totalUnread,
    bookings
  };
};

/**
 * Check if a participant is currently in the active booking chat room
 */
const isParticipantOnlineInChat = (io, bookingId, recipientId) => {
  try {
    if (!io) return false;
    const chatRoom = `chat_booking_${bookingId.toString()}`;
    const userPersonalRoom = `user_${recipientId.toString()}`;
    const vendorPersonalRoom = `vendor_${recipientId.toString()}`;

    const chatRoomSockets = io.sockets.adapter.rooms.get(chatRoom);
    if (!chatRoomSockets || chatRoomSockets.size === 0) return false;

    // Check if any socket in personal room is also in chat room
    for (const pRoom of [userPersonalRoom, vendorPersonalRoom]) {
      const personalSockets = io.sockets.adapter.rooms.get(pRoom);
      if (personalSockets) {
        for (const sockId of personalSockets) {
          if (chatRoomSockets.has(sockId)) {
            return true;
          }
        }
      }
    }
    return false;
  } catch (err) {
    console.error('[ChatService] Online check error:', err);
    return false;
  }
};

/**
 * Send push notification to offline recipient(s)
 */
const sendOfflinePushNotification = async (io, booking, senderActor, message) => {
  try {
    const senderRole = (senderActor.role || senderActor.userRole || '').toUpperCase();
    const senderName = message.senderName || 'Your Partner';
    const messagePreview = message.type === 'IMAGE'
      ? '📷 Sent a photo'
      : message.text || 'New message';

    const bookingIdStr = booking._id.toString();

    // Determine target recipient(s)
    if (senderRole === 'USER') {
      // Recipient is Vendor
      if (booking.vendorId) {
        const vId = (booking.vendorId._id || booking.vendorId).toString();
        const isOnline = isParticipantOnlineInChat(io, booking._id, vId);
        if (!isOnline) {
          await sendNotificationToVendor(vId, {
            title: `💬 New message from ${senderName}`,
            body: messagePreview,
            data: {
              type: 'chat_message',
              bookingId: bookingIdStr,
              link: `/vendor/booking/${bookingIdStr}`
            }
          });
        }
      }
    } else {
      // Sender is Vendor -> Recipient is Customer
      if (booking.userId) {
        const uId = (booking.userId._id || booking.userId).toString();
        const isOnline = isParticipantOnlineInChat(io, booking._id, uId);
        if (!isOnline) {
          await sendNotificationToUser(uId, {
            title: `💬 New message from ${senderName}`,
            body: messagePreview,
            data: {
              type: 'chat_message',
              bookingId: bookingIdStr,
              link: `/user/booking/${bookingIdStr}`
            }
          });
        }
      }
    }
  } catch (pushErr) {
    console.error('[ChatService] Error sending offline push notification:', pushErr);
  }
};

module.exports = {
  assertBookingChatParticipant,
  getChatHistory,
  createMessage,
  markMessagesRead,
  getUnreadCount,
  isParticipantOnlineInChat,
  sendOfflinePushNotification,
  WRITABLE_STATUSES,
  READONLY_STATUSES
};
