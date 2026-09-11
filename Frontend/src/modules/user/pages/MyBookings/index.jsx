import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowLeft,
  FiClock,
  FiMapPin,
  FiCheckCircle,
  FiXCircle,
  FiLoader,
  FiCalendar,
  FiChevronRight,
  FiTag,
  FiZap
} from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { bookingService } from '../../../../services/bookingService';
import NotificationBell from '../../components/common/NotificationBell';

const MyBookings = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, confirmed, in-progress, completed, cancelled

  const quickCategories = [
    { id: 'electrician', title: 'Electrician & Plumber', image: '/cat_electrician_plumber.png' },
    { id: 'cleaning', title: 'Deep Cleaning', image: '/cat_cleaning.png' },
    { id: 'ac-repair', title: 'AC Service & Repair', image: '/ac_foam_jet_service.png' },
    { id: 'appliance', title: 'Appliance Repair', image: '/drill_wall_decor.png' },
  ];

  useEffect(() => {
    let isMounted = true;
    let debounceTimer = null;

    const loadBookings = async (isBackground = false) => {
      try {
        if (!isBackground) setLoading(true);
        const params = {};
        if (filter !== 'all') {
          params.status = filter;
        }
        const response = await bookingService.getUserBookings(params);
        if (isMounted) {
          if (response.success) {
            setBookings(response.data || []);
          } else {
            setBookings([]);
          }
        }
      } catch (error) {
        console.warn('Load bookings error:', error);
        if (isMounted) setBookings([]);
      } finally {
        if (isMounted && !isBackground) {
          setLoading(false);
        }
      }
    };

    loadBookings(false);

    const handleBackgroundUpdate = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadBookings(true);
      }, 300);
    };

    window.addEventListener('userBookingsUpdated', handleBackgroundUpdate);
    return () => {
      isMounted = false;
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener('userBookingsUpdated', handleBackgroundUpdate);
    };
  }, [filter]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed':
        return <FiCheckCircle className="w-3.5 h-3.5" />;
      case 'in_progress':
      case 'in-progress':
        return <FiLoader className="w-3.5 h-3.5 animate-spin" />;
      case 'journey_started':
      case 'visited':
        return <FiMapPin className="w-3.5 h-3.5" />;
      case 'completed':
        return <FiCheckCircle className="w-3.5 h-3.5" />;
      case 'cancelled':
      case 'rejected':
        return <FiXCircle className="w-3.5 h-3.5" />;
      case 'awaiting_payment':
      default:
        return <FiClock className="w-3.5 h-3.5" />;
    }
  };

  const getStatusBorderColor = (status) => {
    switch (status) {
      case 'confirmed': return 'border-l-emerald-500';
      case 'in_progress':
      case 'in-progress':
      case 'journey_started':
      case 'visited':
        return 'border-l-blue-500';
      case 'completed': return 'border-l-[#0B132B]';
      case 'cancelled':
      case 'rejected': return 'border-l-rose-500';
      case 'awaiting_payment': return 'border-l-amber-500';
      default: return 'border-l-slate-300';
    }
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'in_progress':
      case 'in-progress':
      case 'journey_started':
      case 'visited':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'completed':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      case 'cancelled':
      case 'rejected':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'awaiting_payment':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusLabel = (status) => {
    if (!status) return 'Unknown';
    switch (status) {
      case 'in_progress':
      case 'in-progress':
        return 'In Progress';
      case 'journey_started': return 'On The Way';
      case 'visited': return 'Arrived';
      case 'awaiting_payment': return 'Awaiting Payment';
      case 'work_done': return 'Work Completed';
      default: return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
    }
  };

  const handleBookingClick = (booking) => {
    navigate(`/user/booking/${booking._id || booking.id}`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Today';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getAddressString = (address) => {
    if (typeof address === 'string') return address;
    if (address && typeof address === 'object') {
      const parts = [
        address.addressLine1,
        address.city
      ].filter(Boolean);
      return parts.join(', ');
    }
    return 'Saved Doorstep Address';
  };

  return (
    <div className="min-h-screen bg-[var(--background,#F8F9FA)] text-[var(--text-primary,#1F2937)] font-sans antialiased pb-28">
      <div className="relative z-10">
        {/* Sticky Header */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[var(--border,#E5E7EB)] px-4 py-3 shadow-2xs">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="w-8 h-8 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center transition-colors active:scale-95"
                aria-label="Go back"
              >
                <FiArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h1 className="text-base font-bold text-slate-900 tracking-tight leading-none">
                  My Bookings
                </h1>
                <span className="text-[10px] text-slate-500 font-medium">Track Doorstep Services</span>
              </div>
            </div>
            <NotificationBell />
          </div>
        </header>

        {/* Filter Pills */}
        <section className="bg-white/90 backdrop-blur-xs border-b border-[var(--border,#E5E7EB)] sticky top-[53px] z-30 shadow-2xs">
          <div className="max-w-4xl mx-auto px-4 py-2 flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {[
              { id: 'all', label: 'All Bookings' },
              { id: 'confirmed', label: 'Confirmed' },
              { id: 'in-progress', label: 'In Progress' },
              { id: 'completed', label: 'Completed' },
              { id: 'cancelled', label: 'Cancelled' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
                  filter === tab.id
                    ? 'bg-[#B33A35] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        {/* Main Content Area */}
        <main className="max-w-4xl mx-auto px-4 pt-4 space-y-3.5">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-md p-3 border border-[var(--border,#E5E7EB)] shadow-xs animate-pulse space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="h-4 w-32 bg-slate-200 rounded"></div>
                    <div className="h-5 w-20 bg-slate-200 rounded-full"></div>
                  </div>
                  <div className="h-16 bg-slate-100 rounded-md"></div>
                </div>
              ))}
            </div>
          ) : bookings.length === 0 ? (
            /* RICH EMPTY STATE CARD */
            <div className="space-y-6 pt-2">
              <div className="bg-white rounded-md p-8 text-center border border-[var(--border,#E5E7EB)] shadow-2xs space-y-4 relative overflow-hidden">
                <div className="w-16 h-16 mx-auto rounded-xl bg-gradient-to-tr from-[#B33A35] via-[#D56C67] to-[#9E2E2A] text-white flex items-center justify-center shadow-md">
                  <FiCalendar className="w-8 h-8" />
                </div>

                <div className="max-w-sm mx-auto space-y-1.5">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    No {filter === 'all' ? 'Active' : filter.replace('-', ' ')} Bookings
                  </h2>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    {filter === 'all'
                      ? "Looks like you haven't booked any doorstep services yet. Explore verified experts & instant dispatch!"
                      : `You don't have any ${filter.replace('-', ' ')} service bookings at the moment.`}
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => navigate('/user')}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md bg-[#B33A35] hover:bg-[#9E2E2A] text-white font-semibold text-xs uppercase tracking-wider shadow-sm transition-all active:scale-95"
                  >
                    <HiSparkles className="w-4 h-4 text-amber-200" />
                    <span>Book a Home Service</span>
                  </button>
                </div>
              </div>

              {/* POPULAR CATEGORY SHORTCUTS */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-900 tracking-tight px-1">
                  Services Ready for Immediate Booking
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {quickCategories.map((cat) => (
                    <div
                      key={cat.id}
                      onClick={() => navigate('/user')}
                      className="bg-white rounded-md p-3 border border-[var(--border,#E5E7EB)] shadow-2xs hover:border-[#B33A35] transition-all cursor-pointer group flex flex-col items-center text-center space-y-2"
                    >
                      <div className="w-full aspect-square rounded-md bg-slate-50 flex items-center justify-center p-2 overflow-hidden">
                        <img
                          src={cat.image}
                          alt={cat.title}
                          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <span className="text-xs font-semibold text-slate-900 leading-tight">
                        {cat.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* POPULATED BOOKINGS LIST */
            <div className="space-y-3">
              {bookings.map((booking) => {
                const bookingImg = booking.serviceImage || booking.image || booking.items?.[0]?.image || booking.items?.[0]?.icon;
                const bookingTitle = booking.serviceName || booking.items?.[0]?.title || 'Home Service Request';
                const bookingCategory = booking.serviceCategory || booking.category || booking.items?.[0]?.category || 'Service';

                return (
                  <div
                    key={booking._id || booking.id}
                    onClick={() => handleBookingClick(booking)}
                    className="w-full bg-[var(--card-bg,#FFFFFF)] rounded-md p-2.5 sm:p-3 md:p-3.5 border border-[var(--border,#E5E7EB)] shadow-xs hover:border-[#B33A35]/60 transition-all cursor-pointer space-y-2.5 group"
                  >
                    {/* Top Row: Booking ID / Date + Status Badge */}
                    <div className="flex items-center justify-between gap-2 border-b border-[var(--border,#E5E7EB)] pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-slate-500">
                          #{booking.bookingNumber || (booking._id || booking.id).substring(0, 8).toUpperCase()}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {formatDate(booking.createdAt || booking.scheduledDate)}
                        </span>
                      </div>

                      {/* Status Badge (Pill: rounded-full px-2 py-0.5 text-[11px] font-semibold) */}
                      <div className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold flex items-center gap-1.5 shrink-0 ${getStatusBadgeStyle(booking.status)}`}>
                        {getStatusIcon(booking.status)}
                        <span>{getStatusLabel(booking.status)}</span>
                      </div>
                    </div>

                    {/* Middle Row: Thumbnail (left) + Service Title + Category + Scheduled Time (middle) + Price (right) */}
                    <div className="flex items-center gap-3">
                      {/* Thumbnail: w-16 h-16 (sm: w-20 h-20), rounded-md, object-cover, border */}
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-md overflow-hidden shrink-0 border border-[var(--border,#E5E7EB)] bg-slate-50 flex items-center justify-center">
                        {bookingImg ? (
                          <img
                            src={bookingImg}
                            alt={bookingTitle}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-[#B33A35]/10 text-[#B33A35] flex items-center justify-center font-bold text-base">
                            {(bookingTitle).charAt(0)}
                          </div>
                        )}
                      </div>

                      {/* Middle: Title + Category + Slot */}
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#B33A35] block">
                          {bookingCategory}
                        </span>
                        <h3 className="text-xs sm:text-sm font-semibold text-slate-900 truncate group-hover:text-[#B33A35] transition-colors mt-0.5">
                          {bookingTitle}
                        </h3>

                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium mt-1">
                          <FiCalendar className="w-3.5 h-3.5 text-[#B33A35] shrink-0" />
                          <span className="truncate">
                            {formatDate(booking.scheduledDate)} {booking.scheduledTime ? `• ${booking.scheduledTime}` : ''}
                          </span>
                        </div>
                      </div>

                      {/* Right: Price */}
                      <div className="text-right shrink-0">
                        <span className="text-xs text-slate-400 block font-medium">Total</span>
                        <span className="text-sm sm:text-base font-bold text-slate-900">
                          ₹{(booking.finalAmount || booking.totalAmount || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Row: Action Buttons (height 30-34px, rounded-md, text-xs font-semibold) */}
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-[var(--border,#E5E7EB)]">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBookingClick(booking);
                        }}
                        className="h-[32px] px-3 rounded-md bg-[#B33A35] hover:bg-[#9E2E2A] text-white text-xs font-semibold transition-colors flex items-center gap-1 shadow-xs active:scale-95"
                      >
                        <span>View Details</span>
                        <FiChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default MyBookings;
