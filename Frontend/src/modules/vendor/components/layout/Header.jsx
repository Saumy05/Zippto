import React, { memo, useState, useEffect } from 'react';
import { useNavigate, useLocation, NavLink, Link } from 'react-router-dom';
import { FiArrowLeft, FiBell, FiMapPin, FiChevronDown } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { LanguageToggle } from '../../../../components/common/LanguageSelectorModal';
import api from '../../../../services/api';

const Header = memo(({
  title,
  onBack,
  showBack = false,
  showNotifications = true,
  notificationCount = 0
}) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [count, setCount] = useState(notificationCount);
  const [vendorInfo, setVendorInfo] = useState(() => {
    try {
      const stored = localStorage.getItem('vendorData') || localStorage.getItem('vendorProfile');
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          name: parsed.name || parsed.ownerName || 'Partner',
          businessName: parsed.businessName || '',
          city: parsed.city || (parsed.address && (typeof parsed.address === 'object' ? parsed.address.city : parsed.address)) || 'Active Hub',
          avatar: parsed.profilePhoto || parsed.avatar || null
        };
      }
    } catch (e) {}
    return { name: 'Partner', businessName: '', city: 'Active Hub', avatar: null };
  });

  // Sync notification prop
  useEffect(() => {
    if (typeof notificationCount !== 'undefined') {
      setCount(notificationCount);
    }
  }, [notificationCount]);

  // Fetch Vendor Profile & Live Unread Notifications
  useEffect(() => {
    const fetchVendorData = async () => {
      try {
        const res = await api.get('/vendors/profile');
        if (res.data?.success && res.data?.data) {
          const v = res.data.data;
          const cityVal = v.city || (v.address && (typeof v.address === 'object' ? v.address.city : v.address)) || 'Active Hub';
          setVendorInfo({
            name: v.name || v.ownerName || 'Partner',
            businessName: v.businessName || '',
            city: typeof cityVal === 'string' ? cityVal.split(',')[0].trim() : 'Active Hub',
            avatar: v.profilePhoto || v.avatar || null
          });
        }
      } catch (error) {
        // Fallback to local storage
      }
    };
    fetchVendorData();

    const fetchUnreadCount = async () => {
      try {
        const token = localStorage.getItem('vendorAccessToken');
        if (!token) {
          setCount(0);
          return;
        }
        let unread = 0;
        try {
          const countRes = await api.get('/notifications/unread-count');
          if (countRes.data && typeof countRes.data.unreadCount === 'number') {
            unread = countRes.data.unreadCount;
          }
        } catch (_) {
          const res = await api.get('/notifications/vendor?isRead=false&limit=1');
          if (res.data?.success && typeof res.data?.unreadCount === 'number') {
            unread = res.data.unreadCount;
          }
        }
        setCount(Math.max(0, unread));
      } catch (error) {
        // Silent fail
      }
    };

    if (showNotifications) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000);

      window.addEventListener('vendorNotificationsUpdated', fetchUnreadCount);
      window.addEventListener('vendorNotificationsChanged', fetchUnreadCount);
      window.addEventListener('focus', fetchUnreadCount);

      return () => {
        clearInterval(interval);
        window.removeEventListener('vendorNotificationsUpdated', fetchUnreadCount);
        window.removeEventListener('vendorNotificationsChanged', fetchUnreadCount);
        window.removeEventListener('focus', fetchUnreadCount);
      };
    }
  }, [showNotifications]);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  const isDashboard = pathname.startsWith('/vendor/dashboard');
  const vendorInitial = vendorInfo.name ? vendorInfo.name.charAt(0).toUpperCase() : 'P';
  const displayCity = vendorInfo.city && vendorInfo.city !== 'undefined' ? vendorInfo.city : 'Partner Hub';

  return (
    <header className="sticky-header sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* 1. LEFT BRANDING & LOCATION AREA */}
        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
          {showBack ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <motion.button
                onClick={handleBack}
                whileTap={{ scale: 0.94 }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200/80 text-slate-700 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                title="Go Back"
              >
                <FiArrowLeft className="w-4 h-4" />
              </motion.button>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-black text-slate-900 truncate leading-tight">
                  {title || 'Partner Portal'}
                </h1>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <Link to="/vendor/dashboard" className="shrink-0 focus:outline-none group" aria-label="Zippto Partner home">
                <img
                  src="/zippto_logo.png"
                  alt="ZIPPTO"
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl object-contain shadow-xs transition-transform group-hover:scale-105"
                />
              </Link>

              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-[#0B132B] leading-tight truncate">
                  {title || 'Partner Portal'}
                </h1>
                {isDashboard ? (
                  /* Location Pin & Hub Selector (dashboard only) */
                  <Link
                    to="/vendor/address-management"
                    className="flex items-center gap-1 cursor-pointer group min-w-0 rounded-lg hover:text-slate-900 transition-colors"
                    title="Service Area / Location"
                  >
                    <FiMapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <div className="flex items-center gap-0.5 text-xs font-bold text-slate-700 leading-none truncate max-w-[140px] sm:max-w-none">
                      <span className="truncate">{displayCity}</span>
                      <FiChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-700 shrink-0 transition-colors" />
                    </div>
                  </Link>
                ) : (
                  <span className="block text-[10px] font-extrabold tracking-wider text-amber-500 uppercase leading-none mt-0.5 whitespace-nowrap">
                    Zippto Partner
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 2. CENTER NAVIGATION TABS (Desktop / Tablet) */}
        {!showBack && (
          <nav className="hidden md:flex items-center gap-1 lg:gap-1.5">
            <NavLink
              to="/vendor/dashboard"
              end
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-full text-xs transition-all ${
                  isActive
                    ? 'font-extrabold text-[#0B132B] bg-slate-100 border border-slate-200/80 shadow-2xs'
                    : 'font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/vendor/bookings"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-full text-xs transition-all ${
                  isActive
                    ? 'font-extrabold text-[#0B132B] bg-slate-100 border border-slate-200/80 shadow-2xs'
                    : 'font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`
              }
            >
              Bookings
            </NavLink>
            <NavLink
              to="/vendor/wallet"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-full text-xs transition-all ${
                  isActive
                    ? 'font-extrabold text-[#0B132B] bg-slate-100 border border-slate-200/80 shadow-2xs'
                    : 'font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`
              }
            >
              Wallet
            </NavLink>
            <NavLink
              to="/vendor/jobs"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-full text-xs transition-all ${
                  isActive
                    ? 'font-extrabold text-[#0B132B] bg-slate-100 border border-slate-200/80 shadow-2xs'
                    : 'font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`
              }
            >
              Jobs
            </NavLink>
          </nav>
        )}

        {/* 3. RIGHT ACTION CLUSTER: Language Pill, Bell, Profile Avatar */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Language Selector Pill */}
          <LanguageToggle className="shrink-0 text-[11px] py-1 px-2 sm:px-2.5" />

          {/* Notifications Bell */}
          {showNotifications && (
            <Link
              to="/vendor/notifications"
              className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-100/80 hover:bg-slate-100 flex items-center justify-center text-slate-700 transition-colors shrink-0"
              aria-label="Notifications"
              title="Notifications"
            >
              <FiBell className="w-4 h-4 sm:w-5 sm:h-5" />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white font-black text-[9px] px-1.5 py-0.5 rounded-full ring-2 ring-white shadow-2xs">
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </Link>
          )}

          {/* Vendor Profile Avatar Circle */}
          <Link
            to="/vendor/profile"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#0B132B] text-white flex items-center justify-center text-xs font-black shrink-0 ring-2 ring-slate-100 hover:ring-slate-300 transition-all overflow-hidden"
            title={`Logged in as ${vendorInfo.name}`}
          >
            {vendorInfo.avatar ? (
              <img
                src={vendorInfo.avatar}
                alt={vendorInfo.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{vendorInitial}</span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
});

Header.displayName = 'VendorHeader';
export default Header;
