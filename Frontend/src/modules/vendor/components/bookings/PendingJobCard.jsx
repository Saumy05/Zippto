import React from 'react';
import { FiClock, FiMapPin, FiBell } from 'react-icons/fi';

// Internal Timer Component for unification
const CountdownTimer = ({ durationSeconds, createdAt, expiresAt, onExpire }) => {
  const calculateTimeLeft = () => {
    try {
      if (expiresAt) {
        const end = new Date(expiresAt).getTime();
        if (!isNaN(end)) {
          const left = Math.floor((end - Date.now()) / 1000);
          return Math.max(0, left);
        }
      }
      if (!createdAt) return Number(durationSeconds) || 300;
      const start = new Date(createdAt).getTime();
      if (!isNaN(start)) {
        const elapsed = Math.floor((Date.now() - start) / 1000);
        return Math.max(0, (Number(durationSeconds) || 300) - elapsed);
      }
      return Number(durationSeconds) || 300;
    } catch (err) {
      return 0;
    }
  };

  const [timeLeft, setTimeLeft] = React.useState(calculateTimeLeft());

  React.useEffect(() => {
    // Recalculate once on mount to handle refresh correctly
    const initial = calculateTimeLeft();
    setTimeLeft(initial);
    if (initial <= 0 && onExpire) onExpire();
  }, [createdAt, expiresAt]);

  React.useEffect(() => {
    if (timeLeft <= 0) {
      if (onExpire) onExpire();
      return;
    }
    const interval = setInterval(() => {
      const current = calculateTimeLeft();
      setTimeLeft(current);
      if (current <= 0) {
        clearInterval(interval);
        if (onExpire) onExpire();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft, createdAt, expiresAt]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  return (
    <div className={`text-[10px] font-mono font-bold flex items-center gap-1 ${timeLeft < 30 ? 'text-red-600 animate-pulse' : 'text-yellow-600'}`}>
      <FiClock className="w-3 h-3" />
      <span>{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</span>
    </div>
  );
};

const PendingJobCard = ({ booking, onAccept, onReject, onClick, loadingAction, showTimer = false, maxSearchTimeMins = 5 }) => {
  const bookingId = booking.id || booking._id;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-amber-200/80 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden"
    >
      {/* Urgency header */}
      {showTimer && (
        <div className="px-4 py-2 bg-amber-50/70 border-b border-amber-100 flex justify-between items-center">
          <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 ${booking.bookingType === 'instant' ? 'text-red-600 animate-pulse' : 'text-amber-700'}`}>
            {booking.bookingType === 'instant' && <span className="text-sm">⚡</span>}
            {booking.bookingType === 'instant' ? 'INSTANT BOOKING' : 'NEW BOOKING REQUEST'}
          </span>
          <CountdownTimer
            durationSeconds={maxSearchTimeMins * 60}
            createdAt={booking.createdAt}
            expiresAt={booking.expiresAt}
            onExpire={() => {
              window.dispatchEvent(new CustomEvent('removeVendorBooking', { detail: { id: bookingId } }));
            }}
          />
        </div>
      )}

      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between mb-3 gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-0.5">
              {booking.serviceCategory || (booking.serviceId?.category?.title) || (booking.categoryName) || 'General Service'}
            </p>
            <div className="flex items-center gap-2 mb-1">
              <p className="font-bold text-slate-900 text-base leading-snug truncate">
                {booking.serviceName || booking.serviceType || booking.serviceId?.title || 'New Booking Request'}
              </p>
            </div>
            {booking.brandName && (
              <div className="flex items-center gap-1.5 mb-1.5 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md w-fit">
                {booking.brandIcon && (
                  <img src={booking.brandIcon} alt={booking.brandName} className="w-3.5 h-3.5 object-contain" />
                )}
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">{booking.brandName}</span>
              </div>
            )}
            <p className="text-xs text-slate-500 font-medium line-clamp-1">
              {booking.customerName || booking.userId?.name || 'Customer'} • {booking.location?.address || booking.address?.addressLine1 || 'Location'}
            </p>
          </div>
          <div className="flex flex-col items-center shrink-0">
            {booking.categoryIcon || booking.serviceId?.category?.icon ? (
              <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden shadow-xs flex items-center justify-center p-1">
                <img src={booking.categoryIcon || booking.serviceId?.category?.icon} className="max-w-full max-h-full object-contain" alt="Category" />
              </div>
            ) : (
              <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                <FiBell className="w-5 h-5 text-amber-500 animate-pulse" />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-600">
          <div className="flex items-center gap-1.5 font-medium">
            <FiClock className="w-4 h-4 text-slate-400" />
            <span>
              {booking.timeSlot?.date || (booking.scheduledDate ? new Date(booking.scheduledDate).toLocaleDateString() : '')}
              {(booking.timeSlot?.date || booking.scheduledDate) ? ' • ' : ''}
              {booking.timeSlot?.time || booking.scheduledTime || 'N/A'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <FiMapPin className="w-4 h-4 text-slate-400" />
            <span>
              {(() => {
                const dist = booking.location?.distance || booking.distance;
                if (!dist || dist === 'N/A') return 'N/A';
                return String(dist).includes('km') ? dist : `${dist} km`;
              })()}
            </span>
          </div>
          <div className="text-base font-extrabold text-slate-900">
            ₹{booking.price || booking.vendorEarnings || booking.finalAmount || 0}
          </div>
        </div>

        <div className="flex gap-2.5 mt-4">
          <button
            disabled={!!loadingAction}
            onClick={(e) => onAccept(e, booking)}
            className="flex-1 bg-emerald-600 text-white py-2.5 px-4 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-xs disabled:opacity-50"
          >
            {loadingAction === 'accept' ? 'Accepting...' : 'Accept Job'}
          </button>
          <button
            disabled={!!loadingAction}
            onClick={(e) => onReject(e, booking)}
            className="flex-1 bg-slate-100 text-slate-700 py-2.5 px-4 rounded-xl text-xs font-semibold hover:bg-slate-200 transition-colors border border-slate-200 disabled:opacity-50"
          >
            {loadingAction === 'reject' ? 'Rejecting...' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PendingJobCard;
