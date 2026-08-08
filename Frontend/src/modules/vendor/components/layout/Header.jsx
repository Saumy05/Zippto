import React, { memo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiBell, FiSearch } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { vendorTheme as themeColors } from '../../../../theme';
import Logo from '../../../../components/common/Logo';
import api from '../../../../services/api';

const Header = memo(({
  title,
  onBack,
  showBack = true,
  showSearch = false,
  showNotifications = true,
  notificationCount = 0
}) => {
  const navigate = useNavigate();
  const [count, setCount] = useState(notificationCount);

  // Sync prop changes
  useEffect(() => {
    if (typeof notificationCount !== 'undefined') {
      setCount(notificationCount);
    }
  }, [notificationCount]);

  // Fetch unread count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const res = await api.get('/notifications/vendor');
        if (res.data.success && typeof res.data.unreadCount === 'number') {
          setCount(res.data.unreadCount);
        }
      } catch (error) {
        // Silent fail
      }
    };

    if (showNotifications) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 60000); // Poll every minute
      return () => clearInterval(interval);
    }
  }, [showNotifications]);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  const handleNotifications = () => {
    navigate('/vendor/notifications');
  };

  const handleLogoClick = () => {
    navigate('/vendor/dashboard');
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        {/* Left: Back button or Logo */}
        <div className="flex items-center gap-3">
          {showBack ? (
            <motion.button
              onClick={handleBack}
              className="p-2 rounded-xl bg-slate-100/80 text-slate-700 hover:bg-slate-200/80 transition-colors"
              whileTap={{ scale: 0.95 }}
            >
              <FiArrowLeft className="w-5 h-5" style={{ color: themeColors.button }} />
            </motion.button>
          ) : (
            <div className="flex items-center gap-3">
              <motion.div
                className="cursor-pointer flex items-center gap-2"
                onClick={handleLogoClick}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.2 }}
              >
                <Logo className="h-10 w-auto" />
              </motion.div>
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Vendor Portal • Online</span>
              </div>
            </div>
          )}
          {showBack && <h1 className="text-lg font-bold text-slate-900">{title || 'Vendor'}</h1>}
        </div>

        {/* Right: Search and Notifications */}
        <div className="flex items-center gap-2.5">
          {showSearch && (
            <button
              className="p-2 rounded-xl bg-slate-100/80 text-slate-600 hover:bg-slate-200/80 transition-colors active:scale-95"
              onClick={() => navigate('/vendor/jobs')}
            >
              <FiSearch className="w-5 h-5" style={{ color: themeColors.button }} />
            </button>
          )}
          {showNotifications && (
            <motion.div
              className="relative rounded-xl cursor-pointer"
              style={{
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.button
                onClick={handleNotifications}
                className="relative z-10 w-full h-full rounded-xl flex items-center justify-center bg-slate-100/80 hover:bg-slate-200/80 border border-slate-200/60 transition-colors"
              >
                <FiBell
                  className="w-5 h-5"
                  style={{
                    color: count > 0 ? '#EF4444' : themeColors.button,
                  }}
                />
              </motion.button>
              {count > 0 && (
                <span
                  className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center z-20"
                  style={{
                    minWidth: '18px',
                    height: '18px',
                    boxShadow: '0 2px 6px rgba(239, 68, 68, 0.4)',
                    border: '2px solid #fff'
                  }}
                >
                  {count > 9 ? '9+' : count}
                </span>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </header>
  );
});

Header.displayName = 'VendorHeader';
export default Header;
