import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

// Import sub-components
import AllVendors from './AllVendors';
import VendorBookings from './VendorBookings';
import VendorAnalytics from './VendorAnalytics';
import VendorPayments from './VendorPayments';

const Vendors = () => {
  const location = useLocation();

  return (
    <div className="space-y-6">
      {/* Page Content */}
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Routes>
          <Route index element={<Navigate to="/admin/vendors/all" replace />} />
          <Route path="all" element={<AllVendors />} />
          <Route path="bookings" element={<VendorBookings />} />
          <Route path="analytics" element={<VendorAnalytics />} />
          <Route path="payments" element={<VendorPayments />} />
          <Route path="*" element={<Navigate to="/admin/vendors/all" replace />} />
        </Routes>
      </motion.div>
    </div>
  );
};

export default Vendors;
