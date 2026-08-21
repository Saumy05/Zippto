const mongoose = require('mongoose');

/**
 * ChatMessage Model
 * Stores in-app real-time chat messages between Customers, Vendors, and Admins for active bookings.
 */
const chatMessageSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: [true, 'Booking ID is required'],
    index: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Sender ID is required'],
    index: true
  },
  senderRole: {
    type: String,
    enum: ['USER', 'VENDOR', 'ADMIN'],
    required: [true, 'Sender role is required'],
    index: true
  },
  senderName: {
    type: String,
    required: [true, 'Sender name is required'],
    trim: true
  },
  type: {
    type: String,
    enum: ['TEXT', 'IMAGE', 'IMAGE_WITH_TEXT', 'SYSTEM'],
    default: 'TEXT',
    index: true
  },
  text: {
    type: String,
    trim: true,
    maxlength: [2000, 'Message cannot exceed 2000 characters'],
    default: ''
  },
  mediaUrl: {
    type: String,
    default: null
  },
  clientMessageId: {
    type: String,
    required: [true, 'Client message ID is required for idempotency'],
    index: true
  },
  readBy: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
      },
      role: {
        type: String,
        enum: ['USER', 'VENDOR', 'ADMIN'],
        required: true
      },
      readAt: {
        type: Date,
        default: Date.now
      }
    }
  ]
}, {
  timestamps: true
});

// Compound Indexes for fast history queries and scalable multi-participant read receipts
chatMessageSchema.index({ bookingId: 1, createdAt: 1 });
chatMessageSchema.index({ bookingId: 1, _id: 1 });
chatMessageSchema.index({ bookingId: 1, 'readBy.userId': 1 });

// Unique compound index for client idempotency (prevents duplicate messages on network retries)
chatMessageSchema.index({ bookingId: 1, senderId: 1, clientMessageId: 1 }, { unique: true });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
