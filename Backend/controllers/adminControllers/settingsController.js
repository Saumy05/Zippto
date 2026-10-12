const Settings = require('../../models/Settings');
const Vendor = require('../../models/Vendor');
const { encrypt, mask, isMasked } = require('../../utils/secretBox');
const { refreshGatewayCredentials } = require('../../services/gatewayCredentials');

// Secrets are write-only through the API: responses show a masked value, never the real one
const SECRET_FIELDS = ['razorpayKeySecret', 'razorpayWebhookSecret', 'cloudinaryApiSecret'];

const toAdminView = (settingsDoc) => {
  const obj = settingsDoc.toObject ? settingsDoc.toObject() : { ...settingsDoc };
  SECRET_FIELDS.forEach((f) => { obj[f] = mask(obj[f]); });
  return obj;
};

// Get Global Settings
exports.getSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne({ type: 'global' });

    // If no settings exist yet, create default
    if (!settings) {
      settings = await Settings.create({ type: 'global' });
    }

    res.status(200).json({
      success: true,
      settings: toAdminView(settings)
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings'
    });
  }
};

// Fields an admin may change through PUT /admin/settings
const UPDATABLE_FIELDS = [
  // Financial
  'visitedCharges', 'serviceGstPercentage', 'partsGstPercentage', 'servicePayoutPercentage',
  'partsPayoutPercentage', 'tdsPercentage', 'platformFeePercentage', 'vendorCashLimit', 'cancellationPenalty',
  // Integrations
  'razorpayKeyId', 'razorpayKeySecret', 'razorpayWebhookSecret',
  'cloudinaryCloudName', 'cloudinaryApiKey', 'cloudinaryApiSecret',
  // Billing & invoice
  'companyName', 'companyGSTIN', 'companyPAN', 'companyAddress', 'companyCity', 'companyState',
  'companyPincode', 'companyPhone', 'companyEmail', 'invoicePrefix', 'sacCode',
  // Support
  'supportEmail', 'supportPhone', 'supportWhatsapp',
  // Booking timing
  'maxSearchTime', 'waveDuration', 'searchRadius',
  // Feature flags
  'isOnlinePaymentEnabled', 'isCashPaymentEnabled', 'isWalletPaymentEnabled', 'isPushNotificationEnabled',
  'isChatEnabled', 'isB2BEnabled', 'isVisitingChargesWaiverEnabled', 'isDefaultLocationModeEnabled',
  'isAutoCodBlockingEnabled',
  // Referral
  'isReferralEnabled', 'referralRewardAmount', 'refereeRewardAmount',
  // Languages
  'supportedLanguages'
];

// Update Global Settings
exports.updateSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne({ type: 'global' });
    if (!settings) {
      settings = new Settings({ type: 'global' });
    }

    const previousCashLimit = settings.vendorCashLimit;
    const previousSearchRadius = settings.searchRadius;

    UPDATABLE_FIELDS.forEach((field) => {
      if (req.body[field] === undefined) return;
      if (SECRET_FIELDS.includes(field)) {
        const incoming = req.body[field];
        // Blank or the masked placeholder means "keep the current secret"
        if (incoming === '' || incoming === null || isMasked(incoming)) return;
        settings[field] = encrypt(incoming);
        return;
      }
      settings[field] = req.body[field];
    });

    await settings.save();

    // Apply new gateway keys immediately (Razorpay client, Cloudinary config, webhook secret)
    if (['razorpayKeyId', ...SECRET_FIELDS, 'cloudinaryCloudName', 'cloudinaryApiKey'].some((f) => req.body[f] !== undefined)) {
      await refreshGatewayCredentials();
    }

    // Propagate to existing vendors only when the global value actually changed
    if (req.body.vendorCashLimit !== undefined && settings.vendorCashLimit !== previousCashLimit) {
      await Vendor.updateMany({}, { $set: { 'wallet.cashLimit': settings.vendorCashLimit } });
    }
    if (req.body.searchRadius !== undefined && settings.searchRadius !== previousSearchRadius) {
      await Vendor.updateMany({}, { $set: { 'settings.serviceRange': settings.searchRadius } });
    }

    res.status(200).json({
      success: true,
      message: 'System settings updated successfully',
      settings: toAdminView(settings)
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({
      success: false,
      message: error.name === 'ValidationError' ? error.message : 'Failed to update settings'
    });
  }
};
// Get Public Settings (Visited Charges, GST, Dynamic Languages, Feature Flags)
exports.getPublicSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne({ type: 'global' }).select('visitedCharges serviceGstPercentage partsGstPercentage supportEmail supportPhone supportWhatsapp cancellationPenalty companyName companyAddress companyCity companyState companyPincode companyPhone companyEmail isOnlinePaymentEnabled isCashPaymentEnabled isWalletPaymentEnabled isB2BEnabled isReferralEnabled referralRewardAmount refereeRewardAmount isPushNotificationEnabled isChatEnabled isVisitingChargesWaiverEnabled isDefaultLocationModeEnabled isAutoCodBlockingEnabled supportedLanguages');

    // Default if not found (fallback values)
    if (!settings) {
      settings = {
        visitedCharges: 0,
        serviceGstPercentage: 18,
        partsGstPercentage: 18,
        isReferralEnabled: true,
        isPushNotificationEnabled: true,
        isChatEnabled: true,
        isOnlinePaymentEnabled: true,
        isCashPaymentEnabled: true,
        isWalletPaymentEnabled: true,
        isVisitingChargesWaiverEnabled: false,
        isDefaultLocationModeEnabled: false,
        isAutoCodBlockingEnabled: true,
        referralRewardAmount: 50,
        refereeRewardAmount: 50
      };
    }

    res.status(200).json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Error fetching public settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings'
    });
  }
};
