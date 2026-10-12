const City = require('../models/City');

/**
 * City scoping for admin panels.
 *
 * A super admin, or an admin with no city assigned, sees every city (scope = null).
 * An admin assigned to a city only sees users, vendors and bookings whose address city matches that city.
 * Matching is done on the address city *name* (case-insensitive), because that is how addresses store it.
 */
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getCityScope = async (req) => {
  if (req._cityScope !== undefined) return req._cityScope;

  const admin = req.user;
  let scope = null;
  if (admin && admin.role !== 'super_admin' && admin.cityId) {
    let name = admin.cityName;
    if (!name) {
      const city = await City.findById(admin.cityId).select('name').lean();
      name = city?.name;
    }
    // Fail closed: an assigned city we cannot resolve must never widen access to all cities
    scope = {
      cityId: String(admin.cityId),
      cityName: name || '',
      regex: new RegExp(`^\\s*${escapeRegex(name || '\u0000__unresolved__')}\\s*$`, 'i')
    };
  }
  req._cityScope = scope;
  return scope;
};

// Mongo filter fragments (empty object when the admin is not city-scoped)
const bookingScope = (scope) => (scope ? { 'address.city': scope.regex } : {});
const vendorScope = (scope) => (scope ? { 'address.city': scope.regex } : {});
const userScope = (scope) => (scope ? { 'addresses.city': scope.regex } : {});

// Single-document checks for detail/update endpoints
const bookingInScope = (scope, booking) => !scope || scope.regex.test(booking?.address?.city || '');
const vendorInScope = (scope, vendor) => !scope || scope.regex.test(vendor?.address?.city || '');
const userInScope = (scope, user) => !scope || (user?.addresses || []).some((a) => scope.regex.test(a?.city || ''));

/** Ids of users/vendors inside the scope, for collections that only reference them by id (tickets, settlements...). */
const scopedUserIds = async (scope) => {
  if (!scope) return null;
  const User = require('../models/User');
  return (await User.find(userScope(scope)).select('_id').lean()).map((u) => u._id);
};
const scopedVendorIds = async (scope) => {
  if (!scope) return null;
  const Vendor = require('../models/Vendor');
  return (await Vendor.find(vendorScope(scope)).select('_id').lean()).map((v) => v._id);
};

const notFound = (res, what = 'Resource') =>
  res.status(404).json({ success: false, message: `${what} not found` });

module.exports = {
  getCityScope, bookingScope, vendorScope, userScope,
  bookingInScope, vendorInScope, userInScope,
  scopedUserIds, scopedVendorIds, notFound
};
