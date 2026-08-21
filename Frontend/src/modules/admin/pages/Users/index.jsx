import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

// Import sub-components
import AllUsers from './AllUsers';
import UserBookings from './UserBookings';
import UserAnalytics from './UserAnalytics';
import Transactions from './Transactions';

const Users = () => {
  const location = useLocation();

  return (
    <div className="space-y-6">
      {/* Content Area */}
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Routes>
          <Route index element={<Navigate to="/admin/users/all" replace />} />
          <Route path="all" element={<AllUsers />} />
          <Route path="bookings" element={<UserBookings />} />
          <Route path="analytics" element={<UserAnalytics />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="*" element={<Navigate to="/admin/users/all" replace />} />
        </Routes>
      </motion.div>
    </div>
  );
};

export default Users;
