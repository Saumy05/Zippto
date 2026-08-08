import React, { useEffect } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AppRoutes from './routes';
import { SocketProvider } from './context/SocketContext';
import { CartProvider } from './context/CartContext';
import { CityProvider } from './context/CityContext';
import { initializePushNotifications, setupForegroundNotificationHandler } from './services/pushNotificationService';
import { LocationPermissionChecker } from './components/common';

// Global Scroll to Top component: Ensures all pages open from top (scrollTop: 0) on every route change
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant'
    });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);

  return null;
};

function App() {
  // Initialize push notifications on app load
  useEffect(() => {
    initializePushNotifications();

    // Setup foreground notification handler
    setupForegroundNotificationHandler((payload) => {
      // Dispatch update events for listening components to refresh UI
      window.dispatchEvent(new Event('vendorJobsUpdated'));
      window.dispatchEvent(new Event('vendorStatsUpdated'));
      window.dispatchEvent(new Event('workerJobsUpdated'));
      window.dispatchEvent(new Event('userBookingsUpdated'));
      window.dispatchEvent(new Event('appNotificationReceived'));
    });
  }, []);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <SocketProvider>
        <CityProvider>
          <CartProvider>
            <div className="App">
              <AppRoutes />
              <LocationPermissionChecker />
              <Toaster
                position="top-center"
                reverseOrder={false}
                toastOptions={{
                  duration: 2000,
                  style: {
                    background: '#333',
                    color: '#fff',
                    borderRadius: '10px',
                    padding: '12px 20px',
                  },
                  success: {
                    duration: 1000,
                    style: {
                      background: '#10B981',
                    },
                  },
                  error: {
                    duration: 2000,
                    style: {
                      background: '#EF4444',
                    },
                  },
                }}
              />
            </div>
          </CartProvider>
        </CityProvider>
      </SocketProvider>
    </BrowserRouter>
  );
}

export default App;
