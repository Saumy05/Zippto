const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  type: {
    type: String,
    default: 'global',
    unique: true
  },
  visitedCharges: {
    type: Number,
    default: 0,
    min: 0
  },
  serviceGstPercentage: {
    type: Number,
    default: 18,
    min: 0,
    max: 100
  },
  partsGstPercentage: {
    type: Number,
    default: 18,
    min: 0,
    max: 100
  },
  servicePayoutPercentage: {
    type: Number,
    default: 90, // Vendor gets 90% of service base price
    min: 0,
    max: 100
  },
  partsPayoutPercentage: {
    type: Number,
    default: 100, // Vendor gets 100% of parts base price
    min: 0,
    max: 100
  },
  tdsPercentage: {
    type: Number,
    default: 1, // 1% default TDS u/s 194-O
    min: 0,
    max: 100
  },
  platformFeePercentage: {
    type: Number,
    default: 1, // 1% default platform fee
    min: 0,
    max: 100
  },
  vendorCashLimit: {
    type: Number,
    default: 10000,
    min: 0
  },
  cancellationPenalty: {
    type: Number,
    default: 49,
    min: 0
  },
  supportedLanguages: {
    type: [{
      code: { type: String, required: true },
      name: { type: String, required: true },
      nativeName: { type: String, required: true },
      flag: { type: String, default: '🇮🇳' },
      isEnabled: { type: Boolean, default: true }
    }],
    default: [
      { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', isEnabled: true },
      { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', isEnabled: true },
      { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳', isEnabled: true },
      { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳', isEnabled: true },
      { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇮🇳', isEnabled: true },
      { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳', isEnabled: true },
      { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳', isEnabled: true },
      { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳', isEnabled: true },
      { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳', isEnabled: true },
      { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳', isEnabled: true },
      { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', flag: '🇮🇳', isEnabled: true },
      { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', flag: '🇮🇳', isEnabled: true },
      { code: 'ur', name: 'Urdu', nativeName: 'اردو', flag: '🇮🇳', isEnabled: true }
    ]
  },
  maxSearchTime: {
    type: Number,
    default: 5, // 5 minutes default
    min: 1
  },
  waveDuration: {
    type: Number,
    default: 60, // 60 seconds per wave default
    min: 10
  },
  searchRadius: {
    type: Number,
    default: 10, // 10 km default search radius
    min: 1
  },
  // Razorpay Settings
  razorpayKeyId: {
    type: String,
    default: null
  },
  razorpayKeySecret: {
    type: String,
    default: null
  },
  razorpayWebhookSecret: {
    type: String,
    default: null
  },
  // Cloudinary Settings
  cloudinaryCloudName: {
    type: String,
    default: null
  },
  cloudinaryApiKey: {
    type: String,
    default: null
  },
  cloudinaryApiSecret: {
    type: String,
    default: null
  },
  // Future extensible fields
  currency: {
    type: String,
    default: 'INR'
  },

  // Billing & Invoice Configuration
  companyName: {
    type: String,
    default: 'Zippto'
  },
  companyGSTIN: {
    type: String,
    default: ''
  },
  companyPAN: {
    type: String,
    default: ''
  },
  companyAddress: {
    type: String,
    default: ''
  },
  companyCity: {
    type: String,
    default: ''
  },
  companyState: {
    type: String,
    default: ''
  },
  companyPincode: {
    type: String,
    default: ''
  },
  companyPhone: {
    type: String,
    default: ''
  },
  companyEmail: {
    type: String,
    default: ''
  },

  // Invoice Settings
  invoicePrefix: {
    type: String,
    default: 'INV'
  },
  sacCode: {
    type: String,
    default: '998599'  // Event services SAC code
  },
  currentInvoiceNumber: {
    type: Number,
    default: 0
  },

  // Support Settings
  supportEmail: {
    type: String,
    default: ''
  },
  supportPhone: {
    type: String,
    default: ''
  },
  supportWhatsapp: {
    type: String,
    default: ''
  },
  isOnlinePaymentEnabled: {
    type: Boolean,
    default: true
  },

  // Referral & Invite & Earn Configuration
  isReferralEnabled: {
    type: Boolean,
    default: true
  },
  referralRewardAmount: {
    type: Number,
    default: 50,
    min: 0
  },
  refereeRewardAmount: {
    type: Number,
    default: 50,
    min: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
