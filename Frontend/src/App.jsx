import React, { useEffect } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { Toaster, useToasterStore, toast } from 'react-hot-toast';
import AppRoutes from './routes';
import { SocketProvider } from './context/SocketContext';
import { CartProvider } from './context/CartContext';
import { CityProvider } from './context/CityContext';
import { LanguageProvider } from './context/LanguageContext';
import { SettingsProvider } from './context/SettingsContext';
import { initializePushNotifications, setupForegroundNotificationHandler } from './services/pushNotificationService';
import { LocationPermissionChecker, LanguageSelectorModal } from './components/common';

// Global component to strictly limit active toasts to maximum 1 at any time
const SingleToastEnforcer = () => {
  const { toasts } = useToasterStore();

  useEffect(() => {
    toasts
      .filter((t) => t.visible)
      .slice(1) // Keep only the newest toast (index 0) and dismiss any previous toasts
      .forEach((t) => toast.dismiss(t.id));
  }, [toasts]);

  return null;
};

// Global Scroll to Top component: Clean, instant scroll to top without smooth-scroll conflict jitter
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    document.documentElement.style.scrollBehavior = 'smooth';
  }, [pathname]);

  return null;
};

function App() {
  // Initialize push notifications on app load
  useEffect(() => {
    initializePushNotifications();

    // Setup foreground notification handler
    setupForegroundNotificationHandler((payload) => {
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
      <SettingsProvider>
        <LanguageProvider>
          <SocketProvider>
            <CityProvider>
              <CartProvider>
                <div className="App">
                  <AppRoutes />
                  <LocationPermissionChecker />
                  <LanguageSelectorModal />
                  <SingleToastEnforcer />
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
        </LanguageProvider>
      </SettingsProvider>
    </BrowserRouter>
  );
}

export default App;
