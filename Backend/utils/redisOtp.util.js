const crypto = require('crypto');
const { getRedis, isRedisConnected } = require('../services/redisService');
const Token = require('../models/Token'); // Fallback model
const { TOKEN_TYPES } = require('./constants'); // Need to ensure constants file is reachable or define types here
// Note: imports might need adjustment based on directory structure. 
// constants is in ../utils/constants.js usually, but this file is in utils/ so ./constants

// Constants if not imported
const OTP_EXPIRY = parseInt(process.env.OTP_EXPIRY_SECONDS) || 300;
const MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS) || 3;
const RATE_LIMIT_COUNT = parseInt(process.env.OTP_RATE_LIMIT) || 3;
const RATE_LIMIT_WINDOW = parseInt(process.env.OTP_RATE_WINDOW) || 600;

/**
 * Check if a live SMS gateway is configured
 */
const hasSMSGatewayConfigured = () => {
  return !!(
    (process.env.SMS_INDIA_HUB_API_KEY && process.env.SMS_INDIA_HUB_SENDER_ID) ||
    process.env.FAST2SMS_API_KEY ||
    (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) ||
    process.env.MSG91_AUTH_KEY
  );
};

/**
 * Generate 6-digit OTP
 */
const generateOTP = () => {
  if (process.env.USE_DEFAULT_OTP === 'true') {
    return process.env.DEFAULT_OTP || '123456';
  }
  return crypto.randomInt(100000, 1000000).toString();
};

/**
 * Hash OTP using SHA-256
 */
const hashOTP = (otp) => {
  return crypto.createHash('sha256').update(otp).digest('hex');
};

/**
 * Check rate limit for phone number
 * Returns true if allowed, false if limit exceeded
 * Rate limiting uses Redis; if Redis is down it falls back to an in-process counter.
 */
const memoryRateLimits = new Map(); // phone -> { count, resetAt }

/**
 * In-process rate limit used when Redis is unavailable
 */
const checkMemoryRateLimit = (phone) => {
  const now = Date.now();
  const entry = memoryRateLimits.get(phone);
  if (!entry || entry.resetAt <= now) {
    memoryRateLimits.set(phone, { count: 1, resetAt: now + RATE_LIMIT_WINDOW * 1000 });
    return true;
  }
  entry.count += 1;
  return entry.count <= RATE_LIMIT_COUNT;
};

const checkRateLimit = async (phone) => {
  if (process.env.USE_DEFAULT_OTP === 'true') {
    return true;
  }

  const redis = getRedis();
  if (!isRedisConnected() || !redis) {
    return checkMemoryRateLimit(phone);
  }

  const key = `rate:otp:${phone}`;
  try {
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, RATE_LIMIT_WINDOW);
    }
    return current <= RATE_LIMIT_COUNT;
  } catch (err) {
    console.error('[OTP] Rate limit error:', err);
    return checkMemoryRateLimit(phone);
  }
};

/**
 * Store OTP (Redis Primary -> MongoDB Fallback)
 */
const storeOTP = async (phone, otpHash) => {
  const redis = getRedis();

  // 1. Try Redis
  if (isRedisConnected() && redis) {
    try {
      const key = `otp:${phone}`;
      const data = JSON.stringify({ hash: otpHash, attempts: 0 });
      await redis.set(key, data, 'EX', OTP_EXPIRY);
      console.log(`[OTP] Stored in Redis for ${phone}`);
      return true;
    } catch (err) {
      console.error('[OTP] Redis store failed, falling back to MongoDB:', err);
    }
  }

  // 2. Fallback to MongoDB
  try {
    // Delete existing tokens for this phone & type
    await Token.deleteMany({ phone, type: 'PHONE_VERIFICATION' });

    // Create new token
    await Token.create({
      phone,
      type: 'PHONE_VERIFICATION',
      token: otpHash, // Storing hash in token field for compatibility
      otp: otpHash,   // Also storing in otp field (hashed)
      expiresAt: new Date(Date.now() + OTP_EXPIRY * 1000),
      attempts: 0
    });
    console.log(`[OTP] Stored in MongoDB (Fallback) for ${phone}`);
    return true;
  } catch (err) {
    console.error('[OTP] MongoDB fallback failed:', err);
    throw new Error('Failed to generate OTP');
  }
};

