const Settings = require('../models/Settings');
const cloudinary = require('../config/cloudinary');
const { decrypt } = require('../utils/secretBox');

// Admin-entered keys (Settings) override .env. The cache is refreshed at boot and whenever settings are saved,
// so a key change in the admin panel applies immediately without a restart.
let cache = { razorpay: {}, cloudinary: {} };
const listeners = [];

const pick = (dbValue, envValue) => (dbValue && String(dbValue).trim() ? String(dbValue).trim() : (envValue || ''));

const refreshGatewayCredentials = async () => {
  let s = {};
  try {
    s = (await Settings.findOne({ type: 'global' }).lean()) || {};
  } catch (e) {
    console.error('[gatewayCredentials] Could not read settings, using .env only:', e.message);
  }

  cache = {
    razorpay: {
      keyId: pick(s.razorpayKeyId, process.env.RAZORPAY_KEY_ID),
      keySecret: pick(decrypt(s.razorpayKeySecret), process.env.RAZORPAY_KEY_SECRET),
      webhookSecret: pick(decrypt(s.razorpayWebhookSecret), process.env.RAZORPAY_WEBHOOK_SECRET)
    },
    cloudinary: {
      cloudName: pick(s.cloudinaryCloudName, process.env.CLOUDINARY_CLOUD_NAME),
      apiKey: pick(s.cloudinaryApiKey, process.env.CLOUDINARY_API_KEY),
      apiSecret: pick(decrypt(s.cloudinaryApiSecret), process.env.CLOUDINARY_API_SECRET)
    }
  };

  // cloudinary v2 keeps one global config shared by every module that requires it
  const c = cache.cloudinary;
  if (c.cloudName && c.apiKey && c.apiSecret) {
    cloudinary.config({ cloud_name: c.cloudName, api_key: c.apiKey, api_secret: c.apiSecret });
  }

  listeners.forEach((fn) => { try { fn(cache); } catch (e) { /* listener errors must not break a save */ } });
  return cache;
};

const getRazorpayCredentials = () => cache.razorpay;
const isCloudinaryConfigured = () => {
  const c = cache.cloudinary;
  return Boolean(c.cloudName && c.apiKey && c.apiSecret);
};
const onGatewayCredentialsChange = (fn) => listeners.push(fn);

// Until the first DB read completes, fall back to .env so early requests still work
cache = {
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || ''
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || ''
  }
};

module.exports = { refreshGatewayCredentials, getRazorpayCredentials, isCloudinaryConfigured, onGatewayCredentialsChange };
