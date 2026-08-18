import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Import module routes (SOW 3-Platform: Customer, Vendor, Admin)
import UserRoutes from '../modules/user/routes';
import VendorRoutes from '../modules/vendor/routes';
import AdminRoutes from '../modules/admin/routes';

import LandingPage from '../modules/landing/pages/LandingPage';
import BlogList from '../modules/landing/pages/BlogList';
import BlogDetail from '../modules/landing/pages/BlogDetail';
import DynamicPageView from '../modules/landing/pages/DynamicPageView';

const AppRoutes = () => {
  return (
    <Routes>
      {/* Landing Page */}
      <Route path="/Home" element={<LandingPage />} />

      {/* Public CMS & Blog Routes */}
      <Route path="/blog" element={<BlogList />} />
      <Route path="/blog/:slug" element={<BlogDetail />} />
      <Route path="/page/:slug" element={<DynamicPageView />} />

      {/* Redirect Root Slash to User App */}
      <Route path="/" element={<Navigate to="/user" replace />} />

      {/* User Routes */}
      <Route path="/user/*" element={<UserRoutes />} />

      {/* Vendor / Service Provider Routes */}
      <Route path="/vendor/*" element={<VendorRoutes />} />

      {/* Admin Routes */}
      <Route path="/admin/*" element={<AdminRoutes />} />
    </Routes>
  );
};

export default AppRoutes;