/**
 * Verify OTP (Redis Primary -> MongoDB Fallback)
 * Returns: { success: true/false, message: string }
 */
const verifyOTP = async (phone, plainOtp) => {
  console.log(`[OTP] Verifying OTP for phone: ${phone}`);

  const cleanPhone = phone ? String(phone).replace(/\D/g, '').slice(-10) : '';

  // Default OTP check when USE_DEFAULT_OTP is enabled
  const defaultOtp = process.env.DEFAULT_OTP || '123456';
  if (
    process.env.USE_DEFAULT_OTP === 'true' &&
    (plainOtp === '123456' || plainOtp === defaultOtp)
  ) {
    console.log(`[OTP] ✅ Verification successful (USE_DEFAULT_OTP enabled) for ${phone}`);
    return { success: true };
  }

  const redis = getRedis();
  const inputHash = hashOTP(plainOtp);

  // 1. Try Redis
  if (isRedisConnected() && redis) {
    try {
      const key = `otp:${phone}`;
      const data = await redis.get(key);

      if (data) {
        console.log(`[OTP] Found in Redis for ${phone}`);
        const otpData = JSON.parse(data);

        // Check attempts
        if (otpData.attempts >= MAX_ATTEMPTS) {
          await redis.del(key);
          console.log(`[OTP] Max attempts exceeded for ${phone}`);
          return { success: false, message: 'Too many attempts. Please request new OTP.' };
        }

        // Verify Hash
        if (otpData.hash !== inputHash) {
          otpData.attempts += 1;
          // Update attempts, keep remaining TTL
          const ttl = await redis.ttl(key);
          if (ttl > 0) {
            await redis.set(key, JSON.stringify(otpData), 'EX', ttl);
          }
          console.log(`[OTP] Invalid OTP for ${phone}, attempts: ${otpData.attempts}`);
          return { success: false, message: 'Invalid OTP' };
        }

        // Success
        await redis.del(key);
        console.log(`[OTP] ✅ Verification successful for ${phone}`);
        return { success: true };
      } else {
        console.log(`[OTP] Not found in Redis for ${phone}, checking MongoDB...`);
      }
    } catch (err) {
      console.error('[OTP] Redis verify failed, trying MongoDB:', err);
    }
  }

  // 2. Check MongoDB (Fallback)
  try {
    const tokenDoc = await Token.findOne({
      $or: [{ phone }, { phone: cleanPhone }, { phone: `+91${cleanPhone}` }],
      type: 'PHONE_VERIFICATION',
      isUsed: false
    });

    if (!tokenDoc) {
      console.log(`[OTP] ❌ Not found in MongoDB for ${phone}`);
      return { success: false, message: 'Invalid or expired OTP. Please request a new one.' };
    }

    console.log(`[OTP] Found in MongoDB for ${phone}`);

    // Check expiry
    if (tokenDoc.expiresAt < new Date()) {
      await Token.deleteOne({ _id: tokenDoc._id });
      console.log(`[OTP] Expired in MongoDB for ${phone}`);
      return { success: false, message: 'OTP expired. Please request a new one.' };
    }

    // Check attempts
    if (tokenDoc.attempts >= MAX_ATTEMPTS) {
      await Token.deleteOne({ _id: tokenDoc._id });
      console.log(`[OTP] Max attempts exceeded in MongoDB for ${phone}`);
      return { success: false, message: 'Too many attempts. Please request a new one.' };
    }

    let isMatch = false;
    if (tokenDoc.otp.length === 64) {
      isMatch = tokenDoc.otp === inputHash;
    } else {
      isMatch = tokenDoc.otp === plainOtp;
    }

    if (!isMatch) {
      tokenDoc.attempts += 1;
      await tokenDoc.save();
      console.log(`[OTP] Invalid OTP in MongoDB for ${phone}, attempts: ${tokenDoc.attempts}`);
      return { success: false, message: 'Invalid OTP' };
    }

    // Success
    await Token.deleteOne({ _id: tokenDoc._id });
    console.log(`[OTP] ✅ Verification successful (MongoDB) for ${phone}`);
    return { success: true };

  } catch (err) {
    console.error('[OTP] MongoDB verify error:', err);
    return { success: false, message: 'Verification failed. Please try again.' };
  }
};

module.exports = {
  generateOTP,
  hashOTP,
  checkRateLimit,
  storeOTP,
  verifyOTP
};
