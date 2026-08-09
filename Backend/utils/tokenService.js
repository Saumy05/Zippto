const jwt = require('jsonwebtoken');

/**
 * Generate access token
 * @param {Object} payload - Token payload
 * @returns {string} - JWT token
 */
const generateAccessToken = (payload) => {
  const secret = process.env.JWT_SECRET || 'zippto-default-jwt-secret-key-2026';
  return jwt.sign(payload, secret, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

/**
 * Generate refresh token
 * @param {Object} payload - Token payload
 * @returns {string} - JWT refresh token
 */
const generateRefreshToken = (payload) => {
  const secret = process.env.JWT_REFRESH_SECRET || 'zippto-default-refresh-secret-key-2026';
  return jwt.sign(payload, secret, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d'
  });
};

/**
 * Generate token pair (access + refresh)
 * @param {Object} payload - Token payload
 * @returns {Object} - Token pair
 */
const generateTokenPair = (payload) => {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload)
  };
};

/**
 * Verify access token
 * @param {string} token - JWT token
 * @returns {Object} - Decoded token
 */
const verifyAccessToken = (token) => {
  const secret = process.env.JWT_SECRET || 'zippto-default-jwt-secret-key-2026';
  return jwt.verify(token, secret);
};

/**
 * Verify refresh token
 * @param {string} token - JWT refresh token
 * @returns {Object} - Decoded token
 */
const verifyRefreshToken = (token) => {
  const secret = process.env.JWT_REFRESH_SECRET || 'zippto-default-refresh-secret-key-2026';
  return jwt.verify(token, secret);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,

  /**
   * Generate temporary verification token for signup flow
   * @param {string} phone - Verified phone number
   * @returns {string} - JWT verification token
   */
  generateVerificationToken: (phone) => {
    const secret = process.env.JWT_SECRET || 'zippto-default-jwt-secret-key-2026';
    return jwt.sign({ phone, type: 'verification' }, secret, {
      expiresIn: '15m'
    });
  },

  /**
   * Verify verification token
   * @param {string} token - JWT verification token
   * @returns {string|null} - Phone number if valid, null otherwise
   */
  verifyVerificationToken: (token) => {
    try {
      const secret = process.env.JWT_SECRET || 'zippto-default-jwt-secret-key-2026';
      const decoded = jwt.verify(token, secret);
      if (decoded.type !== 'verification') return null;
      return decoded.phone;
    } catch (error) {
      return null;
    }
  }
};

