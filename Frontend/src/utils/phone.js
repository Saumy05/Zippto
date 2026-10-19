/**
 * Normalises phone input into a bare 10-digit Indian mobile number.
 * Autofill / paste often delivers "+91 98765 43210", "919876543210" or "09876543210";
 * the +91 / 91 / 0 prefix is dropped instead of the number being truncated or rejected.
 */
export const normalizePhoneInput = (value = '') => {
  let digits = String(value).replace(/\D/g, '');
  if (digits.length > 10) digits = digits.replace(/^(91|0)/, '');
  return digits.slice(0, 10);
};
