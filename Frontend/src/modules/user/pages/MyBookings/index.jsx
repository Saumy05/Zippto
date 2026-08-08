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
    { id: 'scrap', title: 'Sell Scrap & Recyclables', image: '/drill_wall_decor.png' },
  ];

  useEffect(() => {
    const loadBookings = async () => {
      try {
        setLoading(true);
        const params = {};
        if (filter !== 'all') {
          params.status = filter;
        }
        const response = await bookingService.getUserBookings(params);
        if (response.success) {
          setBookings(response.data || []);
        } else {
          setBookings([]);
        }
      } catch (error) {
        console.warn('Load bookings error:', error);
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };

    loadBookings();

    window.addEventListener('userBookingsUpdated', loadBookings);
    return () => {
      window.removeEventListener('userBookingsUpdated', loadBookings);
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
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'cancelled':
      case 'rejected':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'awaiting_payment':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
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
      case 'awaiting_payment': return 'Request Accepted';
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
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827] font-sans antialiased pb-28">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -ml-20" />
      </div>

      <div className="relative z-10">
        {/* Sticky Header */}
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
                  My Bookings
                </h1>
                <span className="text-[10px] text-slate-500 font-semibold">Track Doorstep Services</span>
              </div>
            </div>
            <NotificationBell />
          </div>
        </header>

        {/* Filter Pills */}
        <section className="bg-white/80 backdrop-blur-xs border-b border-slate-200/80 sticky top-[57px] z-30 shadow-2xs">
          <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all active:scale-95 ${
                  filter === tab.id
                    ? 'bg-[#0B132B] text-amber-400 shadow-2xs'
                    : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200 border border-slate-200/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        {/* Main Content Area */}
        <main className="max-w-4xl mx-auto px-4 pt-5 space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs animate-pulse space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="h-4 w-32 bg-slate-200 rounded"></div>
                    <div className="h-6 w-20 bg-slate-200 rounded-full"></div>
                  </div>
                  <div className="h-10 bg-slate-100 rounded-xl"></div>
                </div>
              ))}
            </div>
          ) : bookings.length === 0 ? (
            /* RICH EMPTY STATE CARD */
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-8 text-center border border-slate-200/80 shadow-2xs space-y-4 relative overflow-hidden">
                <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-[#0B132B] via-[#1C2541] to-[#0B132B] text-amber-400 flex items-center justify-center shadow-lg border border-slate-800">
                  <FiCalendar className="w-10 h-10" />
                </div>

                <div className="max-w-sm mx-auto space-y-1.5">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
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
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[#0B132B] hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider shadow-md hover:shadow-lg active:scale-95 transition-all"
                  >
                    <HiSparkles className="w-4 h-4 text-amber-400" />
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
                      className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-2xs hover:border-slate-400 hover:shadow-xs transition-all cursor-pointer group flex flex-col items-center text-center space-y-2"
                    >
                      <div className="w-full aspect-square rounded-xl bg-slate-50 flex items-center justify-center p-2 overflow-hidden">
                        <img
                          src={cat.image}
                          alt={cat.title}
                          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-900 leading-tight">
                        {cat.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* POPULATED BOOKINGS LIST */
            <div className="space-y-3.5">
              {bookings.map((booking) => (
                <div
                  key={booking._id || booking.id}
                  onClick={() => handleBookingClick(booking)}
                  className={`bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 border-l-4 ${getStatusBorderColor(
                    booking.status
                  )} shadow-2xs hover:border-slate-300 transition-all cursor-pointer space-y-3.5 group relative overflow-hidden`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          #{booking.bookingNumber || (booking._id || booking.id).substring(0, 8)}
                        </span>
                        {booking.serviceCategory && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[10px] font-bold uppercase">
                            {booking.serviceCategory}
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug mt-1 group-hover:text-blue-600 transition-colors">
                        {booking.serviceName || 'Home Service Request'}
                      </h3>
                    </div>

                    {/* Status Badge */}
                    <div className={`px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0 ${getStatusBadgeStyle(booking.status)}`}>
                      {getStatusIcon(booking.status)}
                      <span>{getStatusLabel(booking.status)}</span>
                    </div>
                  </div>

                  {/* Slot & Address Info Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-slate-700 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2">
                      <FiCalendar className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>{formatDate(booking.scheduledDate)} • {booking.scheduledTime || 'Preferred Slot'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <FiMapPin className="w-4 h-4 text-rose-500 shrink-0" />
                      <span className="truncate">{getAddressString(booking.address)}</span>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Total Amount
                      </span>
                      <span className="text-base font-black text-slate-900">
                        ₹{(booking.finalAmount || booking.totalAmount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <button className="px-3.5 py-2 rounded-xl bg-slate-100 group-hover:bg-[#0B132B] group-hover:text-amber-400 text-slate-800 font-extrabold text-xs transition-all flex items-center gap-1">
                      <span>Details</span>
                      <FiChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default MyBookings;
