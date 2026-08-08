import React, { useState, useEffect, memo, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiHome, FiBriefcase, FiUsers, FiUser } from 'react-icons/fi';
import { HiHome, HiBriefcase, HiUsers, HiUser } from 'react-icons/hi';
import { FaWallet } from 'react-icons/fa';
import { vendorTheme as themeColors } from '../../../../theme';

const BottomNav = memo(() => {
  const navigate = useNavigate();
  const location = useLocation();
  const [pendingJobsCount, setPendingJobsCount] = useState(0);

  // Load pending jobs count from localStorage
  useEffect(() => {
    const updatePendingCount = () => {
      try {
        // Count active jobs (PENDING only) to show new requests
        const acceptedBookings = JSON.parse(localStorage.getItem('vendorAcceptedBookings') || '[]');
        const activeJobs = acceptedBookings.filter(job => job.status === 'PENDING');
        setPendingJobsCount(activeJobs.length);
      } catch (error) {
        console.error('Error reading pending jobs:', error);
      }
    };

    updatePendingCount();
    window.addEventListener('storage', updatePendingCount);
    window.addEventListener('vendorJobsUpdated', updatePendingCount);

    return () => {
      window.removeEventListener('storage', updatePendingCount);
      window.removeEventListener('vendorJobsUpdated', updatePendingCount);
    };
  }, []);

  // Use useMemo to update navItems when pendingJobsCount changes
  const navItems = useMemo(() => {
    // Count jobs that require attention (Pending, Accepted, In Progress)
    const badgeCount = pendingJobsCount;

    return [
      { path: '/vendor/dashboard', icon: FiHome, activeIcon: HiHome, label: 'Home' },
      { path: '/vendor/jobs', icon: FiBriefcase, activeIcon: HiBriefcase, label: 'Jobs', badge: badgeCount },
      { path: '/vendor/workers', icon: FiUsers, activeIcon: HiUsers, label: 'Workers' },
      { path: '/vendor/wallet', icon: FaWallet, activeIcon: FaWallet, label: 'Wallet' },
      { path: '/vendor/profile', icon: FiUser, activeIcon: HiUser, label: 'Profile' },
    ];
  }, [pendingJobsCount]);

  const handleNavClick = (path) => {
    if (location.pathname !== path) {
      navigate(path);
    }
  };

  // Hide nav when specific routes are active (booking alerts, maps)
  const hideNavRoutes = [
    '/vendor/booking-alert/',
    '/vendor/booking/',
  ];

  const shouldHideNav = hideNavRoutes.some(route =>
    location.pathname.includes(route) &&
    (location.pathname.includes('/map') || location.pathname.includes('/alert/'))
  );

  if (shouldHideNav) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none flex justify-center pb-0 md:pb-4">
      <nav
        className="pointer-events-auto w-full md:max-w-xl bg-white/95 backdrop-blur-md border-t md:border border-slate-200/90 md:rounded-2xl shadow-lg md:shadow-xl transition-all duration-300"
      >
        <div className="flex items-center justify-around px-3 py-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path === '/vendor/dashboard' && location.pathname === '/vendor');
            const IconComponent = isActive ? item.activeIcon : item.icon;

            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className="flex flex-col items-center justify-center relative w-16 h-12 rounded-xl transition-all duration-200 group"
              >
                {/* Active Indicator Pill */}
                {isActive && (
                  <div
                    className="absolute -top-2 w-8 h-1 rounded-b-full bg-teal-600"
                    style={{
                      backgroundColor: themeColors.button,
                      boxShadow: `0 2px 8px ${themeColors.brand.teal}4D`,
                    }}
                  />
                )}

                {/* Active Background - Very Subtle Tint */}
                {isActive && (
                  <div
                    className="absolute inset-0 rounded-xl scale-95"
                    style={{ backgroundColor: `${themeColors.brand.teal}0D` }}
                  />
                )}

                <div className="relative z-10 flex flex-col items-center justify-center">
                  <div className="relative mb-0.5">
                    <IconComponent
                      className={`w-5 h-5 transition-all duration-200 ${isActive ? 'scale-110' : 'text-slate-400 group-hover:text-slate-600'}`}
                      style={{
                        color: isActive ? themeColors.button : '#94A3B8',
                      }}
                    />
                    {item.badge !== undefined && item.badge > 0 && (
                      <span
                        className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1"
                        style={{
                          minWidth: '16px',
                          height: '16px',
                          border: '1.5px solid white',
                          boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)',
                          zIndex: 50,
                        }}
                      >
                        {item.badge > 9 ? '9+' : item.badge}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[11px] transition-colors duration-200 ${isActive ? 'font-bold' : 'font-medium text-slate-500'}`}
                    style={{
                      color: isActive ? themeColors.button : '#64748B',
                    }}
                  >
                    {item.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
});

BottomNav.displayName = 'BottomNav';
export default BottomNav;

