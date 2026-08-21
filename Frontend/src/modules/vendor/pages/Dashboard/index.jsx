import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo, memo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiBriefcase, FiUsers, FiBell, FiArrowRight, FiUser, FiClock, FiMapPin, FiCheckCircle, FiTrendingUp, FiChevronRight, FiShield, FiStar, FiPlusCircle, FiSettings, FiHelpCircle, FiSliders, FiDollarSign, FiLayers } from 'react-icons/fi';
import { FaWallet } from 'react-icons/fa';
import { vendorTheme as themeColors } from '../../../../theme';
import Header from '../../components/layout/Header';
import { vendorDashboardService } from '../../services/dashboardService';
import { acceptBooking, rejectBooking } from '../../services/bookingService';
// Booking alert handled globally
import { toast } from 'react-hot-toast';
import { io } from 'socket.io-client';

import { registerFCMToken } from '../../../../services/pushNotificationService';
import LogoLoader from '../../../../components/common/LogoLoader';
import StatsCards from './components/StatsCards';
import PendingBookings from './components/PendingBookings';


const SOCKET_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/api$/, '') || 'http://localhost:5000';

const Dashboard = memo(() => {
  const navigate = useNavigate();
  const location = useLocation();

  // Helper function to convert hex to rgba
  const hexToRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const [stats, setStats] = useState({
    todayEarnings: 0,
    activeJobs: 0,
    pendingAlerts: 0,
    totalEarnings: 0,
    completedJobs: 0,
    rating: 0,
  });
  const [vendorProfile, setVendorProfile] = useState({
    name: 'Vendor Name',
    businessName: 'Business Name',
    photo: null,
    service: []
  });
  const [recentJobs, setRecentJobs] = useState([]);
  const [pendingBookings, setPendingBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [globalConfig, setGlobalConfig] = useState({ maxSearchTime: 5, waveDuration: 60 });

  const ignoredBookingIds = useRef(new Set());

  // Set background gradient
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



  // Process API response - extracted to avoid duplication
  const processApiResponse = useCallback((response) => {
    if (!response.success) return;

    const { stats: apiStats, recentBookings, config } = response.data;
    if (config) setGlobalConfig(config);

    // Separate requested/searching bookings from other bookings
    const requestedBookings = (recentBookings || []).filter(booking => {
      const status = booking.status?.toLowerCase();
      return status === 'requested' || status === 'searching';
    });
    const otherBookings = (recentBookings || []).filter(booking => {
      const status = booking.status?.toLowerCase();
      return status !== 'requested' && status !== 'searching';
    });

    // Build pending bookings map
    const mergedMap = new Map();
    const vendorData = JSON.parse(localStorage.getItem('vendorData') || '{}');
    const vendorId = vendorData._id || vendorData.id;

    requestedBookings.forEach(b => {
      const id = String(b._id || b.id);

      // Find distance for this vendor if available
      let distance = 'N/A';
      if (b.potentialVendors && vendorId) {
        const potentialVendor = b.potentialVendors.find(pv =>
          String(pv.vendorId?._id || pv.vendorId) === String(vendorId)
        );
        if (potentialVendor && potentialVendor.distance) {
          distance = `${potentialVendor.distance.toFixed(1)} km`;
        }
      }

      mergedMap.set(id, {
        ...b, // Spread first!
        id,
        serviceName: b.serviceName || b.serviceId?.title || 'New Booking Request',
        serviceCategory: b.serviceCategory || b.serviceId?.categoryId?.title || 'General Service',
        customerName: b.userId?.name || 'Customer',
        location: {
          address: b.address?.addressLine1 || 'Address not available',
          distance: distance
        },
        // Prioritize vendorEarnings, fallback to 90% of finalAmount if it's not a free plan (finalAmount > 0)
        price: (b.vendorEarnings > 0 ? b.vendorEarnings : (b.finalAmount > 0 ? b.finalAmount * 0.9 : 0)).toFixed(2),
        vendorEarnings: b.vendorEarnings, // Ensure it's explicitly passed
        timeSlot: {
          date: new Date(b.scheduledDate).toLocaleDateString(),
          time: b.scheduledTime || 'Time not set'
        },
        status: b.status,
        expiresAt: b.expiresAt || (b.createdAt && config ? new Date(new Date(b.createdAt).getTime() + (config.maxSearchTime || 5) * 60000).toISOString() : null)
      });
    });

    // Filter out locally ignored bookings
    const finalMap = new Map();
    mergedMap.forEach((value, key) => {
      if (!ignoredBookingIds.current.has(key)) {
        finalMap.set(key, value);
      }
    });

    // Merge with local storage to avoid losing real-time updates that haven't hit API yet
    const localPending = JSON.parse(localStorage.getItem('vendorPendingJobs') || '[]');
    const apiPending = Array.from(finalMap.values());
    const mergedPending = [...apiPending];

    localPending.forEach(localJob => {
      const id = String(localJob.id || localJob._id);
      if (!mergedPending.find(job => String(job.id || job._id) === id) && !ignoredBookingIds.current.has(id)) {

        const createdAt = localJob.createdAt ? new Date(localJob.createdAt).getTime() : Date.now();
        const expiresAt = localJob.expiresAt || (localJob.createdAt && config ? new Date(createdAt + (config.maxSearchTime || 5) * 60000).toISOString() : null);
        const isExpired = (expiresAt && new Date(expiresAt) <= new Date()) || (Date.now() - createdAt > 300000);

        const lowerStatus = String(localJob.status || '').toLowerCase();

        if (!isExpired && (lowerStatus === 'requested' || lowerStatus === 'searching')) {
          mergedPending.push({
            ...localJob,
            id,
            serviceName: localJob.serviceName || localJob.serviceId?.title || 'New Booking Request',
            serviceCategory: localJob.serviceCategory || localJob.serviceId?.categoryId?.title || 'General Service',
            customerName: localJob.customerName || localJob.userId?.name || 'Customer',
            expiresAt
          });
        }
      }
    });

    setPendingBookings(mergedPending);
    localStorage.setItem('vendorPendingJobs', JSON.stringify(mergedPending));

    // Update stats
    setStats({
      todayEarnings: apiStats.vendorEarnings || 0,
      activeJobs: apiStats.inProgressBookings || 0,
      pendingAlerts: mergedPending.length,
      totalEarnings: apiStats.vendorEarnings || 0,
      completedJobs: apiStats.completedBookings || 0,
      rating: apiStats.rating || 0,
    });

    // Recent jobs (non-requested)
    const recentJobsData = otherBookings.slice(0, 3).map(booking => ({
      id: booking._id,
      serviceType: booking.serviceId?.title || 'Service',
      customerName: booking.userId?.name || 'Customer',
      location: booking.address?.addressLine1 || 'Address not available',
      price: (booking.vendorEarnings > 0 ? booking.vendorEarnings : (booking.finalAmount ? booking.finalAmount * 0.9 : 0)).toFixed(2),
      vendorEarnings: booking.vendorEarnings,
      timeSlot: {
        date: new Date(booking.scheduledDate).toLocaleDateString(),
        time: booking.scheduledTime || 'Time not set'
      },
      status: booking.status,
    }));
    setRecentJobs(recentJobsData);

    // Load vendor profile from localStorage (once)
    const profile = JSON.parse(localStorage.getItem('vendorData') || '{}');
    setVendorProfile({
      name: profile.name || 'Vendor Name',
      businessName: profile.businessName || 'Business Name',
      photo: profile.profilePhoto || null,
      service: profile.service || []
    });
  }, []);

  // Main data loader - useCallback to prevent recreation
  const loadDashboardData = useCallback(async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      setError(null);

      const response = await vendorDashboardService.getDashboardStats();
      processApiResponse(response);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(String(err.message || 'Failed to load dashboard data'));
    } finally {
      setLoading(false);
    }
  }, [processApiResponse]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Check for redirected state (to open a specific alert modal)
  useEffect(() => {
    if (location.state?.openBookingId && pendingBookings.length > 0) {
      const bId = String(location.state.openBookingId);
      const booking = pendingBookings.find(b => String(b.id || b._id) === bId);
      if (booking) {
        setActiveAlertBookings(prev => {
          if (prev.find(p => String(p.id || p._id) === bId)) return prev;
          return [...prev, booking];
        });
        // Clear state to avoid reopening on refresh
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [location.state, pendingBookings, navigate]);

  // Listen for real-time updates via window events (dispatched by useAppNotifications)
  useEffect(() => {
    const handleUpdate = () => {
      loadDashboardData(false); // false = don't show spinner for background refresh
    };

    // Ask for notification permission and register FCM
    registerFCMToken('vendor', true).catch(err => console.error('FCM registration failed:', err));

    // Listen for custom dashboard events from SocketContext
    const handleShowAlert = (e) => {
      // e.detail contains the new booking job
      if (e.detail) {
        // Also add to pending if not present
        setPendingBookings(prev => {
          if (prev.find(b => b.id === e.detail.id)) return prev;
          return [e.detail, ...prev];
        });
      }
    };

    const handleRemoveBooking = (e) => {
      if (e.detail?.id) {
        const idToRemove = String(e.detail.id);

        // Add to ignored list so it doesn't come back on next fetch
        ignoredBookingIds.current.add(idToRemove);

        // Remove from pending bookings state immediately
        setPendingBookings(prev => prev.filter(b => String(b.id || b._id) !== idToRemove));

        // Remove from recent jobs state
        setRecentJobs(prev => prev.filter(b => String(b.id || b._id) !== idToRemove));

        // Remove from localStorage
        const pendingJobs = JSON.parse(localStorage.getItem('vendorPendingJobs') || '[]');
        const updatedPending = pendingJobs.filter(job => String(job.id || job._id) !== idToRemove);
        localStorage.setItem('vendorPendingJobs', JSON.stringify(updatedPending));
      }
    };

    window.addEventListener('vendorJobsUpdated', handleUpdate);
    window.addEventListener('vendorStatsUpdated', handleUpdate);
    window.addEventListener('showDashboardBookingAlert', handleShowAlert);
    window.addEventListener('removeVendorBooking', handleRemoveBooking);

    return () => {
      window.removeEventListener('vendorJobsUpdated', handleUpdate);
      window.removeEventListener('vendorStatsUpdated', handleUpdate);
      window.removeEventListener('showDashboardBookingAlert', handleShowAlert);
      window.removeEventListener('removeVendorBooking', handleRemoveBooking);
    };
  }, [loadDashboardData]);


  // Alert Action Handlers
  const handleAcceptAlert = async (bookingId) => {
    try {
      const response = await acceptBooking(bookingId);
      if (response.success) {
        toast.success('Booking accepted successfully!');
        setPendingBookings(prev => prev.filter(b => String(b.id || b._id) !== String(bookingId)));

        // Sync localStorage
        const pendingJobs = JSON.parse(localStorage.getItem('vendorPendingJobs') || '[]');
        const updated = pendingJobs.filter(b => String(b.id || b._id) !== String(bookingId));
        localStorage.setItem('vendorPendingJobs', JSON.stringify(updated));

        window.dispatchEvent(new CustomEvent('removeVendorBooking', { detail: { id: bookingId } }));
        window.dispatchEvent(new Event('vendorStatsUpdated'));
      }
    } catch (error) {
      console.error('Error accepting:', error);
      toast.error('Failed to accept booking');
    }
  };

  const handleRejectAlert = async (bookingId) => {
    try {
      const response = await rejectBooking(bookingId);
      if (response.success) {
        toast.success('Booking rejected');
        setPendingBookings(prev => prev.filter(b => String(b.id || b._id) !== String(bookingId)));

        // Sync localStorage
        const pendingJobs = JSON.parse(localStorage.getItem('vendorPendingJobs') || '[]');
        const updated = pendingJobs.filter(b => String(b.id || b._id) !== String(bookingId));
        localStorage.setItem('vendorPendingJobs', JSON.stringify(updated));

        window.dispatchEvent(new CustomEvent('removeVendorBooking', { detail: { id: bookingId } }));
      }
    } catch (error) {
      console.error('Error rejecting:', error);
      toast.error('Failed to reject booking');
    }
  };

  // Memoize quickActions to prevent recreation on every render
  const quickActions = useMemo(() => [
    {
      title: 'Active Jobs',
      icon: FiBriefcase,
      color: '#00a6a6',
      path: '/vendor/jobs',
      count: stats.activeJobs,
      subtitle: `${stats.activeJobs} running`,
    },
    {
      title: 'My Services',
      icon: FiLayers,
      color: '#29ad81',
      path: '/vendor/manage-services',
      subtitle: 'Catalog & Skills',
    },
    {
      title: 'Wallet',
      icon: FaWallet,
      color: '#F59E0B',
      path: '/vendor/wallet',
      subtitle: `₹${stats.totalEarnings.toLocaleString()} total`,
    },
  ], [stats.activeJobs, stats.totalEarnings]);

  const getStatusColor = (status) => {
    const s = String(status).toLowerCase();
    const statusColors = {
      'accepted': '#3B82F6',
      'confirmed': '#10B981',
      'assigned': '#8B5CF6',
      'journey_started': '#F59E0B',
      'visited': '#F59E0B',
      'in_progress': '#F59E0B',
      'work_done': '#10B981',
      'completed': '#10B981',
      'settlement_pending': '#F97316',
    };
    return statusColors[s] || '#6B7280';
  };

  const getStatusLabel = (status) => {
    const s = String(status).toLowerCase();
    const labels = {
      'requested': 'Requested',
      'searching': 'Searching',
      'accepted': 'Accepted',
      'confirmed': 'Confirmed',
      'assigned': 'Assigned',
      'journey_started': 'On the way',
      'visited': 'Visited',
      'in_progress': 'In Progress',
      'work_done': 'Work Done',
      'completed': 'Completed',
      'settlement_pending': 'Settlement',
      'cancelled': 'Cancelled',
      'rejected': 'Rejected'
    };
    return labels[s] || status;
  };

  // Show loading state
  if (loading) {
    return <LogoLoader />;
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen pb-20 flex items-center justify-center" style={{ background: themeColors.backgroundGradient }}>
        <div className="text-center px-6">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h2 className="text-white text-xl font-semibold mb-2">Failed to Load Dashboard</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-white text-gray-900 px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-900 pb-28">
      <Header title="Dashboard" showBack={false} notificationCount={stats.pendingAlerts} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Vendor Hero Card (Clean Professional Enterprise Light Design) */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
          {/* Subtle Decorative Backdrop Highlights */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Vendor Profile Info */}
            <div
              className="flex items-center gap-4 cursor-pointer group"
              onClick={() => navigate('/vendor/profile')}
            >
              <div className="relative">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 p-0.5 shadow-sm flex-shrink-0 overflow-hidden">
                  <div className="w-full h-full rounded-[14px] bg-teal-50 flex items-center justify-center overflow-hidden">
                    {vendorProfile.photo ? (
                      <img
                        src={vendorProfile.photo}
                        alt={vendorProfile.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <FiUser className="w-9 h-9 text-teal-700" />
                    )}
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-lg shadow-xs border-2 border-white">
                  <FiShield className="w-3.5 h-3.5" />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                    <FiShield className="w-3 h-3 text-teal-600" />
                    Verified Partner
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                    <FiStar className="w-3 h-3 fill-amber-400 text-amber-500" />
                    {stats.rating > 0 ? stats.rating.toFixed(1) : '5.0'} Rating
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight group-hover:text-teal-700 transition-colors">
                  {vendorProfile.name}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  {vendorProfile.businessName}
                </p>
              </div>
            </div>

            {/* Quick Action CTA Buttons */}
            <div className="flex items-center gap-3 flex-wrap border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
              <button
                onClick={() => navigate('/vendor/manage-services')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95"
              >
                <FiSliders className="w-4 h-4" />
                Manage Services
              </button>
              <button
                onClick={() => navigate('/vendor/settings')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all active:scale-95"
              >
                <FiSettings className="w-4 h-4 text-slate-500" />
                Settings
              </button>
            </div>
          </div>

          {/* Incomplete Profile Prompt Banner */}
          {(!vendorProfile.service || vendorProfile.service.length === 0) && (
            <div
              onClick={() => navigate('/vendor/profile')}
              className="mt-6 bg-amber-50/90 border border-amber-200 rounded-2xl p-4 cursor-pointer hover:bg-amber-100/80 transition-colors flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0">
                  <FiClock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-extrabold text-amber-900 uppercase tracking-wide">Profile Action Required</p>
                  <p className="text-xs text-amber-800 font-medium">Add service categories to your profile to start receiving instant booking requests.</p>
                </div>
              </div>
              <FiArrowRight className="w-5 h-5 text-amber-800 shrink-0" />
            </div>
          )}
        </div>

        {/* Responsive 2-Column Main Dashboard Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (Main Stats & Jobs List) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Analytics Stats Grid (4 Cards) */}
            <StatsCards stats={stats} />

            {/* Pending Booking Alerts Section */}
            <PendingBookings
              bookings={pendingBookings}
              maxSearchTimeMins={globalConfig.maxSearchTime}
              setPendingBookings={setPendingBookings}
              setActiveAlertBooking={(booking) => {
                window.dispatchEvent(new CustomEvent('showDashboardBookingAlert', { detail: booking }));
              }}
            />

            {/* Active & Recent Jobs List */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Active & Recent Jobs</h2>
                  <p className="text-xs text-slate-500 font-medium">Track ongoing assignments and dispatch progress</p>
                </div>
                {recentJobs.length > 0 && (
                  <button
                    onClick={() => navigate('/vendor/jobs')}
                    className="text-xs font-bold text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100/80 px-3.5 py-2 rounded-xl transition-colors"
                  >
                    View All Jobs
                  </button>
                )}
              </div>

              {recentJobs.length > 0 ? (
                <div className="space-y-3">
                  {recentJobs.map((job) => (
                    <div
                      key={job.id}
                      onClick={() => navigate(`/vendor/booking/${job.id}`)}
                      className="bg-slate-50/70 hover:bg-slate-100/70 rounded-2xl p-4 border border-slate-200/60 shadow-xs cursor-pointer transition-all duration-200 group"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3.5 min-w-0">
                          <div className="w-11 h-11 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-center text-teal-600 shrink-0 font-bold">
                            <FiUser className="w-5 h-5 text-teal-700" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h3 className="text-sm font-bold text-slate-900 truncate group-hover:text-teal-700 transition-colors">
                                {job.customerName}
                              </h3>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-100/80 text-teal-800 uppercase">
                                {job.serviceType || 'Service'}
                              </span>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                                {getStatusLabel(job.status)}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                              <span className="flex items-center gap-1">
                                <FiMapPin className="w-3.5 h-3.5 text-slate-400" />
                                {job.location}
                              </span>
                              <span className="flex items-center gap-1">
                                <FiClock className="w-3.5 h-3.5 text-slate-400" />
                                {job.timeSlot?.time || job.timeSlot?.date || 'Today'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                          <div className="text-left sm:text-right">
                            <p className="text-xs font-semibold text-slate-400">Earnings</p>
                            <p className="text-base font-extrabold text-slate-900">₹{job.price}</p>
                          </div>
                          <div className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 group-hover:bg-teal-600 group-hover:text-white group-hover:border-teal-600 transition-all">
                            <FiChevronRight className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 px-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <FiBriefcase className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">No active jobs in queue</p>
                  <p className="text-xs text-slate-500 mt-0.5">New incoming booking alerts will appear above for instant dispatch.</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar Column (Performance & Operations) */}
          <div className="space-y-6">
            {/* Performance Overview Widget */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold text-slate-900">Performance Metrics</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  Top Tier
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Rating Card */}
                <div className="bg-amber-50/60 border border-amber-200/70 rounded-2xl p-4 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <FiStar className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="text-2xl font-black text-slate-900">
                      {stats.rating > 0 ? stats.rating.toFixed(1) : '5.0'}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-600">Average Rating</p>
                </div>

                {/* Completed Card */}
                <div className="bg-emerald-50/60 border border-emerald-200/70 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-black text-slate-900 mb-1">
                    {stats.completedJobs}
                  </p>
                  <p className="text-xs font-semibold text-slate-600">Total Fulfilled</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span>Customer Satisfaction</span>
                  <span className="text-emerald-600 font-bold">98% Positive</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full w-[98%]" />
                </div>
              </div>
            </div>

            {/* Quick Operations Panel */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
              <h2 className="text-base font-extrabold text-slate-900">Quick Operations</h2>

              <div className="grid grid-cols-1 gap-2">
                {[
                  { title: 'Service Catalog & Skills', path: '/vendor/manage-services', icon: FiLayers },
                  { title: 'Earnings & Wallet', path: '/vendor/wallet', icon: FaWallet, count: `₹${stats.totalEarnings.toLocaleString()}` },
                  { title: 'Address & Service Hub', path: '/vendor/address-management', icon: FiMapPin },
                  { title: 'Customer Ratings', path: '/vendor/my-ratings', icon: FiStar },
                  { title: 'Vendor Settings', path: '/vendor/settings', icon: FiSettings },
                ].map((item, idx) => {
                  const IconComp = item.icon;
                  return (
                    <div
                      key={idx}
                      onClick={() => navigate(item.path)}
                      className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/80 hover:bg-slate-100 border border-slate-200/60 cursor-pointer transition-all duration-200 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-white border border-slate-200 text-teal-700 group-hover:scale-105 transition-transform">
                          <IconComp className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-slate-800 group-hover:text-teal-700 transition-colors">
                          {item.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.count && (
                          <span className="text-[11px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                            {item.count}
                          </span>
                        )}
                        <FiChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Direct Partner Operations Summary Card */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600 border border-teal-100">
                    <FiShield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Direct Partner Fulfillment</h3>
                    <p className="text-xs text-slate-500 font-medium">Verified Service Partner</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                Accept bookings directly, verify arrival OTPs on customer doorstep, and receive instant payouts upon service completion.
              </p>
              <button
                onClick={() => navigate('/vendor/jobs')}
                className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
              >
                View Active Jobs
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
});

export default Dashboard;
