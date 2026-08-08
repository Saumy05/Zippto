import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowLeft,
  FiBell,
  FiMail,
  FiShield,
  FiChevronRight,
  FiLogOut,
  FiTrash2,
  FiInfo,
  FiLock
} from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi';
import { toast } from 'react-hot-toast';
import { userAuthService } from '../../../../services/authService';
import { registerFCMToken, removeFCMToken } from '../../../../services/pushNotificationService';
import NotificationBell from '../../components/common/NotificationBell';

const Settings = () => {
  const navigate = useNavigate();

  // State for notification toggles
  const [notifications, setNotifications] = useState({
    push: true,
    email: true,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await userAuthService.getProfile();
      if (response.success && response.user?.settings) {
        setNotifications(prev => ({
          ...prev,
          push: response.user.settings.notifications ?? true
        }));
      }
    } catch (error) {
      console.warn('Error loading settings:', error);
    }
  };

  const handleToggle = async (key) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));

    if (key === 'push') {
      const newState = !notifications.push;
      const toastId = toast.loading(newState ? 'Enabling notifications...' : 'Disabling notifications...');

      try {
        if (newState) {
          const token = await registerFCMToken('user', true);
          if (!token) {
            toast.error('Failed to enable. Check device permissions.', { id: toastId });
            setNotifications(prev => ({ ...prev, push: false }));
            return;
          }
        } else {
          await removeFCMToken('user');
        }

        await userAuthService.updateProfile({
          settings: { notifications: newState }
        });

        toast.success(newState ? 'Notifications enabled' : 'Notifications disabled', { id: toastId });

      } catch (error) {
        toast.error('Failed to update settings', { id: toastId });
        setNotifications(prev => ({ ...prev, push: !newState }));
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827] font-sans antialiased pb-28">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -ml-20" />
      </div>

      <div className="relative z-10">
        {/* Sticky Top Header */}
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 py-3.5 shadow-2xs">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 flex items-center justify-center transition-colors active:scale-95"
                aria-label="Go back"
              >
                <FiArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-base font-extrabold text-slate-900 tracking-tight leading-none">
                  App Settings
                </h1>
                <span className="text-[10px] text-slate-500 font-semibold">Preferences & Security</span>
              </div>
            </div>
            <NotificationBell />
          </div>
        </header>

        {/* Main Content Area */}
        <main className="max-w-4xl mx-auto px-4 pt-5 space-y-5">
          
          {/* HERO BANNER CARD */}
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0B132B] via-[#1C2541] to-[#0B132B] p-5 sm:p-6 text-white shadow-md border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-black uppercase tracking-wider">
              <HiSparkles className="w-4 h-4" />
              <span>Preferences & Privacy</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
              Account & Notification Settings
            </h2>

            <p className="text-xs text-slate-300 font-medium leading-relaxed max-w-xl">
              Control instant service alerts, doorstep tracking push notifications, and account security.
            </p>

            <div className="flex flex-wrap gap-2 pt-1 text-[11px] font-bold text-slate-200">
              <span className="bg-white/10 px-2.5 py-0.5 rounded-full border border-white/15">
                ✓ Instant Push Alerts
              </span>
              <span className="bg-white/10 px-2.5 py-0.5 rounded-full border border-white/15">
                ✓ Data Encryption
              </span>
              <span className="bg-white/10 px-2.5 py-0.5 rounded-full border border-white/15">
                ✓ Account Control
              </span>
            </div>
          </section>

          {/* NOTIFICATIONS & REMINDERS SECTION */}
          <section className="space-y-2.5">
            <h3 className="text-xs font-extrabold text-slate-900 tracking-tight px-1 uppercase text-slate-400">
              Notifications & Reminders
            </h3>

            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs divide-y divide-slate-100 overflow-hidden">
              {/* Push Notifications */}
              <div className="flex items-center justify-between p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200/60">
                    <FiBell className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900">Push Notifications</h4>
                    <p className="text-xs text-slate-500 font-medium">Technician arrival alerts & live updates</p>
                  </div>
                </div>

                <button
                  onClick={() => handleToggle('push')}
                  className={`relative w-12 h-6.5 rounded-full transition-colors duration-200 p-0.5 cursor-pointer ${
                    notifications.push ? 'bg-[#0B132B]' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`block w-5 h-5 bg-amber-400 rounded-full shadow-md transition-transform duration-200 ${
                      notifications.push ? 'translate-x-5.5' : 'translate-x-0 bg-white'
                    }`}
                  />
                </button>
              </div>

              {/* Email Notifications */}
              <div className="flex items-center justify-between p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200/60">
                    <FiMail className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900">Email Invoices & Offers</h4>
                    <p className="text-xs text-slate-500 font-medium">Digital receipts and seasonal discounts</p>
                  </div>
                </div>

                <button
                  onClick={() => handleToggle('email')}
                  className={`relative w-12 h-6.5 rounded-full transition-colors duration-200 p-0.5 cursor-pointer ${
                    notifications.email ? 'bg-[#0B132B]' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`block w-5 h-5 bg-amber-400 rounded-full shadow-md transition-transform duration-200 ${
                      notifications.email ? 'translate-x-5.5' : 'translate-x-0 bg-white'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Service Alert Info Callout */}
            <div className="p-3.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 text-xs font-semibold text-slate-600 flex items-start gap-2.5">
              <FiInfo className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                Order-related SMS & push updates cannot be turned off as they are critical for real-time doorstep technician tracking.
              </span>
            </div>
          </section>

          {/* PRIVACY & SECURITY SECTION */}
          <section className="space-y-2.5">
            <h3 className="text-xs font-extrabold text-slate-900 tracking-tight px-1 uppercase text-slate-400">
              Privacy & Data Protection
            </h3>

            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs divide-y divide-slate-100 overflow-hidden">
              <button
                onClick={() => navigate('/privacy')}
                className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-slate-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200/60">
                    <FiShield className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900">Privacy Policy & Permissions</h4>
                    <p className="text-xs text-slate-500 font-medium">How your address & data are stored securely</p>
                  </div>
                </div>
                <FiChevronRight className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          </section>

          {/* ACCOUNT ACTIONS SECTION */}
          <section className="space-y-2.5">
            <h3 className="text-xs font-extrabold text-slate-900 tracking-tight px-1 uppercase text-slate-400">
              Account Management
            </h3>

            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs divide-y divide-slate-100 overflow-hidden">
              {/* Log Out */}
              <button
                onClick={async () => {
                  const confirmed = window.confirm('Are you sure you want to log out of Zippto?');
                  if (confirmed) {
                    await userAuthService.logout();
                    navigate('/user/login');
                    toast.success('Logged out successfully');
                  }
                }}
                className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-rose-50/50 transition-colors text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200/60 group-hover:scale-105 transition-transform">
                    <FiLogOut className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-rose-600">Log Out of Account</h4>
                    <p className="text-xs text-slate-500 font-medium">Sign out on this device</p>
                  </div>
                </div>
                <FiChevronRight className="w-5 h-5 text-rose-400" />
              </button>

              {/* Delete Account */}
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete your Zippto account? This action is permanent.')) {
                    toast.loading('Processing deletion request...', { id: 'del-acc' });
                    setTimeout(() => {
                      toast.error('Please contact support@zippto.in for security verification before deleting.', { id: 'del-acc' });
                    }, 1200);
                  }
                }}
                className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-slate-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200">
                    <FiTrash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-700">Delete Account</h4>
                    <p className="text-xs text-slate-400 font-medium">Permanently remove your personal data</p>
                  </div>
                </div>
                <FiChevronRight className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          </section>

        </main>
      </div>
    </div>
  );
};

export default Settings;
