import React from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';

// Import module routes (SOW 3-Platform: Customer, Vendor, Admin)
import UserRoutes from '../modules/user/routes';
import VendorRoutes from '../modules/vendor/routes';
import AdminRoutes from '../modules/admin/routes';

import LandingPage from '../modules/landing/pages/LandingPage';
import BlogList from '../modules/landing/pages/BlogList';
import BlogDetail from '../modules/landing/pages/BlogDetail';
import DynamicPageView from '../modules/landing/pages/DynamicPageView';

const ServiceRouteRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/user/service/${id}`} replace />;
};

const CategoryRouteRedirect = () => {
  const { categorySlug } = useParams();
  return <Navigate to={`/user/category/${categorySlug}`} replace />;
};

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

      {/* Cart, Checkout & Bookings Direct Route Shortcuts */}
      <Route path="/cart" element={<Navigate to="/user/cart" replace />} />
      <Route path="/checkout" element={<Navigate to="/user/checkout" replace />} />
      <Route path="/bookings" element={<Navigate to="/user/my-bookings" replace />} />
      <Route path="/my-bookings" element={<Navigate to="/user/my-bookings" replace />} />

      {/* Service & Category Direct Route Shortcuts */}
      <Route path="/service/:id" element={<ServiceRouteRedirect />} />
      <Route path="/category/:categorySlug" element={<CategoryRouteRedirect />} />
      <Route path="/services" element={<Navigate to="/user/services" replace />} />
      <Route path="/all-services" element={<Navigate to="/user/services" replace />} />
      <Route path="/categories" element={<Navigate to="/user/services" replace />} />

      {/* User Routes */}
      <Route path="/user/*" element={<UserRoutes />} />

      {/* Vendor / Service Provider Routes */}
      <Route path="/vendor/*" element={<VendorRoutes />} />

      {/* Admin Routes */}
      <Route path="/admin/*" element={<AdminRoutes />} />

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/user" replace />} />
    </Routes>
  );
};

export default AppRoutes;

