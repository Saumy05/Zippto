import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FiArrowLeft, 
  FiSliders, 
  FiSave 
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { getSettings, updateSettings } from '../../services/settingsService';
import LogoLoader from '../../../../components/common/LogoLoader';

const CustomizationSettings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);

  // Platform Feature Toggles State
  const [toggles, setToggles] = useState({
    isReferralEnabled: true,
    isOnlinePaymentEnabled: true,
    isCashPaymentEnabled: true,
    workerAutoAssignment: true,
    isPushNotificationEnabled: true,
    isChatEnabled: true,
    isB2BEnabled: true,
    isWalletPaymentEnabled: true,
    isVisitingChargesWaiverEnabled: false,
    isDefaultLocationModeEnabled: false,
    isAutoCodBlockingEnabled: true
  });

  // Nested Referral Rewards State
  const [referralRewards, setReferralRewards] = useState({
    referralRewardAmount: 50,
    refereeRewardAmount: 50
  });
  const [savingReferral, setSavingReferral] = useState(false);

  // Load global settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const res = await getSettings();
        if (res.success && res.settings) {
          const s = res.settings;
          setToggles({
            isReferralEnabled: s.isReferralEnabled !== false,
            isOnlinePaymentEnabled: s.isOnlinePaymentEnabled !== false,
            isCashPaymentEnabled: s.isCashPaymentEnabled !== false,
            workerAutoAssignment: s.workerAutoAssignment !== false,
            isPushNotificationEnabled: s.isPushNotificationEnabled !== false,
            isChatEnabled: s.isChatEnabled !== false,
            isB2BEnabled: s.isB2BEnabled !== false,
            isWalletPaymentEnabled: s.isWalletPaymentEnabled !== false,
            isVisitingChargesWaiverEnabled: s.isVisitingChargesWaiverEnabled === true,
            isDefaultLocationModeEnabled: s.isDefaultLocationModeEnabled === true,
            isAutoCodBlockingEnabled: s.isAutoCodBlockingEnabled !== false
          });

          setReferralRewards({
            referralRewardAmount: s.referralRewardAmount !== undefined ? s.referralRewardAmount : 50,
            refereeRewardAmount: s.refereeRewardAmount !== undefined ? s.refereeRewardAmount : 50
          });
        }
      } catch (err) {
        console.error('Failed to load customization settings:', err);
        toast.error('Failed to load customization settings');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // Handle single toggle change
  const handleToggle = async (key, label) => {
    const newValue = !toggles[key];
    setToggles(prev => ({ ...prev, [key]: newValue }));
    setSavingKey(key);

    try {
      await updateSettings({ [key]: newValue });
      toast.success(`${label} ${newValue ? 'Enabled' : 'Disabled'}`);
      window.dispatchEvent(new Event('platformSettingsUpdated'));
    } catch (err) {
      console.error(`Failed to update ${label}:`, err);
      toast.error(`Failed to update ${label}`);
      // Revert on error
      setToggles(prev => ({ ...prev, [key]: !newValue }));
    } finally {
      setSavingKey(null);
    }
  };

  // Handle referral reward amount save
  const handleSaveReferralRewards = async (e) => {
    e.preventDefault();
    setSavingReferral(true);
    try {
      await updateSettings({
        referralRewardAmount: Number(referralRewards.referralRewardAmount),
        refereeRewardAmount: Number(referralRewards.refereeRewardAmount)
      });
      toast.success('Referral reward amounts updated successfully');
      window.dispatchEvent(new Event('platformSettingsUpdated'));
    } catch (err) {
      console.error('Failed to save referral rewards:', err);
      toast.error('Failed to save referral rewards');
    } finally {
      setSavingReferral(false);
    }
  };

  if (loading) {
    return <LogoLoader />;
  }

  // Toggle Configuration Registry - 3 Essential Platform Toggles
  const toggleCards = [
    {
      key: 'isReferralEnabled',
      title: 'Referral & Invite Program',
      description: 'Global toggle to enable/disable automated referral rewards and bonus engine.',
      hasSubConfig: true
    },
    {
      key: 'isPushNotificationEnabled',
      title: 'Push Notification Broadcast',
      description: 'Controls real-time Firebase device push notification alerts for booking updates.'
    },
    {
      key: 'isChatEnabled',
      title: 'In-App Chat Messaging',
      description: 'Controls live customer-technician in-app chat modal during active jobs.'
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-6 pb-12"
    >
      {/* Top Header Row Matching Reference Screenshot */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={() => navigate('/admin/settings')}
          className="w-8 h-8 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 flex items-center justify-center text-gray-700 hover:text-gray-900 transition-all shadow-2xs active:scale-95 cursor-pointer"
          title="Back to Settings"
        >
          <FiArrowLeft className="w-3.5 h-3.5" />
        </button>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-lg">⚙️</span>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              Customization Settings
            </h1>
          </div>
          <p className="text-[11px] sm:text-xs text-gray-500 font-medium">
            Control global customization toggles for the platform.
          </p>
        </div>
      </div>

      {/* Main White Card Container */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200/90 shadow-2xs space-y-4">
        {/* Section Heading Inside Card */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-1.5 text-gray-800 font-bold text-xs sm:text-sm">
            <FiSliders className="w-3.5 h-3.5 text-gray-600" />
            <span>Manage All Toggles Here</span>
          </div>
          <div className="text-[10px] font-bold px-2.5 py-0.5 bg-gray-100 text-gray-700 rounded-full border border-gray-200/60">
            {Object.values(toggles).filter(Boolean).length} / {toggleCards.length} Enabled
          </div>
        </div>

        {/* 3-Column Compact Professional Toggle Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
          {toggleCards.map((card) => {
            const isEnabled = !!toggles[card.key];
            const isSaving = savingKey === card.key;

            return (
              <div
                key={card.key}
                className={`bg-[#F9FAFB] hover:bg-white rounded-xl p-3.5 border transition-all duration-200 flex flex-col justify-between ${
                  isEnabled ? 'border-gray-200/80 hover:border-gray-300 shadow-2xs' : 'border-gray-200/60 opacity-80'
                }`}
              >
                <div>
                  {/* Top Row: Title + Toggle Switch */}
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs sm:text-[13px] font-bold text-gray-900 leading-tight">
                      {card.title}
                    </h3>
                    
                    {/* iOS-Style Green/Gray Toggle Switch */}
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleToggle(card.key, card.title)}
                      className={`relative w-9 h-5 rounded-full transition-colors duration-300 shrink-0 cursor-pointer disabled:opacity-50 ${
                        isEnabled ? 'bg-[#10B981]' : 'bg-[#D1D5DB]'
                      }`}
                      title={isEnabled ? 'Click to Disable' : 'Click to Enable'}
                    >
                      <div
                        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${
                          isEnabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Bottom Row: Description */}
                  <p className="text-[11px] text-gray-500 leading-snug mt-1.5 font-normal">
                    {card.description}
                  </p>
                </div>

                {/* Sub-config for Referral Rewards if active */}
                {card.hasSubConfig && isEnabled && (
                  <form onSubmit={handleSaveReferralRewards} className="mt-2.5 pt-2 border-t border-gray-200/70 space-y-1.5">
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className="block text-[9px] font-bold text-gray-500 uppercase mb-0.5">Referrer (₹)</label>
                        <input
                          type="number"
                          min="0"
                          value={referralRewards.referralRewardAmount}
                          onChange={(e) => setReferralRewards(prev => ({ ...prev, referralRewardAmount: e.target.value }))}
                          className="w-full px-2 py-1 text-xs font-bold bg-white border border-gray-200 rounded-md outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-gray-500 uppercase mb-0.5">Referee (₹)</label>
                        <input
                          type="number"
                          min="0"
                          value={referralRewards.refereeRewardAmount}
                          onChange={(e) => setReferralRewards(prev => ({ ...prev, refereeRewardAmount: e.target.value }))}
                          className="w-full px-2 py-1 text-xs font-bold bg-white border border-gray-200 rounded-md outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={savingReferral}
                        className="px-2.5 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                      >
                        {savingReferral ? <div className="w-2.5 h-2.5 border border-white border-t-transparent rounded-full animate-spin" /> : <FiSave className="w-2.5 h-2.5" />}
                        Save ₹
                      </button>
                    </div>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

export default CustomizationSettings;
