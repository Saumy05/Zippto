const Settings = require('../models/Settings');

const FLAG_DEFAULTS = {
  isOnlinePaymentEnabled: true,
  isCashPaymentEnabled: true,
  isWalletPaymentEnabled: true,
  isVisitingChargesWaiverEnabled: false,
  isDefaultLocationModeEnabled: false,
  isAutoCodBlockingEnabled: true
};

/**
 * Reads the global settings document and applies defaults for any flag that is not set yet.
 * Always resolves (falls back to defaults) so a settings read never breaks a booking/payment flow.
 */
const getPlatformFlags = async () => {
  try {
    const s = await Settings.findOne({ type: 'global' }).lean();
    return { ...FLAG_DEFAULTS, ...Object.fromEntries(Object.keys(FLAG_DEFAULTS).filter(k => s && s[k] !== undefined).map(k => [k, s[k]])), _doc: s || {} };
  } catch (e) {
    console.error('[platformSettings] read failed, using defaults:', e.message);
    return { ...FLAG_DEFAULTS, _doc: {} };
  }
};

/** Express guard: rejects with 403 when the given feature flag has been switched off by an admin. */
const requireFlag = (flag, message) => async (req, res, next) => {
  const flags = await getPlatformFlags();
  if (flags[flag] === false) {
    return res.status(403).json({ success: false, code: 'FEATURE_DISABLED', message });
  }
  next();
};

module.exports = { getPlatformFlags, requireFlag, FLAG_DEFAULTS };
