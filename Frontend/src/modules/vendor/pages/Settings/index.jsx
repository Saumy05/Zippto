import React, { useState, useEffect, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBell, FiVolume2, FiGlobe, FiInfo, FiLogOut, FiTrash2, FiMapPin } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { vendorTheme as themeColors } from '../../../../theme';
import { vendorAuthService } from '../../../../services/authService';
import { registerFCMToken, removeFCMToken } from '../../../../services/pushNotificationService';
import { useLanguage } from '../../../../context/LanguageContext';
import Header from '../../components/layout/Header';
import BottomNav from '../../components/layout/BottomNav';

const Settings = () => {
  const navigate = useNavigate();
  const { currentLang, changeLanguage, supportedLanguages, openLanguageModal } = useLanguage();
  const [settings, setSettings] = useState({
    notifications: true,
    soundAlerts: true,
    language: 'en',
  });

  useLayoutEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');
    const bgStyle = themeColors.backgroundGradient;

    if (html) html.style.background = bgStyle;
    if (body) body.style.background = bgStyle;
    if (root) root.style.background = bgStyle;

    return () => {
      if (html) html.style.background = '';
      if (body) body.style.background = '';
      if (root) root.style.background = '';
    };
  }, []);

  useEffect(() => {
    const loadSettings = () => {
      try {
        const savedSettings = JSON.parse(localStorage.getItem('vendorSettings') || '{}');
        if (Object.keys(savedSettings).length > 0) {
          setSettings(prev => ({ ...prev, ...savedSettings }));
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };

    loadSettings();
  }, []);

  const handleToggle = async (key) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    localStorage.setItem('vendorSettings', JSON.stringify(updated));

    // Handle FCM Token registration/removal if notifications toggled
    if (key === 'notifications') {
      if (updated.notifications) {
        // Turning ON
        try {
          await registerFCMToken('vendor', true);
          toast.success('Notifications enabled');
        } catch (error) {
          console.error('Error enabling notifications:', error);
          toast.error('Failed to enable notifications');
          // Revert toggle if failed? For now, we keep UI in sync with intent.
        }
      } else {
        // Turning OFF
        try {
          await removeFCMToken('vendor');
          toast.success('Notifications disabled');
        } catch (error) {
          console.error('Error disabling notifications:', error);
        }
      }
    }
  };

  const handleLanguageChange = (lang) => {
    const updated = { ...settings, language: lang };
    setSettings(updated);
    localStorage.setItem('vendorSettings', JSON.stringify(updated));
  };

  const handleLogout = async () => {
    try {
      await vendorAuthService.logout();
      toast.success('Logged out successfully');
      navigate('/vendor/login');
    } catch (error) {
      // Even if API call fails, clear local storage
      localStorage.removeItem('vendorAccessToken');
      localStorage.removeItem('vendorRefreshToken');
      localStorage.removeItem('vendorData');
      toast.success('Logged out successfully');
      navigate('/vendor/login');
    }
  };

  const handleDeleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      // Clear all vendor data
      localStorage.removeItem('vendorProfile');
      localStorage.removeItem('vendorSettings');
      localStorage.removeItem('vendorWorkers');
      localStorage.removeItem('vendorAcceptedBookings');
      localStorage.removeItem('vendorWallet');
      localStorage.removeItem('vendorTransactions');
      // Navigate to home
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen pb-20" style={{ background: themeColors.backgroundGradient }}>
      <Header title="Settings" />

      <main className="px-4 py-6">
        {/* Notification Settings */}
        <div
          className="bg-white rounded-xl p-4 mb-6 shadow-md"
          style={{
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          }}
        >
          <h3 className="font-bold text-gray-800 mb-4">Notifications</h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FiBell className="w-5 h-5" style={{ color: themeColors.icon }} />
                <div>
                  <p className="font-semibold text-gray-800">Push Notifications</p>
                  <p className="text-sm text-gray-600">Receive booking alerts</p>
                </div>
              </div>
              <button
                onClick={() => handleToggle('notifications')}
                className={`relative w-12 h-6 rounded-full transition-colors ${settings.notifications ? 'bg-green-500' : 'bg-gray-300'
                  }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.notifications ? 'transform translate-x-6' : ''
                    }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FiVolume2 className="w-5 h-5" style={{ color: themeColors.icon }} />
                <div>
                  <p className="font-semibold text-gray-800">Sound Alerts</p>
                  <p className="text-sm text-gray-600">Play sound for new bookings</p>
                </div>
              </div>
              <button
                onClick={() => handleToggle('soundAlerts')}
                className={`relative w-12 h-6 rounded-full transition-colors ${settings.soundAlerts ? 'bg-green-500' : 'bg-gray-300'
                  }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.soundAlerts ? 'transform translate-x-6' : ''
                    }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Address Management */}
        <div
          className="bg-white rounded-xl p-4 mb-6 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
          style={{
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          }}
          onClick={() => navigate('/vendor/address-management')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FiMapPin className="w-5 h-5" style={{ color: themeColors.icon }} />
              <div>
                <p className="font-semibold text-gray-800">Manage Address</p>
                <p className="text-sm text-gray-600">Set your business location</p>
              </div>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>

        {/* Language Settings */}
        <div
          className="bg-white rounded-xl p-4 mb-6 shadow-md"
          style={{
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <FiGlobe className="w-5 h-5" style={{ color: themeColors.icon }} />
              <div>
                <h3 className="font-bold text-gray-800">App Language</h3>
                <p className="text-xs text-gray-500">Choose your preferred language</p>
              </div>
            </div>
            <button
              onClick={openLanguageModal}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 hover:bg-teal-100"
            >
              Change Language
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {supportedLanguages.slice(0, 6).map((lang) => {
              const isSelected = currentLang === lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  className={`py-2.5 px-3 rounded-xl text-left border transition-all text-xs font-bold flex items-center justify-between ${
                    isSelected
                      ? 'text-white border-transparent'
                      : 'bg-gray-50 text-gray-700 border-gray-100 hover:bg-gray-100'
                  }`}
                  style={
                    isSelected
                      ? {
                        backgroundColor: themeColors.button,
                      }
                      : {}
                  }
                >
                  <span className="truncate">{lang.nativeName}</span>
                  <span className="text-[10px] opacity-75">{lang.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* About */}
        <div
          className="bg-white rounded-xl p-4 mb-6 shadow-md"
          style={{
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <FiInfo className="w-5 h-5" style={{ color: themeColors.icon }} />
            <h3 className="font-bold text-gray-800">About</h3>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-gray-600">App Version: 1.0.0</p>
            <p className="text-sm text-gray-600">Vendor App</p>
          </div>
        </div>

        {/* Logout */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleLogout();
          }}
          className="w-full py-4 rounded-xl font-semibold text-white mb-4 flex items-center justify-center gap-2 transition-all active:scale-95"
          style={{
            background: themeColors.button,
            boxShadow: `0 4px 12px ${themeColors.button}40`,
            cursor: 'pointer'
          }}
        >
          <FiLogOut className="w-5 h-5" />
          Logout
        </button>

        {/* Delete Account */}
        <button
          onClick={handleDeleteAccount}
          className="w-full py-4 rounded-xl font-semibold text-red-600 border-2 border-red-600 transition-all active:scale-95"
        >
          <div className="flex items-center justify-center gap-2">
            <FiTrash2 className="w-5 h-5" />
            Delete Account
          </div>
        </button>
      </main>

      <BottomNav />
    </div>
  );
};

export default Settings;

