const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    default: null
  },
  userType: {
    type: String,
    enum: ['user', 'vendor'],
    default: 'vendor'
  },
  amount: {
    type: Number,
    required: true,
    min: [1, 'Withdrawal amount must be at least 1']
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  requestDate: {
    type: Date,
    default: Date.now
  },
  processedDate: {
    type: Date
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Admin ID
  },
  transactionReference: {
    type: String // Bank reference number or UPI ID used
  },
  adminNotes: {
    type: String
  },
  rejectionReason: {
    type: String
  },
  bankDetails: {
    accountNumber: String,
    ifscCode: String,
    accountHolderName: String,
    bankName: String,
    upiId: String
  },
  // TDS Details (calculated at approval)
  tdsRate: {
    type: Number,
    default: 0
  },
  tdsAmount: {
    type: Number,
    default: 0
  },
  platformFeeRate: {
    type: Number,
    default: 0
  },
  platformFeeAmount: {
    type: Number,
    default: 0
  },
  netAmount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

withdrawalSchema.index({ userId: 1, createdAt: -1 });
withdrawalSchema.index({ vendorId: 1, createdAt: -1 });
withdrawalSchema.index({ status: 1 });

module.exports = mongoose.model('Withdrawal', withdrawalSchema);
