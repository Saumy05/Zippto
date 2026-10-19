/* Where each admin notification should take the admin when clicked */
const TYPE_ROUTES = {
  vendor_approval_request:    '/admin/vendors/all',
  vendor_withdrawal_request:  '/admin/settlements',
  vendor_settlement_request:  '/admin/settlements',
  vendor_cash_limit_exceeded: '/admin/settlements',
  payment_received:           '/admin/payments',
  broadcast:                  '/admin/notifications/messages',
};

const RELATED_ROUTES = {
  booking:    '/admin/bookings',
  vendor:     '/admin/vendors/all',
  user:       '/admin/users/all',
  withdrawal: '/admin/settlements',
  payment:    '/admin/payments',
};

export const getNotificationRoute = (n) => {
  if (n.actionUrl?.startsWith('/admin')) return n.actionUrl;
  if (TYPE_ROUTES[n.type]) return TYPE_ROUTES[n.type];
  if (n.type?.includes('booking')) return '/admin/bookings';
  return RELATED_ROUTES[n.relatedType] || '/admin/dashboard';
};
