import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiClock, 
  FiMapPin, 
  FiTool, 
  FiCheckCircle, 
  FiChevronRight, 
  FiNavigation, 
  FiX, 
  FiCompass
} from 'react-icons/fi';
import userBookingService from '../../../../services/bookingService';
import RatingModal from './RatingModal';
import { toast } from 'react-hot-toast';
import { useSocket } from '../../../../context/SocketContext';

const LiveBookingCard = ({ hasBottomNav }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const socket = useSocket();
  const [activeBooking, setActiveBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Reset dismissed state when navigating to another route
  useEffect(() => {
    setIsDismissed(false);
  }, [location.pathname]);

  // Status mapping for UI
  const getStatusInfo = (status) => {
    switch (status?.toUpperCase()) {
      case 'ASSIGNED':
        return { 
          badge: 'Assigned',
          label: 'Expert Assigned', 
          icon: FiCheckCircle, 
          gradient: 'from-blue-600 to-indigo-600',
          shadow: 'shadow-blue-500/20',
          bgLight: 'bg-blue-50 text-blue-700 border-blue-200/60',
          sub: 'Preparing for journey',
          pulse: false,
          progressColor: 'bg-gradient-to-r from-blue-500 via-indigo-400 to-blue-600'
        };
      case 'STARTED':
      case 'JOURNEY_STARTED':
        return { 
          badge: 'On Way',
          label: 'Expert On The Way', 
          icon: FiNavigation, 
          gradient: 'from-amber-500 to-orange-500',
          shadow: 'shadow-orange-500/20',
          bgLight: 'bg-amber-50 text-amber-700 border-amber-200/60',
          sub: 'Live GPS Tracking', 
          pulse: true,
          progressColor: 'bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500'
        };
      case 'VISITED':
        return { 
          badge: 'Arrived',
          label: 'At Your Doorstep', 
          icon: FiMapPin, 
          gradient: 'from-emerald-500 to-teal-600',
          shadow: 'shadow-emerald-500/20',
          bgLight: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
          sub: 'Work Started',
          pulse: false,
          progressColor: 'bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600'
        };
      case 'IN_PROGRESS':
        return { 
          badge: 'Working',
          label: 'Service In Progress', 
          icon: FiTool, 
          gradient: 'from-purple-600 to-pink-600',
          shadow: 'shadow-purple-500/20',
          bgLight: 'bg-purple-50 text-purple-700 border-purple-200/60',
          sub: 'Repairs underway',
          pulse: true,
          progressColor: 'bg-gradient-to-r from-purple-500 via-pink-400 to-purple-600'
        };
      case 'WORK_DONE':
        return { 
          badge: 'Completed',
          label: 'Service Finished', 
          icon: FiCheckCircle, 
          gradient: 'from-emerald-600 to-green-600',
          shadow: 'shadow-emerald-500/20',
          bgLight: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
          sub: 'Invoice ready',
          pulse: false,
          progressColor: 'bg-gradient-to-r from-emerald-500 to-teal-500'
        };
      case 'REQUESTED':
      case 'SEARCHING':
        return { 
          badge: 'Live Radar',
          label: 'Finding Nearby Vendors', 
          icon: FiCompass, 
          gradient: 'from-teal-500 to-emerald-500',
          shadow: 'shadow-teal-500/25',
          bgLight: 'bg-teal-50 text-teal-700 border-teal-200/60',
          sub: 'Scanning within 10km radius...', 
          pulse: true,
          progressColor: 'bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-500'
        };
      default:
        return null;
    }
  };

  useEffect(() => {
    fetchActiveBooking();

    if (socket) {
      socket.on('booking_updated', fetchActiveBooking);
      socket.on('notification', fetchActiveBooking);
    }

    const interval = setInterval(fetchActiveBooking, 20000);
    return () => {
      clearInterval(interval);
      if (socket) {
        socket.off('booking_updated', fetchActiveBooking);
        socket.off('notification', fetchActiveBooking);
      }
    };
  }, [socket]);

  const fetchActiveBooking = async () => {
    try {
      const res = await userBookingService.getUserBookings({ limit: 5 });
      if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
        const ongoing = res.data.find(b => {
          const s = b.status?.toUpperCase();
          if (s === 'WORK_DONE' && b.rating) return false;
          return ['ASSIGNED', 'STARTED', 'JOURNEY_STARTED', 'VISITED', 'IN_PROGRESS', 'WORK_DONE', 'SEARCHING', 'REQUESTED'].includes(s);
        });
        setActiveBooking(ongoing || null);
      } else {
        setActiveBooking(null);
      }
    } catch (error) {
      // Soft ignore
    } finally {
      setLoading(false);
    }
  };

  // Auto-show rating modal when work is done
  useEffect(() => {
    if (activeBooking && activeBooking.status?.toUpperCase() === 'WORK_DONE' && !activeBooking.rating && !showRatingModal) {
      const dismissed = localStorage.getItem(`rating_dismissed_live_${activeBooking._id || activeBooking.id}`);
      if (!dismissed) {
        setShowRatingModal(true);
      }
    }
  }, [activeBooking]);

  const handleRateSubmit = async (ratingData) => {
    try {
      const bookingId = activeBooking._id || activeBooking.id;
      const response = await userBookingService.addReview(bookingId, ratingData);
      if (response.success) {
        toast.success('Thank you for your rating!', {
          icon: '🌟',
          style: { borderRadius: '15px', background: '#333', color: '#fff' }
        });
        setShowRatingModal(false);
        fetchActiveBooking();
      } else {
        toast.error(response.message || 'Failed to submit review');
      }
    } catch (error) {
      toast.error('Failed to submit review');
    }
  };

  if (!activeBooking || isDismissed) return null;

  const statusInfo = getStatusInfo(activeBooking.status);
  if (!statusInfo) return null;

  const Icon = statusInfo.icon;
  const isWorkDonePendingPay = activeBooking.status?.toUpperCase() === 'WORK_DONE' && !activeBooking.cashCollected;

  return (
    <AnimatePresence>
      <motion.div
        key="live-booking-card"
        initial={{ y: 60, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 60, opacity: 0, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        onClick={() => {
          const status = activeBooking.status?.toUpperCase();
          const bookingId = activeBooking._id || activeBooking.id;
          if (status === 'STARTED' || status === 'JOURNEY_STARTED') {
            navigate(`/user/booking/${bookingId}/track`);
          } else if (status === 'SEARCHING' || status === 'REQUESTED') {
            navigate(`/user/booking-confirmation/${bookingId}`);
          } else {
            navigate(`/user/booking/${bookingId}`);
          }
        }}
        className={`fixed ${hasBottomNav ? 'bottom-[4.25rem] sm:bottom-[4.5rem] lg:bottom-6' : 'bottom-4 sm:bottom-6'} left-3.5 right-3.5 sm:left-6 sm:right-6 max-w-md mx-auto z-40`}
      >
        <div className="relative bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.08)] border border-slate-200/90 overflow-hidden cursor-pointer active:scale-[0.98] transition-all group hover:border-teal-500/40">

          {/* Compact Main Card Content */}
          <div className="py-2.5 px-3 sm:px-3.5 flex items-center gap-2.5 sm:gap-3">
            
            {/* Compact Status Icon */}
            <div className="relative shrink-0">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${statusInfo.gradient} ${statusInfo.shadow} shadow-sm flex items-center justify-center text-white relative z-10`}>
                <Icon className={`w-4.5 h-4.5 ${statusInfo.pulse ? 'animate-pulse' : ''}`} />
              </div>

              {statusInfo.pulse && (
                <span className="absolute -inset-0.5 rounded-xl bg-teal-400/40 animate-ping pointer-events-none -z-0" />
              )}
            </div>

            {/* Middle Info Column */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-xs font-bold text-slate-900 tracking-tight truncate">
                  {statusInfo.label}
                </span>
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md text-[9px] font-bold border shrink-0 ${statusInfo.bgLight}`}>
                  <span className="w-1 h-1 rounded-full bg-current" />
                  {statusInfo.badge}
                </span>
              </div>
              
              <p className="text-[10px] font-medium text-slate-500 truncate leading-tight">
                {statusInfo.sub} • <span className="text-slate-700 font-semibold">{activeBooking.serviceName || 'Booking'}</span>
              </p>
            </div>

            {/* Right Action Trigger & Dismiss */}
            <div className="shrink-0 flex items-center gap-1">
              {isWorkDonePendingPay ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/user/booking/${activeBooking._id || activeBooking.id}`);
                  }}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black rounded-lg shadow-sm shadow-emerald-600/20 active:scale-95 transition-all"
                >
                  PAY
                </button>
              ) : (
                <div className="w-6 h-6 rounded-full bg-slate-100 group-hover:bg-slate-900 group-hover:text-white text-slate-500 flex items-center justify-center transition-colors">
                  <FiChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              )}

              {/* Compact Close Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDismissed(true);
                }}
                className="w-5 h-5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors ml-0.5"
                title="Dismiss"
                aria-label="Dismiss Alert"
              >
                <FiX className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Smooth Integrated Bottom Animated Progress Beam */}
          <div className="w-full h-0.5 bg-slate-100 relative overflow-hidden rounded-b-2xl">
            <motion.div
              className={`h-full ${statusInfo.progressColor}`}
              initial={{ x: "-100%", width: "40%" }}
              animate={{ x: ["-100%", "250%"] }}
              transition={{ 
                repeat: Infinity, 
                duration: 1.6, 
                ease: "easeInOut" 
              }}
            />
          </div>
        </div>
      </motion.div>

      {/* Global Rating Modal */}
      <RatingModal
        key="rating-modal"
        isOpen={showRatingModal}
        onClose={() => {
          setShowRatingModal(false);
          if (activeBooking) {
            localStorage.setItem(`rating_dismissed_live_${activeBooking._id || activeBooking.id}`, 'true');
          }
        }}
        onSubmit={handleRateSubmit}
        bookingName={activeBooking.serviceName || 'Service'}
        workerName={activeBooking.workerId?.name || 'Expert'}
      />
    </AnimatePresence>
  );
};

export default LiveBookingCard;
