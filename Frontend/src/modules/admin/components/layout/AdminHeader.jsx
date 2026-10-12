import React, { useState, useEffect, useMemo } from 'react';
import { FiMenu, FiBell, FiLogOut, FiChevronRight, FiShield } from 'react-icons/fi';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Button from '../Button';
import { adminAuthService } from '../../../../services/authService';
import { LanguageToggle } from '../../../../components/common/LanguageSelectorModal';
import { ROUTE_DEFINITIONS } from '../../config/routeDefinitions';
import AdminSearchBar from '../search/AdminSearchBar';


const AdminHeader = ({ onMenuClick }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  // Dynamic Route Information Resolver (longest prefix match + exact match priority)
  const pageInfo = useMemo(() => {
    const pathname = location.pathname.replace(/\/$/, ''); // Remove trailing slash
    
    // 1. Exact match
    const exact = ROUTE_DEFINITIONS.find(r => r.path === pathname);
    if (exact) return exact;

    // 2. Longest matching path
    const sorted = [...ROUTE_DEFINITIONS].sort((a, b) => b.path.length - a.path.length);
    const match = sorted.find(r => pathname.startsWith(r.path));
    if (match) return match;

    // 3. Dynamic Fallback
    const segments = pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1] || 'Dashboard';
    const formatted = last
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    return {
      title: formatted,
      description: `Manage platform operations and settings for ${formatted}.`,
      category: 'Admin Portal',
      categoryPath: '/admin/dashboard'
    };
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await adminAuthService.logout();
      toast.success('Logged out successfully');
      navigate('/admin/login');
    } catch (error) {
      console.error('Logout error:', error);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('adminData');
      toast.success('Logged out successfully');
      navigate('/admin/login');
    }
  };

  const fetchNotifications = async () => {
    try {
      const { default: api } = await import('../../../../services/api');
      const res = await api.get('/notifications/admin');
      if (res.data?.success) {
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (error) {
      // Gracefully handle error
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 45000);

    const handleNotificationAlert = () => {
      fetchNotifications();
    };
    window.addEventListener('adminNotificationsUpdated', handleNotificationAlert);
    window.addEventListener('adminBookingAlert', handleNotificationAlert);

    return () => {
      clearInterval(interval);
      window.removeEventListener('adminNotificationsUpdated', handleNotificationAlert);
      window.removeEventListener('adminBookingAlert', handleNotificationAlert);
    };
  }, []);

  return (
    <header
      className="bg-white/95 backdrop-blur-md fixed top-0 left-0 right-0 z-30 lg:left-[260px] border-b border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)]"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}
    >
      <div className="flex items-center justify-between px-3.5 sm:px-6 lg:px-7 py-3 sm:py-4">
        {/* Left: Mobile Menu Trigger + Breadcrumb & Title */}
        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0 flex-1">
          <Button
            onClick={onMenuClick}
            variant="icon"
            className="lg:hidden text-gray-700 hover:bg-gray-100 p-2 rounded-lg shrink-0"
            icon={FiMenu}
          />
          <div className="min-w-0 flex-1">
            {/* Interactive Breadcrumb Trail */}
            <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-gray-400 mb-0.5 overflow-hidden">
              <Link to="/admin/dashboard" className="hover:text-blue-600 transition-colors shrink-0 hidden sm:inline">Admin</Link>
              <FiChevronRight className="w-3 h-3 text-gray-300 shrink-0 hidden sm:inline" />
              {pageInfo.categoryPath ? (
                <Link to={pageInfo.categoryPath} className="hover:text-blue-600 transition-colors shrink-0">
                  {pageInfo.category}
                </Link>
              ) : (
                <span className="shrink-0">{pageInfo.category}</span>
              )}
              <FiChevronRight className="w-3 h-3 text-gray-300 shrink-0" />
              <span className="text-blue-600 font-bold truncate">{pageInfo.title}</span>
            </div>

            {/* Main Title */}
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-base sm:text-lg lg:text-xl font-black text-gray-900 tracking-tight truncate">
                {pageInfo.title}
              </h1>
            </div>
            
            {/* Description Subtitle */}
            <p className="text-[11px] sm:text-xs text-gray-500 font-medium truncate max-w-xl hidden sm:block">
              {pageInfo.description}
            </p>
          </div>
        </div>

        {/* Right: Quick Controls, Search, Notifications, Admin Profile & Logout */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Global Admin Search Bar */}
          <AdminSearchBar />

          <LanguageToggle />

          {/* Real-time Notification Bell */}
          <Link
            to="/admin/bookings/notifications"
            className="p-2.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50/60 rounded-xl border border-gray-200/80 transition-all relative cursor-pointer flex items-center justify-center"
            title="System & Order Notifications"
            aria-label="Notifications"
          >
            <FiBell className="w-4 h-4 sm:w-5 sm:h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-600 rounded-full text-[10px] text-white flex items-center justify-center font-bold shadow-xs animate-bounce">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>

          {/* Super Admin Badge / Pill */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-50/80 border border-gray-200/80 rounded-xl">
            <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <FiShield className="w-3.5 h-3.5" />
            </div>
            <p className="text-xs font-bold text-gray-800 leading-none">Super Admin</p>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-700 hover:text-white bg-white hover:bg-red-600 border border-gray-200 hover:border-red-600 rounded-xl shadow-2xs transition-all cursor-pointer"
            title="Sign out of Admin Session"
          >
            <FiLogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
