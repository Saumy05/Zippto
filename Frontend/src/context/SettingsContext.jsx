import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const SettingsContext = createContext({
  settings: {},
  loading: true,
  isChatEnabled: true,
  isPushNotificationEnabled: true,
  isReferralEnabled: true,
  referralRewardAmount: 50,
  refereeRewardAmount: 50,
  isOnlinePaymentEnabled: true,
  isCashPaymentEnabled: true,
  isWalletPaymentEnabled: true,
  supportEmail: '',
  supportPhone: '',
  supportWhatsapp: '',
  refreshSettings: async () => {}
});

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => {
    try {
      const cached = localStorage.getItem('zippto_public_settings');
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  });
  const [loading, setLoading] = useState(!localStorage.getItem('zippto_public_settings'));

  const fetchSettings = useCallback(async () => {
    try {
      const response = await api.get('/public/config');
      if (response.data?.success && response.data?.settings) {
        const s = response.data.settings;
        setSettings(s);
        try {
          localStorage.setItem('zippto_public_settings', JSON.stringify(s));
        } catch (e) {
          console.warn('Failed to cache settings to localStorage', e);
        }
      }
    } catch (error) {
      console.warn('Failed to load global platform settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();

    // Listen for custom event if settings are updated
    const handleSettingsUpdated = () => {
      fetchSettings();
    };

    window.addEventListener('platformSettingsUpdated', handleSettingsUpdated);
    return () => {
      window.removeEventListener('platformSettingsUpdated', handleSettingsUpdated);
    };
  }, [fetchSettings]);

  const value = {
    settings,
    loading,
    isChatEnabled: settings.isChatEnabled !== false,
    isPushNotificationEnabled: settings.isPushNotificationEnabled !== false,
    isReferralEnabled: settings.isReferralEnabled !== false,
    referralRewardAmount: settings.referralRewardAmount ?? 50,
    refereeRewardAmount: settings.refereeRewardAmount ?? 50,
    isOnlinePaymentEnabled: settings.isOnlinePaymentEnabled !== false,
    isCashPaymentEnabled: settings.isCashPaymentEnabled !== false,
    isWalletPaymentEnabled: settings.isWalletPaymentEnabled !== false,
    supportEmail: settings.supportEmail || 'support@zippto.in',
    supportPhone: settings.supportPhone || '+91 78793 63299',
    supportWhatsapp: settings.supportWhatsapp || '+91 78793 63299',
    refreshSettings: fetchSettings
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export default SettingsContext;
