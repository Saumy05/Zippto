import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * Public Route Component
 * Redirects to dashboard if user is already authenticated.
 * The check is synchronous so no loading screen flashes before the page renders.
 */
const KEYS = {
  vendor: { tokenKey: 'vendorAccessToken', refreshTokenKey: 'vendorRefreshToken', dataKey: 'vendorData' },
  admin: { tokenKey: 'adminAccessToken', refreshTokenKey: 'adminRefreshToken', dataKey: 'adminData' },
  user: { tokenKey: 'accessToken', refreshTokenKey: 'refreshToken', dataKey: 'userData' }
};

const clearKeys = (keys) => {
  Object.values(keys).forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
};

const checkAuth = (userType) => {
  const keys = KEYS[userType] || KEYS.user;
  const { tokenKey, refreshTokenKey, dataKey } = keys;

  const token = sessionStorage.getItem(tokenKey) || localStorage.getItem(tokenKey);
  const refreshToken = sessionStorage.getItem(refreshTokenKey) || localStorage.getItem(refreshTokenKey);
  const userData = sessionStorage.getItem(dataKey) || localStorage.getItem(dataKey);

  if (!token || !userData) {
    if (token && !userData) {
      // Orphan token without user data - clear it
      localStorage.removeItem(tokenKey);
      sessionStorage.removeItem(tokenKey);
    }
    return false;
  }

  try {
    // Decode JWT token to check expiry and role
    const parts = token.split('.');
    if (parts.length !== 3) {
      localStorage.removeItem(tokenKey);
      sessionStorage.removeItem(tokenKey);
      return false;
    }

    const payload = JSON.parse(atob(parts[1]));
    const currentTime = Date.now() / 1000;

    // JWT role is upper-case (USER / VENDOR / ADMIN) - compare case-insensitively
    const expectedRole = KEYS[userType] ? userType : 'user';
    if (String(payload.role || '').toLowerCase() !== expectedRole) return false;

    if (!payload.exp || payload.exp <= currentTime) {
      // Expired access token: the session is still alive if a refresh token exists
      // (the axios interceptor renews it on the first request). Never wipe it here.
      if (refreshToken) return true;
      clearKeys(keys);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Token validation error:', error);
    localStorage.removeItem(tokenKey);
    sessionStorage.removeItem(tokenKey);
    return false;
  }
};

const PublicRoute = ({ children, userType = 'user', redirectTo = null }) => {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(() => checkAuth(userType));

  useEffect(() => {
    setIsAuthenticated(checkAuth(userType));
  }, [userType, location.pathname]);

  if (isAuthenticated) {
    // Determine redirect path
    const defaultRedirects = {
      user: '/user',
      vendor: '/vendor/dashboard',
      admin: '/admin/dashboard'
    };

    const redirectPath = redirectTo || location.state?.from?.pathname || defaultRedirects[userType] || '/user';
    return <Navigate to={redirectPath} replace />;
  }

  return children;
};

export default PublicRoute;
