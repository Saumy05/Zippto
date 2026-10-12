const crypto = require('crypto');

// Encrypts admin-entered API secrets before they are stored in MongoDB (AES-256-GCM).
// The key is derived from SETTINGS_ENCRYPTION_KEY, falling back to JWT_SECRET.
const PREFIX = 'enc:v1:';

const getKey = () => {
  const material = process.env.SETTINGS_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!material) return null;
  return crypto.createHash('sha256').update(material).digest();
};

const encrypt = (plain) => {
  if (!plain) return plain;
  const key = getKey();
  if (!key) return plain; // no key material available: store as-is rather than lose the secret
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  return PREFIX + Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64');
};

/** Returns the plain text, or null if the value was encrypted with a key we no longer have. */
const decrypt = (stored) => {
  if (!stored) return stored;
  if (!String(stored).startsWith(PREFIX)) return stored; // legacy plain-text value
  const key = getKey();
  if (!key) return null;
  try {
    const raw = Buffer.from(String(stored).slice(PREFIX.length), 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8');
  } catch (e) {
    return null;
  }
};

const mask = (value) => {
  const plain = decrypt(value);
  if (!plain) return '';
  return `••••••••${plain.slice(-4)}`;
};

const isMasked = (value) => typeof value === 'string' && value.startsWith('••••');

module.exports = { encrypt, decrypt, mask, isMasked };
