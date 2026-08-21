import React, { useState, useEffect, useMemo } from 'react';
import { FiMenu, FiBell, FiLogOut, FiChevronRight, FiShield } from 'react-icons/fi';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Button from '../Button';
import { adminAuthService } from '../../../../services/authService';
import { LanguageToggle } from '../../../../components/common/LanguageSelectorModal';

// Comprehensive Route Metadata Hierarchy
const ROUTE_DEFINITIONS = [
  // ── Bookings ─────────────────────────────────────────────────────────────
  {
    path: '/admin/bookings/tracking',
    title: 'Live Order Tracking',
    description: 'Real-time dispatch, lifecycle progression, and live order status',
    category: 'Bookings',
    categoryPath: '/admin/bookings',
    badge: 'Live Stream'
  },
  {
    path: '/admin/bookings/notifications',
    title: 'Order Notifications',
    description: 'Real-time booking alerts, broadcasts, and system dispatches',
    category: 'Bookings',
    categoryPath: '/admin/bookings',
    badge: 'Alerts'
  },
  {
    path: '/admin/bookings',
    title: 'Bookings Management',
    description: 'Monitor, assign, filter, and audit all customer service requests',
    category: 'Core Operations',
    categoryPath: '/admin/bookings'
  },

  // ── Dashboard ────────────────────────────────────────────────────────────
  {
    path: '/admin/dashboard',
    title: 'Executive Dashboard',
    description: 'High-level platform metrics, revenue trends, and operational health',
    category: 'Core Operations',
    categoryPath: '/admin/dashboard',
    badge: 'Live Overview'
  },

  // ── Users & Customers ───────────────────────────────────────────────────
  {
    path: '/admin/users/all',
    title: 'Customer Directory',
    description: 'Browse, inspect, and manage registered platform customers',
    category: 'Users & Customers',
    categoryPath: '/admin/users/all'
  },
  {
    path: '/admin/users/bookings',
    title: 'Customer Bookings',
    description: 'Audit service history and user booking behavior',
    category: 'Users & Customers',
    categoryPath: '/admin/users/all'
  },
  {
    path: '/admin/users/transactions',
    title: 'Customer Transactions',
    description: 'Track customer wallet debits, payments, and refunds',
    category: 'Users & Customers',
    categoryPath: '/admin/users/all'
  },
  {
    path: '/admin/users/analytics',
    title: 'Customer Analytics',
    description: 'Cohort insights, user retention, and order frequency',
    category: 'Users & Customers',
    categoryPath: '/admin/users/all'
  },
  {
    path: '/admin/users',
    title: 'Users & Customers',
    description: 'Manage platform customers and their activity',
    category: 'Core Operations',
    categoryPath: '/admin/users/all'
  },

  // ── Vendors & Partners ───────────────────────────────────────────────────
  {
    path: '/admin/vendors/all',
    title: 'Service Partners Directory',
    description: 'Manage registered vendors, approval statuses, and KYC verifications',
    category: 'Vendors & Partners',
    categoryPath: '/admin/vendors/all'
  },
  {
    path: '/admin/vendors/bookings',
    title: 'Partner Bookings',
    description: 'Monitor vendor order fulfilment rates and assigned service jobs',
    category: 'Vendors & Partners',
    categoryPath: '/admin/vendors/all'
  },
  {
    path: '/admin/vendors/analytics',
    title: 'Partner Analytics',
    description: 'Performance scores, response latency, and acceptance rates',
    category: 'Vendors & Partners',
    categoryPath: '/admin/vendors/all'
  },
  {
    path: '/admin/vendors/payments',
    title: 'Partner Earnings & Payouts',
    description: 'Track vendor net earnings, dues, and payout summaries',
    category: 'Vendors & Partners',
    categoryPath: '/admin/vendors/all'
  },
  {
    path: '/admin/vendors',
    title: 'Vendors & Partners',
    description: 'Manage partner registrations, onboarding, and performance',
    category: 'Core Operations',
    categoryPath: '/admin/vendors/all'
  },

  // ── Service Catalog ──────────────────────────────────────────────────────
  {
    path: '/admin/user-categories',
    title: 'Service Catalog & Categories',
    description: 'Manage root categories, sub-services, rates, and catalog hierarchy',
    category: 'Service Catalog',
    categoryPath: '/admin/user-categories'
  },

  // ── Settlements & Dues ───────────────────────────────────────────────────
  {
    path: '/admin/settlements/pending',
    title: 'Pending Settlements',
    description: 'Review and approve vendor cash collections and platform commissions',
    category: 'Settlements & Dues',
    categoryPath: '/admin/settlements/pending',
    badge: 'Action Required'
  },
  {
    path: '/admin/settlements/withdrawals',
    title: 'Withdrawal Requests',
    description: 'Process partner wallet withdrawal requests to bank accounts',
    category: 'Settlements & Dues',
    categoryPath: '/admin/settlements/pending'
  },
  {
    path: '/admin/settlements/vendors',
    title: 'Partner Balances & Dues',
    description: 'Monitor partner ledger balances, credit limits, and outstanding dues',
    category: 'Settlements & Dues',
    categoryPath: '/admin/settlements/pending'
  },
  {
    path: '/admin/settlements/history',
    title: 'Settlement History',
    description: 'Immutable historical records of completed settlements and payouts',
    category: 'Settlements & Dues',
    categoryPath: '/admin/settlements/pending'
  },
  {
    path: '/admin/settlements',
    title: 'Settlements & Payouts',
    description: 'Manage partner finances, commission deductions, and settlements',
    category: 'Finance & Intelligence',
    categoryPath: '/admin/settlements/pending'
  },

  // ── Payments & Ledger ────────────────────────────────────────────────────
  {
    path: '/admin/payments/users',
    title: 'Customer Payments',
    description: 'Detailed records of online gateway payments and cash transactions',
    category: 'Payments & Ledger',
    categoryPath: '/admin/payments/users'
  },
  {
    path: '/admin/payments/vendors',
    title: 'Vendor Settlements Ledger',
    description: 'Settlement logs and partner commission distributions',
    category: 'Payments & Ledger',
    categoryPath: '/admin/payments/users'
  },
  {
    path: '/admin/payments/revenue',
    title: 'Platform Net Revenue',
    description: 'Track gross marketplace volume, commission cuts, and net profits',
    category: 'Payments & Ledger',
    categoryPath: '/admin/payments/users'
  },
  {
    path: '/admin/payments/reports',
    title: 'Financial Statements & Reports',
    description: 'Download reconciliation reports, GST logs, and audit trails',
    category: 'Payments & Ledger',
    categoryPath: '/admin/payments/users'
  },
  {
    path: '/admin/payments',
    title: 'Payments & Ledger',
    description: 'Audit all financial flows, transaction logs, and platform revenue',
    category: 'Finance & Intelligence',
    categoryPath: '/admin/payments/users'
  },

  // ── Analytics & Intelligence ─────────────────────────────────────────────
  {
    path: '/admin/reports',
    title: 'Analytics & Reports',
    description: 'Comprehensive business intelligence, growth trends, and cohort analysis',
    category: 'Finance & Intelligence',
    categoryPath: '/admin/reports'
  },
  {
    path: '/admin/plans',
    title: 'Subscription Plans',
    description: 'Configure and manage consumer membership & discount plans',
    category: 'Finance & Intelligence',
    categoryPath: '/admin/plans'
  },
  {
    path: '/admin/reviews',
    title: 'Customer & Partner Reviews',
    description: 'Audit customer feedback, ratings, and moderate public reviews',
    category: 'System Config',
    categoryPath: '/admin/reviews'
  },
  {
    path: '/admin/cms',
    title: 'CMS & Landing Pages',
    description: 'Manage promotional banners, blog posts, terms, and homepage content',
    category: 'System Config',
    categoryPath: '/admin/cms'
  },

  // ── Notifications & Broadcasts ───────────────────────────────────────────
  {
    path: '/admin/notifications/push',
    title: 'Push Broadcast Composer',
    description: 'Broadcast instant targeted push notifications to users or partners',
    category: 'Notifications',
    categoryPath: '/admin/notifications/push'
  },
  {
    path: '/admin/notifications/messages',
    title: 'In-App Messages',
    description: 'Compose and deliver rich in-app banners and inbox announcements',
    category: 'Notifications',
    categoryPath: '/admin/notifications/push'
  },
  {
    path: '/admin/notifications/settings',
    title: 'Notification Triggers',
    description: 'Configure automated event triggers, FCM templates, and alert thresholds',
    category: 'Notifications',
    categoryPath: '/admin/notifications/push'
  },
  {
    path: '/admin/notifications',
    title: 'Notifications & Broadcasts',
    description: 'Manage multichannel notification broadcasts and automated triggers',
    category: 'System Config',
    categoryPath: '/admin/notifications/push'
  },

  // ── System Settings ──────────────────────────────────────────────────────
  {
    path: '/admin/settings/general',
    title: 'General & Business Settings',
    description: 'Company profile, support helpline, email configs, and company info',
    category: 'System Settings',
    categoryPath: '/admin/settings'
  },
  {
    path: '/admin/settings/features',
    title: 'Feature Toggles & Controls',
    description: 'Dynamically toggle Chat, Referrals, Push Notifications, and B2B mode',
    category: 'System Settings',
    categoryPath: '/admin/settings'
  },
  {
    path: '/admin/settings/tax',
    title: 'GST & Financial Fees',
    description: 'Configure GST percentage, inspection visit charges, and cancellation penalty',
    category: 'System Settings',
    categoryPath: '/admin/settings'
  },
  {
    path: '/admin/settings/booking',
    title: 'Booking & Dispatch Controls',
    description: 'Configure search radius, partner auto-dispatch, and acceptance timers',
    category: 'System Settings',
    categoryPath: '/admin/settings'
  },
  {
    path: '/admin/settings/notifications',
    title: 'System Notification Preferences',
    description: 'Configure SMS, Email, and Push notification defaults across the platform',
    category: 'System Settings',
    categoryPath: '/admin/settings'
  },
  {
    path: '/admin/settings/localization',
    title: 'Languages & Regional Settings',
    description: 'Manage active operating cities, supported languages, and currency formatting',
    category: 'System Settings',
    categoryPath: '/admin/settings'
  },
  {
    path: '/admin/settings/sms',
    title: 'SMS & OTP Gateways',
    description: 'Configure SMS Hub API credentials, DLT templates, and OTP bypass flags',
    category: 'System Settings',
    categoryPath: '/admin/settings'
  },
  {
    path: '/admin/settings',
    title: 'System Settings',
    description: 'Central platform controls, financial parameters, and business logic',
    category: 'System Config',
    categoryPath: '/admin/settings'
  },
  {
    path: '/admin/customization-settings',
    title: 'Platform Customization',
    description: 'Brand themes, visual layout customization, and user preferences',
    category: 'System Config',
    categoryPath: '/admin/customization-settings'
  },
  {
    path: '/admin/customization',
    title: 'Platform Customization',
    description: 'Brand themes, visual layout customization, and user preferences',
    category: 'System Config',
    categoryPath: '/admin/customization'
  }
];

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
      className="bg-white/95 backdrop-blur-md fixed top-0 left-0 right-0 z-30 transition-all duration-300 lg:left-[260px] border-b border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)]"
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

            {/* Main Title with Status Badge */}
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-base sm:text-lg lg:text-xl font-black text-gray-900 tracking-tight truncate">
                {pageInfo.title}
              </h1>
              {pageInfo.badge && (
                <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200/60 rounded-full shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping"></span>
                  {pageInfo.badge}
                </span>
              )}
            </div>
            
            {/* Description Subtitle */}
            <p className="text-[11px] sm:text-xs text-gray-500 font-medium truncate max-w-xl hidden sm:block">
              {pageInfo.description}
            </p>
          </div>
        </div>

        {/* Right: Quick Controls, Notifications, Admin Profile & Logout */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <FiShield className="w-3.5 h-3.5" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-gray-800 leading-none">Super Admin</p>
              <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-ping"></span>
                Online
              </span>
            </div>
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
