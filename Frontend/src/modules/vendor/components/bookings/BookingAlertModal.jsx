import React, { useState, useEffect } from 'react';
import { FiX, FiMapPin, FiClock, FiArrowRight, FiBell, FiMinimize2 } from 'react-icons/fi';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { stopAlertRing } from '../../../../utils/notificationSound';

const BookingAlertCard = ({ booking, onAccept, onReject, maxSearchTimeMins = 1 }) => {
  // Calculate initial time synchronously instead of relying solely on useEffect
  const calculateInitialRemaining = () => {
    try {
      if (booking?.expiresAt) {
        const end = new Date(booking.expiresAt).getTime();
        if (!isNaN(end)) {
          const left = Math.floor((end - Date.now()) / 1000);
          return Math.max(0, left);
        }
      }

      const totalDurationMins = Number(maxSearchTimeMins) || 5;
      const initialDurationSecs = totalDurationMins * 60;

      if (booking?.createdAt) {
        const start = new Date(booking.createdAt).getTime();
        if (!isNaN(start)) {
          const elapsed = Math.floor((Date.now() - start) / 1000);
          return Math.max(0, initialDurationSecs - elapsed);
        }
      }

      return initialDurationSecs;
    } catch {
      return (Number(maxSearchTimeMins) || 1) * 60;
    }
  };

  const [timeLeft, setTimeLeft] = useState(calculateInitialRemaining());
  const [loadingAction, setLoadingAction] = useState(null);

  const handleAction = async (actionFn, actionType) => {
    if (loadingAction) return;
    setLoadingAction(actionType);
    const bookingId = booking.id || booking._id;
    localStorage.removeItem(`alert_start_${bookingId}`);
    try {
      if (actionFn) await actionFn(bookingId);
    } catch (error) {
      console.error(error);
    } finally {
      if (typeof window !== 'undefined') {
        // Prevent immediate re-enabling if unmounted, handled by React state memory leak warning natively, but usually safe
        setLoadingAction(null);
      }
    }
  };

  useEffect(() => {
    if (!booking) return;

    const bookingId = booking.id || booking._id;
    const totalDurationMins = Number(maxSearchTimeMins) || 5;
    const initialDurationSecs = totalDurationMins * 60;

    const calculateRemaining = () => {
      try {
        if (booking.expiresAt) {
          const end = new Date(booking.expiresAt).getTime();
          if (!isNaN(end)) {
            const left = Math.floor((end - Date.now()) / 1000);
            return Math.max(0, left);
          }
        }

        if (booking.createdAt) {
          const start = new Date(booking.createdAt).getTime();
          if (!isNaN(start)) {
            const elapsed = Math.floor((Date.now() - start) / 1000);
            return Math.max(0, initialDurationSecs - elapsed);
          }
        }

        return initialDurationSecs;
      } catch (err) {
        console.error("Timer calculation error:", err);
        return 0;
      }
    };

    const remaining = calculateRemaining();
    setTimeLeft(remaining);

    if (remaining <= 0) {
      onReject?.(bookingId);
      window.dispatchEvent(new CustomEvent('removeVendorBooking', { detail: { id: bookingId } }));
      return;
    }

    const timer = setInterval(() => {
      const currentRemaining = calculateRemaining();
      setTimeLeft(currentRemaining);

      if (currentRemaining <= 0) {
        clearInterval(timer);
        onReject?.(bookingId);
        window.dispatchEvent(new CustomEvent('removeVendorBooking', { detail: { id: bookingId } }));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [booking, onReject, booking.expiresAt, booking.createdAt, maxSearchTimeMins]);

  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  // Progress relative to the total max search time to ensure the circle shrinks correctly
  const totalDurationSecs = (Number(maxSearchTimeMins) || 5) * 60;
  const progress = (Math.max(0, Math.min(totalDurationSecs, timeLeft)) / totalDurationSecs) * circumference;
  const dashoffset = circumference - progress;

  // Extracted fields with clean fallbacks
  const payout = booking.vendorEarnings || booking.price || booking.finalAmount || booking.basePrice || booking.userPayableAmount;
  const rawDist = booking.location?.distance || booking.distance;
  const formattedDistance = rawDist ? (String(rawDist).includes('km') ? rawDist : `${rawDist} km`) : 'Near You';
  const categoryTitle = booking.serviceCategory || booking.serviceId?.categoryId?.title || booking.serviceId?.category?.title || booking.categoryName || 'Home Service';
  const categoryIcon = booking.categoryIcon || booking.serviceId?.category?.icon;
  const serviceTitle = booking.serviceName || booking.serviceType || booking.serviceId?.title || 'Service Request';
  const address = booking.location?.address || booking.address?.addressLine1 || booking.address?.fullAddress || 'Address available upon accepting';
  const dateStr = booking.timeSlot?.date || (booking.scheduledDate ? new Date(booking.scheduledDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '');
  const timeStr = booking.timeSlot?.time || booking.scheduledTime || 'ASAP';
  const bookingCode = booking.bookingNumber || (booking.id || booking._id ? `#${String(booking.id || booking._id).slice(-6).toUpperCase()}` : '');

  return (
    <div className="bg-white w-full max-w-[360px] sm:max-w-[380px] flex-none rounded-[28px] overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.15)] relative snap-center select-none flex flex-col max-h-[90vh]">
      {/* Top Hero Section with Integrated Countdown */}
      <div className="relative bg-gradient-to-br from-slate-950 via-teal-950 to-emerald-950 text-white px-5 pt-5 pb-5 overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute -top-10 -right-10 w-36 h-36 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-teal-500/20 rounded-full blur-2xl pointer-events-none" />

        {/* Top Status & Booking ID Row */}
        <div className="flex items-center justify-between relative z-10 mb-3.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-md shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
            <span>New Service Request</span>
          </div>
          {bookingCode && (
            <span className="text-[10px] font-mono font-bold text-slate-300/90 bg-white/10 px-2.5 py-0.5 rounded-md backdrop-blur-md border border-white/10">
              {bookingCode}
            </span>
          )}
        </div>

        {/* Central Countdown Hero */}
        <div className="flex flex-col items-center justify-center relative z-10">
          <div className="relative w-20 h-20 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 80 80">
              {/* Background Track */}
              <circle
                cx="40"
                cy="40"
                r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="5"
              />
              {/* Animated Progress Ring */}
              <Motion.circle
                cx="40"
                cy="40"
                r={radius}
                fill="none"
                stroke={timeLeft <= 10 ? '#EF4444' : timeLeft <= 30 ? '#F59E0B' : '#10B981'}
                strokeWidth="5.5"
                strokeDasharray={circumference}
                strokeDashoffset={dashoffset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-linear"
                style={{
                  filter: timeLeft <= 10
                    ? 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.8))'
                    : 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.5))'
                }}
              />
            </svg>

            {/* Center Digits */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className={`text-xl font-black font-mono tracking-tight leading-none ${
                timeLeft <= 10 ? 'text-red-400 animate-pulse' : timeLeft <= 30 ? 'text-amber-300' : 'text-white'
              }`}>
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </span>
              <span className="text-[7.5px] font-bold uppercase tracking-widest text-slate-400 block mt-0.5">
                {timeLeft <= 20 ? 'EXPIRING' : 'MINS LEFT'}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-teal-100/80 font-medium tracking-wide mt-2 text-center">
            Action required immediately • Accept before timeout
          </p>
        </div>
      </div>

      {/* Body Content */}
      <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 scrollbar-hide">
        {/* Quick Highlights / Metrics Bar */}
        <div className="grid grid-cols-3 gap-2">
          {/* Distance */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-2.5 text-center shadow-xs">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Distance</span>
            <div className="text-sm font-black text-slate-800 tracking-tight flex items-center justify-center gap-1 mt-0.5">
              <FiMapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span className="truncate">{formattedDistance}</span>
            </div>
          </div>

          {/* Estimated Payout or Service Category */}
          <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-2.5 text-center shadow-xs">
            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-800/70 block">
              {payout ? 'Est. Payout' : 'Booking'}
            </span>
            <div className="text-sm font-black text-emerald-700 tracking-tight flex items-center justify-center gap-0.5 mt-0.5">
              {payout ? (
                <span>₹{payout}</span>
              ) : (
                <span className="text-xs">Direct</span>
              )}
            </div>
          </div>

          {/* Schedule / Time */}
          <div className="bg-amber-50/70 border border-amber-200/70 rounded-2xl p-2.5 text-center shadow-xs">
            <span className="text-[9px] font-black uppercase tracking-wider text-amber-800/70 block">Timing</span>
            <div className="text-xs font-black text-amber-900 tracking-tight flex items-center justify-center gap-1 mt-1 truncate">
              <FiClock className="w-3 h-3 text-amber-600 shrink-0" />
              <span className="truncate">{timeStr}</span>
            </div>
          </div>
        </div>

        {/* Service Details Card */}
        <div className="bg-slate-50/90 border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between gap-2 mb-2">
            {/* Category Pill */}
            <div className="inline-flex items-center gap-1.5 bg-white border border-slate-200/90 px-2.5 py-1 rounded-lg shadow-2xs">
              {categoryIcon ? (
                <img src={categoryIcon} alt="Category" className="w-3.5 h-3.5 object-contain" />
              ) : (
                <span className="w-3.5 h-3.5 flex items-center justify-center bg-teal-50 text-teal-700 rounded-full text-[9px] font-bold">
                  ⚡
                </span>
              )}
              <span className="text-[10px] font-black tracking-wider text-slate-700 uppercase line-clamp-1 max-w-[140px]">
                {categoryTitle}
              </span>
            </div>

            {/* Urgent Badge */}
            <div className="inline-flex items-center gap-1 bg-rose-50 border border-rose-200/80 px-2 py-1 rounded-md">
              <FiBell className="w-3 h-3 text-rose-600 animate-pulse" />
              <span className="text-[9px] font-black text-rose-600 tracking-wider uppercase">
                Urgent
              </span>
            </div>
          </div>

          {/* Service Title */}
          <h4 className="text-[15px] font-black text-slate-900 leading-snug tracking-tight">
            {serviceTitle}
          </h4>

          {/* Brand Info */}
          {booking.brandName && (
            <div className="flex items-center gap-1.5 mt-2 bg-white border border-slate-200/70 px-2 py-0.5 rounded-md w-fit">
              {booking.brandIcon && (
                <img src={booking.brandIcon} alt={booking.brandName} className="w-3.5 h-3.5 object-contain" />
              )}
              <span className="text-[9px] font-bold text-slate-400 uppercase">Brand:</span>
              <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider">{booking.brandName}</span>
            </div>
          )}
        </div>

        {/* Location & Schedule Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-2xs space-y-2.5 text-xs">
          <div className="flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-teal-50 border border-teal-200/60 flex items-center justify-center shrink-0 mt-0.5 text-teal-700">
              <FiMapPin className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Service Location</span>
              <p className="font-bold text-slate-800 leading-snug line-clamp-2 text-xs mt-0.5">
                {address}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 pt-2 border-t border-slate-100">
            <div className="w-6 h-6 rounded-lg bg-amber-50 border border-amber-200/60 flex items-center justify-center shrink-0 mt-0.5 text-amber-700">
              <FiClock className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Scheduled For</span>
              <p className="font-bold text-slate-800 text-xs mt-0.5">
                {dateStr ? `${dateStr} • ` : ''}{timeStr}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 pt-1">
          <button
            disabled={!!loadingAction}
            onClick={() => handleAction(onReject, 'reject')}
            className="flex-1 py-3.5 rounded-2xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 font-extrabold text-xs tracking-wider uppercase active:scale-95 transition-all flex items-center justify-center gap-1.5 border border-slate-200/80 disabled:opacity-50"
          >
            {loadingAction === 'reject' ? (
              <span className="inline-flex items-center gap-1">
                <span className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                Declining...
              </span>
            ) : (
              <>
                <FiX className="w-4 h-4" />
                <span>Decline</span>
              </>
            )}
          </button>

          <button
            disabled={!!loadingAction}
            onClick={() => handleAction(onAccept, 'accept')}
            className="flex-[2] py-3.5 rounded-2xl text-white font-black text-sm tracking-wide shadow-[0_6px_20px_rgba(16,185,129,0.4)] hover:shadow-[0_8px_25px_rgba(16,185,129,0.5)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:brightness-105 disabled:opacity-50 relative overflow-hidden group"
          >
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform pointer-events-none" />
            {loadingAction === 'accept' ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Accepting...
              </span>
            ) : (
              <>
                <span>Accept Job</span>
                <FiArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const BookingAlertModal = ({ isOpen, booking, bookings, onAccept, onReject, onMinimize, maxSearchTimeMins = 1 }) => {
  const alertsArray = bookings || (booking ? [booking] : []);

  return (
    <AnimatePresence>
      {isOpen && alertsArray.length > 0 && (
        <Motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md p-4"
        >
          {onMinimize && (
            <button
              onClick={() => { stopAlertRing(); onMinimize(); }}
              className="absolute top-4 right-4 z-50 p-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all active:scale-95 border border-white/10 shadow-lg"
              title="Minimize Alert"
            >
              <FiMinimize2 className="w-5 h-5" />
            </button>
          )}

          <div className="w-full overflow-x-auto snap-x snap-mandatory scrollbar-hide flex gap-4 px-4 sm:px-8 items-center justify-center h-full">
            <div className="flex gap-4 m-auto">
              {alertsArray.map(b => (
                <BookingAlertCard
                  key={b.id || b._id}
                  booking={b}
                  onAccept={onAccept}
                  onReject={onReject}
                  maxSearchTimeMins={maxSearchTimeMins}
                />
              ))}
            </div>
          </div>

          {alertsArray.length > 1 && (
            <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center gap-2 text-white text-xs font-semibold drop-shadow-md">
              <span className="bg-white/20 px-3 py-1 rounded-full backdrop-blur-md border border-white/10">
                Swipe to view all ({alertsArray.length}) requests →
              </span>
            </div>
          )}
        </Motion.div>
      )}
    </AnimatePresence>
  );
};

export default BookingAlertModal;
