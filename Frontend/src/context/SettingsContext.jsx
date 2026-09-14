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

    // 1. Same-tab CustomEvent listener
    const handleSettingsUpdated = (e) => {
      if (e?.detail?.settings) {
        setSettings(prev => ({ ...prev, ...e.detail.settings }));
      } else {
        fetchSettings();
      }
    };
    window.addEventListener('platformSettingsUpdated', handleSettingsUpdated);

    // 2. Cross-tab storage listener (when localStorage changes in another tab)
    const handleStorageChange = (e) => {
      if (e.key === 'zippto_public_settings' && e.newValue) {
        try {
          setSettings(JSON.parse(e.newValue));
        } catch {
          fetchSettings();
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // 3. Instant zero-latency cross-tab synchronization via BroadcastChannel
    let channel;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        channel = new BroadcastChannel('zippto_settings_sync');
        channel.onmessage = (event) => {
          if (event.data?.type === 'SETTINGS_UPDATED' && event.data?.settings) {
            setSettings(prev => ({ ...prev, ...event.data.settings }));
            try {
              localStorage.setItem('zippto_public_settings', JSON.stringify(event.data.settings));
            } catch (err) {}
          } else {
            fetchSettings();
          }
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel not supported', e);
    }

    return () => {
      window.removeEventListener('platformSettingsUpdated', handleSettingsUpdated);
      window.removeEventListener('storage', handleStorageChange);
      if (channel) {
        channel.close();
      }
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

export const broadcastSettingsUpdate = (updatedSettings) => {
  if (!updatedSettings) return;

  try {
    localStorage.setItem('zippto_public_settings', JSON.stringify(updatedSettings));
  } catch (e) {
    console.warn('Failed to update localStorage with new settings', e);
  }

  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel('zippto_settings_sync');
      channel.postMessage({ type: 'SETTINGS_UPDATED', settings: updatedSettings });
      channel.close();
    }
  } catch (e) {
    console.warn('Failed to broadcast settings update', e);
  }

  try {
    window.dispatchEvent(new CustomEvent('platformSettingsUpdated', { detail: { settings: updatedSettings } }));
  } catch (e) {
    console.warn('Failed to dispatch platformSettingsUpdated event', e);
  }
};

export default SettingsContext;
