import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiSearch, FiCheckCircle, FiTruck, FiPackage, FiClipboard, FiClock,
  FiMessageSquare, FiRefreshCw, FiCopy, FiExternalLink, FiMapPin,
  FiUser, FiPhone, FiCheck, FiShield, FiAlertCircle, FiTrendingUp,
  FiLayers, FiChevronRight, FiNavigation, FiCalendar, FiActivity, FiX
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { adminBookingService } from '../../../../services/adminBookingService';
import { toast } from 'react-hot-toast';
import ChatDrawerModal from '../../../../components/chat/ChatDrawerModal';

// Robust Service Icon Component with Fallback
const ServiceIcon = ({ iconUrl, title }) => {
  const [imgError, setImgError] = useState(!iconUrl);

  if (!iconUrl || imgError) {
    return (
      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-100/80">
        <FiPackage className="w-5 h-5" />
      </div>
    );
  }

  return (
    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center p-1.5 shrink-0 border border-gray-200/60 overflow-hidden">
      <img
        src={iconUrl}
        alt={title || 'service'}
        onError={() => setImgError(true)}
        className="w-full h-full object-contain"
        loading="lazy"
      />
    </div>
  );
};

const Tracking = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch bookings data
  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setIsRefreshing(true);

      const params = {
        page: 1,
        limit: 50,
        search: debouncedSearch,
      };

      const res = await adminBookingService.getAllBookings(params);
      if (res?.success) {
        const fetched = res.data || [];
        setBookings(fetched);

        // Keep existing selected order updated or auto-select first order
        setSelectedOrder(prev => {
          if (!prev && fetched.length > 0) return fetched[0];
          if (prev) {
            const updated = fetched.find(b => b._id === prev._id);
            return updated || prev;
          }
          return null;
        });
      }
    } catch (error) {
      console.error('Error fetching tracking data:', error);
      if (!silent) toast.error('Failed to load tracking data');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh interval every 15s if enabled
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchData(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  // Summary Metrics
  const stats = useMemo(() => {
    const active = bookings.filter(b => !['completed', 'cancelled', 'rejected'].includes(b.status)).length;
    const enRoute = bookings.filter(b => ['journey_started', 'visited'].includes(b.status)).length;
    const inProgress = bookings.filter(b => ['in_progress', 'work_done'].includes(b.status)).length;
    const completedToday = bookings.filter(b => {
      if (b.status !== 'completed') return false;
      const d = new Date(b.completedAt || b.updatedAt);
      const today = new Date();
      return d.toDateString() === today.toDateString();
    }).length;

    return { active, enRoute, inProgress, completedToday, total: bookings.length };
  }, [bookings]);

  // Filtered Bookings List
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      if (statusFilter === 'ALL') return true;
      if (statusFilter === 'ACTIVE') return !['completed', 'cancelled', 'rejected'].includes(b.status);
      if (statusFilter === 'EN_ROUTE') return ['journey_started', 'visited'].includes(b.status);
      if (statusFilter === 'IN_PROGRESS') return ['in_progress', 'work_done'].includes(b.status);
      if (statusFilter === 'CONFIRMED') return ['confirmed', 'accepted', 'assigned'].includes(b.status);
      if (statusFilter === 'COMPLETED') return b.status === 'completed';
      if (statusFilter === 'CANCELLED') return ['cancelled', 'rejected'].includes(b.status);
      return true;
    });
  }, [bookings, statusFilter]);

  const copyBookingNumber = (bookingNumber, e) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(bookingNumber);
    setCopiedId(bookingNumber);
    toast.success(`Copied #${bookingNumber}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusStep = (status) => {
    switch (status) {
      case 'searching':
      case 'no_vendors_available':
      case 'pending': return 0;
      case 'confirmed':
      case 'accepted':
      case 'assigned': return 1;
      case 'journey_started': return 2;
      case 'visited':
      case 'in_progress': return 3;
      case 'work_done': return 4;
      case 'completed': return 5;
      case 'cancelled':
      case 'rejected': return -1;
      default: return 0;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'in_progress':
        return {
          label: 'In Progress',
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          dot: 'bg-blue-600 animate-ping'
        };
      case 'journey_started':
        return {
          label: 'Partner En Route',
          bg: 'bg-purple-50 text-purple-700 border-purple-200',
          dot: 'bg-purple-600 animate-ping'
        };
      case 'visited':
        return {
          label: 'Partner Reached',
          bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          dot: 'bg-indigo-600'
        };
      case 'work_done':
        return {
          label: 'Work Done',
          bg: 'bg-teal-50 text-teal-700 border-teal-200',
          dot: 'bg-teal-600'
        };
      case 'completed':
        return {
          label: 'Completed',
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-600'
        };
      case 'confirmed':
      case 'accepted':
        return {
          label: 'Confirmed',
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          dot: 'bg-amber-600'
        };
      case 'assigned':
        return {
          label: 'Partner Assigned',
          bg: 'bg-sky-50 text-sky-700 border-sky-200',
          dot: 'bg-sky-600'
        };
      case 'searching':
        return {
          label: 'Searching Partner',
          bg: 'bg-orange-50 text-orange-700 border-orange-200',
          dot: 'bg-orange-600 animate-ping'
        };
      case 'no_vendors_available':
        return {
          label: 'No Partner Available',
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          dot: 'bg-rose-600'
        };
      case 'cancelled':
      case 'rejected':
        return {
          label: 'Cancelled',
          bg: 'bg-red-50 text-red-700 border-red-200',
          dot: 'bg-red-600'
        };
      default:
        return {
          label: status?.replace('_', ' ') || 'Pending',
          bg: 'bg-gray-50 text-gray-700 border-gray-200',
          dot: 'bg-gray-400'
        };
    }
  };

  const lifecycleSteps = [
    { title: 'Booking Placed', desc: 'Order received from customer', icon: FiClipboard, key: 'placed' },
    { title: 'Partner Accepted', desc: 'Service partner confirmed job', icon: FiShield, key: 'assigned' },
    { title: 'Journey Started', desc: 'Partner en route to location', icon: FiTruck, key: 'en_route' },
    { title: 'Visit & Verification', desc: 'Arrived & OTP verified', icon: FiNavigation, key: 'arrived' },
    { title: 'Work In Progress', desc: 'Active repair / service execution', icon: FiPackage, key: 'work' },
    { title: 'Job Completed', desc: 'Fulfillment & payment settled', icon: FiCheckCircle, key: 'completed' }
  ];

  // Render Inspector Body Component
  const renderInspectorContent = (order) => {
    const badge = getStatusBadge(order.status);
    const bookingNum = order.bookingNumber || order._id.slice(-6).toUpperCase();

    return (
      <div className="flex flex-col h-full space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-gray-900">
                #{bookingNum}
              </h2>
              <button
                onClick={(e) => copyBookingNumber(bookingNum, e)}
                className="text-gray-400 hover:text-blue-600 p-0.5"
                title="Copy ID"
              >
                <FiCopy className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs font-bold text-blue-600 mt-0.5">
              {order.serviceName || order.serviceId?.title || 'Service Booking'}
            </p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold border ${badge.bg}`}>
            {badge.label}
          </span>
        </div>

        {/* Dual Entities Card: Customer & Partner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Customer */}
          <div className="p-3 bg-gray-50/90 rounded-xl border border-gray-200/60">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Customer</p>
            <p className="text-xs font-bold text-gray-900 truncate">{order.userId?.name || 'Customer'}</p>
            {order.userId?.phone ? (
              <a href={`tel:${order.userId.phone}`} className="text-xs text-blue-600 font-semibold flex items-center gap-1 mt-1 hover:underline">
                <FiPhone className="w-3 h-3" />
                {order.userId.phone}
              </a>
            ) : (
              <p className="text-[11px] text-gray-400">No phone provided</p>
            )}
          </div>

          {/* Service Partner */}
          <div className="p-3 bg-gray-50/90 rounded-xl border border-gray-200/60">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Assigned Partner</p>
            {order.vendorId ? (
              <div>
                <p className="text-xs font-bold text-emerald-700 truncate">
                  {order.vendorId.businessName || order.vendorId.name}
                </p>
                {order.vendorId.phone && (
                  <a href={`tel:${order.vendorId.phone}`} className="text-xs text-emerald-600 font-semibold flex items-center gap-1 mt-1 hover:underline">
                    <FiPhone className="w-3 h-3" />
                    {order.vendorId.phone}
                  </a>
                )}
              </div>
            ) : (
              <p className="text-xs font-bold text-amber-600">Pending Assignment</p>
            )}
          </div>
        </div>

        {/* Location & Slot Info */}
        <div className="p-3 bg-blue-50/40 rounded-xl border border-blue-100 text-xs space-y-1.5">
          <div className="flex items-start gap-2 text-gray-700">
            <FiMapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-gray-900">
                {order.address?.addressLine1 || order.address?.street || 'Customer Address'}
              </p>
              <p className="text-[11px] text-gray-500">
                {[order.address?.city, order.address?.state, order.address?.pincode].filter(Boolean).join(', ')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-gray-600 text-[11px] pt-1 border-t border-blue-100/60">
            <FiCalendar className="w-3.5 h-3.5 text-blue-600" />
            <span>
              Scheduled: <strong>{new Date(order.scheduledDate || order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
              {order.scheduledTimeSlot ? ` (${order.scheduledTimeSlot})` : ''}
            </span>
          </div>
        </div>

        {/* Real-Time Stepper Progression */}
        <div className="flex-1 space-y-3 py-1 overflow-y-auto max-h-[220px] scrollbar-admin">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Lifecycle Progress</p>
          
          <div className="relative pl-6 space-y-3.5 border-l-2 border-gray-100 ml-3">
            {lifecycleSteps.map((step, index) => {
              const currentStep = getStatusStep(order.status);
              const isCancelled = order.status === 'cancelled' || order.status === 'rejected';
              const isCompleted = !isCancelled && index <= currentStep;
              const isCurrent = !isCancelled && index === currentStep;

              return (
                <div key={step.key} className="relative">
                  <div
                    className={`absolute -left-[31px] top-0 w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${
                      isCancelled
                        ? 'bg-red-50 border-red-400 text-red-500'
                        : isCurrent
                        ? 'bg-blue-600 border-blue-600 text-white ring-4 ring-blue-100 shadow-xs'
                        : isCompleted
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'bg-white border-gray-200 text-gray-300'
                    }`}
                  >
                    {isCompleted ? (
                      <FiCheck className="w-3.5 h-3.5" />
                    ) : (
                      <step.icon className="w-3 h-3" />
                    )}
                  </div>

                  <div>
                    <h4 className={`text-xs font-bold ${isCurrent ? 'text-blue-600' : isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                      {step.title}
                    </h4>
                    <p className="text-[11px] text-gray-500">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="pt-3 border-t border-gray-100 mt-auto space-y-2">
          <button
            onClick={() => setChatModalOpen(true)}
            className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-2.5 rounded-xl border border-indigo-200/80 transition-all text-xs flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
          >
            <FiMessageSquare className="w-4 h-4" />
            <span>Audit Real-Time Chat Oversight</span>
          </button>

          <button
            onClick={() => navigate(`/admin/bookings/${order._id}`)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <span>View Complete Order File</span>
            <FiChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* ── Top Metric Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider">Live Tracking</p>
            <h3 className="text-xl sm:text-2xl font-black text-blue-600 mt-0.5">{stats.active}</h3>
            <p className="text-[10px] sm:text-[11px] text-gray-500 font-medium mt-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span>
              Active Operations
            </p>
          </div>
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <FiActivity className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider">On Route</p>
            <h3 className="text-xl sm:text-2xl font-black text-purple-600 mt-0.5">{stats.enRoute}</h3>
            <p className="text-[10px] sm:text-[11px] text-gray-500 font-medium mt-0.5">En route to customer</p>
          </div>
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <FiTruck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider">In Service</p>
            <h3 className="text-xl sm:text-2xl font-black text-amber-600 mt-0.5">{stats.inProgress}</h3>
            <p className="text-[10px] sm:text-[11px] text-gray-500 font-medium mt-0.5">Active on doorstep</p>
          </div>
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <FiPackage className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider">Completed Today</p>
            <h3 className="text-xl sm:text-2xl font-black text-emerald-600 mt-0.5">{stats.completedToday}</h3>
            <p className="text-[10px] sm:text-[11px] text-gray-500 font-medium mt-0.5">Successfully fulfilled</p>
          </div>
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <FiCheckCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ── Toolbar: Search, Filter Tabs & Auto-refresh ─────────────────── */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by Booking #, Customer, or Partner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-gray-50/80 border border-gray-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-800 placeholder-gray-400"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 p-1"
            >
              ✕
            </button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'ACTIVE', label: 'Live' },
            { id: 'CONFIRMED', label: 'Confirmed' },
            { id: 'EN_ROUTE', label: 'On Route' },
            { id: 'IN_PROGRESS', label: 'In Progress' },
            { id: 'COMPLETED', label: 'Completed' },
            { id: 'CANCELLED', label: 'Cancelled' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-gray-100/70 text-gray-600 hover:bg-gray-200/70'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Live Auto-refresh Controls */}
        <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
              autoRefresh
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-gray-50 text-gray-500 border-gray-200'
            }`}
            title="Toggle Live Stream Auto-refresh (15s)"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-ping' : 'bg-gray-400'}`}></span>
            Auto-Sync
          </button>
          <button
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50/60 rounded-xl border border-gray-200/80 transition-all cursor-pointer disabled:opacity-50"
            title="Refresh Now"
          >
            <FiRefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Two-Column High-Grade Tracking Dashboard ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Live Orders Stream (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col min-h-[520px] max-h-[calc(100vh-280px)]">
          {/* Header */}
          <div className="px-4 sm:px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-gray-800">Live Orders Feed</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold text-[11px]">
                {filteredBookings.length}
              </span>
            </div>
            <span className="text-[11px] font-medium text-gray-400">Click any order to inspect</span>
          </div>

          {/* List Content */}
          <div className="overflow-y-auto flex-1 divide-y divide-gray-100 scrollbar-admin">
            {loading ? (
              <div className="p-12 text-center">
                <FiRefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-600">Loading live tracking stream...</p>
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <FiPackage className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm font-bold text-gray-600">No active bookings found</p>
                <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or search query</p>
              </div>
            ) : (
              filteredBookings.map((booking) => {
                const badge = getStatusBadge(booking.status);
                const isSelected = selectedOrder?._id === booking._id;
                const bookingNum = booking.bookingNumber || booking._id.slice(-6).toUpperCase();

                return (
                  <div
                    key={booking._id}
                    onClick={() => {
                      setSelectedOrder(booking);
                      // On mobile, trigger inspector sheet
                      if (window.innerWidth < 1024) {
                        setMobileDetailOpen(true);
                      }
                    }}
                    className={`p-3.5 sm:p-4 transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-blue-50/70 border-l-4 border-blue-600 shadow-2xs'
                        : 'hover:bg-gray-50/80 border-l-4 border-transparent'
                    }`}
                  >
                    {/* Order Details */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <ServiceIcon iconUrl={booking.serviceId?.iconUrl} title={booking.serviceName} />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-xs sm:text-sm text-gray-900">
                            #{bookingNum}
                          </span>
                          <button
                            onClick={(e) => copyBookingNumber(bookingNum, e)}
                            className="text-gray-400 hover:text-blue-600 p-0.5"
                            title="Copy Booking Number"
                          >
                            {copiedId === bookingNum ? (
                              <FiCheck className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <FiCopy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${badge.bg}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                            {badge.label}
                          </span>
                        </div>

                        <p className="text-xs font-bold text-gray-800 mt-1 truncate">
                          {booking.serviceName || booking.serviceId?.title || 'Home Service'}
                        </p>

                        <div className="flex items-center gap-2.5 text-[11px] text-gray-500 mt-1 flex-wrap">
                          <span className="flex items-center gap-1">
                            <FiUser className="w-3 h-3 text-gray-400" />
                            {booking.userId?.name || 'Customer'}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <FiCalendar className="w-3 h-3 text-gray-400" />
                            {new Date(booking.scheduledDate || booking.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          <span>•</span>
                          <span className="font-bold text-gray-800">
                            ₹{booking.finalAmount || booking.userPayableAmount || 0}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Partner & Action */}
                    <div className="flex items-center sm:flex-col items-end gap-2 shrink-0 self-end sm:self-center">
                      {booking.vendorId ? (
                        <div className="text-right">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            Partner Assigned
                          </span>
                          <p className="text-xs font-semibold text-gray-700 mt-1 truncate max-w-[130px]">
                            {booking.vendorId.businessName || booking.vendorId.name}
                          </p>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          Awaiting Partner
                        </span>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrder(booking);
                          if (window.innerWidth < 1024) {
                            setMobileDetailOpen(true);
                          }
                        }}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-gray-100 text-gray-700 hover:bg-blue-600 hover:text-white'
                        }`}
                      >
                        {isSelected ? 'Inspecting' : 'Track'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Interactive Real-Time Inspector (Desktop 5 Cols) */}
        <div className="hidden lg:flex lg:col-span-5 bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-5 sm:p-6 min-h-[520px] flex-col">
          <AnimatePresence mode="wait">
            {selectedOrder ? (
              <motion.div
                key={selectedOrder._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full flex flex-col"
              >
                {renderInspectorContent(selectedOrder)}
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-8 text-gray-400 my-auto">
                <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mb-3">
                  <FiActivity className="w-8 h-8 animate-pulse" />
                </div>
                <h3 className="text-sm font-bold text-gray-700">Select an Order</h3>
                <p className="text-xs text-gray-400 mt-1 max-w-xs">
                  Choose any active booking from the live stream on the left to monitor live dispatch progression.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile Inspector Drawer / Modal Sheet */}
      <AnimatePresence>
        {mobileDetailOpen && selectedOrder && (
          <div className="fixed inset-0 z-50 lg:hidden flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileDetailOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-xs"
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl max-h-[85vh] overflow-y-auto flex flex-col z-10"
            >
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Order Inspector</span>
                <button
                  onClick={() => setMobileDetailOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-700 rounded-lg"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              {renderInspectorContent(selectedOrder)}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Real-time Chat Oversight Drawer */}
      {selectedOrder && (
        <ChatDrawerModal
          isOpen={chatModalOpen}
          onClose={() => setChatModalOpen(false)}
          bookingId={selectedOrder._id}
          bookingData={selectedOrder}
          userType="admin"
        />
      )}
    </div>
  );
};

export default Tracking;
