import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * Protected Route Component
 * Checks if user is authenticated before allowing access.
 * The check is fully synchronous (localStorage/sessionStorage + JWT expiry),
 * so no intermediate loading screen is rendered on app open / refresh.
 */
const getKeys = (type) => {
  switch (type) {
    case 'vendor':
      return { tokenKey: 'vendorAccessToken', refreshTokenKey: 'vendorRefreshToken', dataKey: 'vendorData' };
    case 'admin':
      return { tokenKey: 'adminAccessToken', refreshTokenKey: 'adminRefreshToken', dataKey: 'adminData' };
    case 'user':
    default:
      return { tokenKey: 'accessToken', refreshTokenKey: 'refreshToken', dataKey: 'userData' };
  }
};

const readKey = (key) => sessionStorage.getItem(key) || localStorage.getItem(key);

const clearSession = ({ tokenKey, refreshTokenKey, dataKey }) => {
  [tokenKey, refreshTokenKey, dataKey].forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
};

/**
 * Returns whether the stored session is usable.
 * If the access token is expired but a refresh token exists, we let it proceed:
 * the axios interceptor in api.js refreshes it on the first request and only
 * logs out if that fails.
 */
const evaluateSession = (type) => {
  const keys = getKeys(type);
  const token = readKey(keys.tokenKey);
  const refreshToken = readKey(keys.refreshTokenKey);
  const userData = readKey(keys.dataKey);

  if (!token && !userData) return { authenticated: false, expired: false };
  if (!token || !userData) return { authenticated: false, expired: true };

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return { authenticated: false, expired: true };

    const payload = JSON.parse(atob(parts[1]));
    const currentTime = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp > currentTime) return { authenticated: true, expired: false };
    if (refreshToken) return { authenticated: true, expired: false };
    return { authenticated: false, expired: true };
  } catch (error) {
    console.error('Token validation error:', error);
    return { authenticated: false, expired: true };
  }
};

const ProtectedRoute = ({ children, userType = 'user', redirectTo = null }) => {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(() => evaluateSession(userType).authenticated);

  useEffect(() => {
    const { authenticated, expired } = evaluateSession(userType);
    if (expired) {
      console.log('Session truly expired, clearing auth data');
      clearSession(getKeys(userType));
    }
    setIsAuthenticated(authenticated);
  }, [userType, location.pathname]);

  if (!isAuthenticated) {
    // Determine redirect path
    const defaultRedirects = {
      user: '/user/login',
      vendor: '/vendor/login',
      admin: '/admin/login'
    };

    const redirectPath = redirectTo || defaultRedirects[userType] || '/user/login';

    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
