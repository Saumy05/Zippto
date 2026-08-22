const axios = require('axios');

/**
 * Clean phone number to 10 digits for Indian providers or E.164 for international
 */
const formatPhone = (phone, withCountryCode = false) => {
  const clean = String(phone || '').replace(/\D/g, '');
  const tenDigit = clean.slice(-10);
  return withCountryCode ? `91${tenDigit}` : tenDigit;
};

/**
 * 1. Send SMS via SMS India Hub (DLT Compliant)
 */
const sendViaSMSIndiaHub = async (phone, message) => {
  const cleanPhone = formatPhone(phone, false);
  const params = {
    user: process.env.SMS_INDIA_HUB_USERNAME,
    password: process.env.SMS_INDIA_HUB_API_KEY,
    username: process.env.SMS_INDIA_HUB_USERNAME,
    apikey: process.env.SMS_INDIA_HUB_API_KEY,
    msisdn: cleanPhone,
    sid: process.env.SMS_INDIA_HUB_SENDER_ID,
    msg: message,
    fl: 0,
    gwid: 2,
  };

  if (process.env.SMS_INDIA_HUB_DLT_TEMPLATE_ID) {
    params.TemplateId = process.env.SMS_INDIA_HUB_DLT_TEMPLATE_ID;
  }

  const baseUrl = process.env.SMS_BASE_URL || 'https://cloud.smsindiahub.in/vendorsms/pushsms.aspx';
  const response = await axios.get(baseUrl, { params, timeout: 8000 });
  const data = response.data;

  let isSuccess = false;
  if (typeof data === 'object' && data !== null) {
    if (data.ErrorCode === '000' || data.ErrorMessage === 'Done' || data.ErrorMessage === 'Success') {
      isSuccess = true;
    }
  } else {
    const responseStr = String(data || '');
    if (responseStr.startsWith('Success')) {
      isSuccess = true;
    }
  }

  if (isSuccess) {
    return { success: true, provider: 'smsindiahub', data };
  } else {
    throw new Error(`SMS India Hub Error: ${JSON.stringify(data)}`);
  }
};

/**
 * 2. Send SMS via Fast2SMS (OTP & Transactional Route)
 */
const sendViaFast2SMS = async (phone, otp, message) => {
  const cleanPhone = formatPhone(phone, false);
  const apiKey = process.env.FAST2SMS_API_KEY;

  if (!apiKey) {
    throw new Error('FAST2SMS_API_KEY is missing in environment variables');
  }

  // Fast2SMS Quick OTP route
  const payload = {
    route: 'otp',
    variables_values: String(otp || ''),
    numbers: cleanPhone,
  };

  const response = await axios.post('https://www.fast2sms.com/dev/bulkV2', payload, {
    headers: {
      authorization: apiKey,
      'Content-Type': 'application/json'
    },
    timeout: 8000
  });

  if (response.data && response.data.return === true) {
    return { success: true, provider: 'fast2sms', data: response.data };
  } else {
    throw new Error(`Fast2SMS Error: ${JSON.stringify(response.data)}`);
  }
};

/**
 * 3. Send SMS via Twilio
 */
const sendViaTwilio = async (phone, message) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error('Twilio credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER) missing');
  }

  const e164Phone = `+91${formatPhone(phone, false)}`;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const params = new URLSearchParams();
  params.append('To', e164Phone);
  params.append('From', fromNumber);
  params.append('Body', message);

  const authHeader = `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`;

  const response = await axios.post(url, params.toString(), {
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    timeout: 8000
  });

  if (response.data && response.data.sid) {
    return { success: true, provider: 'twilio', sid: response.data.sid };
  } else {
    throw new Error(`Twilio Error: ${JSON.stringify(response.data)}`);
  }
};

/**
 * 4. Send SMS via MSG91 (SendOTP API)
 */
const sendViaMSG91 = async (phone, otp) => {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;

  if (!authKey) {
    throw new Error('MSG91_AUTH_KEY is missing in environment variables');
  }

  const cleanPhone = formatPhone(phone, true); // 91XXXXXXXXXX
  const url = `https://control.msg91.com/api/v5/otp?template_id=${templateId || ''}&mobile=${cleanPhone}&authkey=${authKey}&otp=${otp}`;

  const response = await axios.post(url, {}, { timeout: 8000 });

  if (response.data && (response.data.type === 'success' || response.data.message === 'OTP sent successfully')) {
    return { success: true, provider: 'msg91', data: response.data };
  } else {
    throw new Error(`MSG91 Error: ${JSON.stringify(response.data)}`);
  }
};

/**
 * Master Send SMS Function (Multi-Provider)
 * @param {string} phone - Target phone number
 * @param {string} message - Message text
 * @param {string} [otp] - Optional raw OTP code (for providers that take direct OTP variables)
 * @returns {Promise<Object>}
 */
const sendSMS = async (phone, message, otp = '') => {
  try {
    // 1. Check Mock / Bypass Mode
    if (process.env.USE_DEFAULT_OTP === 'true' || process.env.NODE_ENV === 'test') {
      console.log(`[SMS MOCK] To: ${phone} | OTP: ${otp || 'N/A'} | Msg: ${message}`);
      return { success: true, isMock: true, message: 'Mock SMS logged successfully' };
    }

    const provider = (process.env.SMS_PROVIDER || '').toLowerCase();

    // Auto-detect provider if not explicitly set
    if (provider === 'fast2sms' || (!provider && process.env.FAST2SMS_API_KEY)) {
      return await sendViaFast2SMS(phone, otp || message, message);
    }

    if (provider === 'twilio' || (!provider && process.env.TWILIO_ACCOUNT_SID)) {
      return await sendViaTwilio(phone, message);
    }

    if (provider === 'msg91' || (!provider && process.env.MSG91_AUTH_KEY)) {
      return await sendViaMSG91(phone, otp);
    }

    // Default to SMS India Hub if credentials exist
    if (process.env.SMS_INDIA_HUB_API_KEY && process.env.SMS_INDIA_HUB_SENDER_ID) {
      return await sendViaSMSIndiaHub(phone, message);
    }

    // Safe fallback if no provider keys exist
    console.warn(`[SMS] No active SMS provider configured in .env. Falling back to console log.`);
    console.log(`[SMS MOCK] To: ${phone} | OTP: ${otp || 'N/A'} | Msg: ${message}`);
    return { success: true, isMock: true, message: 'No SMS provider configured; mock logged.' };

  } catch (error) {
    console.error(`[SMS] ❌ SMS Delivery Error to ${phone}:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send OTP Verification SMS
 * @param {string} phone - Target Phone Number
 * @param {string} otp - 4 or 6 digit OTP
 * @param {string} [purpose='verification'] - Purpose text
 */
const sendOTP = async (phone, otp, purpose = 'verification') => {
  const appName = process.env.APP_NAME || 'Zippto';
  const message = `Welcome to ${appName}. Your OTP for ${purpose} is ${otp}. Valid for 10 mins. Do not share with anyone.`;

  console.log(`[SMS] Dispatching ${purpose} OTP to ${phone}...`);
  return await sendSMS(phone, message, otp);
};

module.exports = {
  sendSMS,
  sendOTP
};
