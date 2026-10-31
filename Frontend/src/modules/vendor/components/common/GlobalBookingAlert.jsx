import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { BookingAlertModal } from '../bookings';
import { acceptBooking, rejectBooking } from '../../services/bookingService';
import { playAlertRing, stopAlertRing } from '../../../../utils/notificationSound';

export default function GlobalBookingAlert() {
  const [activeAlertBookings, setActiveAlertBookings] = useState([]);
  const ignoredBookingIds = useRef(new Set());
  const navigate = useNavigate();
  const location = useLocation();

  const [maxSearchTime, setMaxSearchTime] = useState(1);

  useEffect(() => {
    // 1. Logic to sync with localStorage and optionally Server
    const syncAlerts = async (forceServerSync = false) => {
      try {
        const now = Date.now();
        let pendingJobs = JSON.parse(localStorage.getItem('vendorPendingJobs') || '[]');

        // Every few heartbeats or if forced, sync with the server for missed sockets.
        // The server list is authoritative: it only holds requests that are still unassigned, so anything
        // it no longer returns was taken by another vendor, expired or cancelled while this device was
        // asleep (locked phone = dead socket = missed "booking taken" event).
        const token = localStorage.getItem('vendorAccessToken') || sessionStorage.getItem('vendorAccessToken');
        if (token && (forceServerSync || (Math.random() > 0.8))) {
          try {
            const { getPendingAlerts } = await import('../../services/bookingService');
            const serverJobs = (await getPendingAlerts()) || [];
            const serverIds = new Set(serverJobs.map(j => String(j.id || j._id || j.bookingId)));
            const FRESH_MS = 20000; // an alert pushed by socket may beat its server-side request row by a moment

            const kept = pendingJobs.filter(j =>
              serverIds.has(String(j.id || j._id)) ||
              (j.createdAt && now - new Date(j.createdAt).getTime() < FRESH_MS)
            );
            const keptIds = new Set(kept.map(j => String(j.id || j._id)));
            serverJobs.forEach(sj => {
              if (!keptIds.has(String(sj.id || sj._id || sj.bookingId))) kept.unshift({ ...sj, id: sj.id || sj._id || sj.bookingId });
            });

            const droppedIds = pendingJobs
              .filter(j => !kept.includes(j))
              .map(j => String(j.id || j._id));
            pendingJobs = kept;
            localStorage.setItem('vendorPendingJobs', JSON.stringify(pendingJobs));

            if (droppedIds.length > 0) {
              setActiveAlertBookings(prev => prev.filter(b => !droppedIds.includes(String(b.id || b._id))));
            }
          } catch (e) { console.error("Server sync error:", e); }
        }

        const validJobs = pendingJobs.filter(job => {
          if (!job.expiresAt) return true;
          return new Date(job.expiresAt).getTime() > now;
        });

        if (validJobs.length > 0) {
          setActiveAlertBookings(prev => {
            const currentIds = new Set(prev.map(b => String(b.id || b._id)));
            const newJobsToAdd = validJobs.filter(v => !currentIds.has(String(v.id || v._id)));
            if (newJobsToAdd.length === 0) return prev;
            return [...newJobsToAdd, ...prev];
          });
        }
      } catch (err) {
        console.error('[GlobalAlert] Sync error:', err);
      }
    };

    // 2. Foreground Sync: Sync immediately when vendor resumes app
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncAlerts(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Fetch global config for accurate timer
    const fetchConfig = async () => {
      const token = localStorage.getItem('vendorAccessToken') || sessionStorage.getItem('vendorAccessToken');
      if (!token) return;

      try {
        const { vendorDashboardService } = await import('../../services/dashboardService');
        const response = await vendorDashboardService.getDashboardStats();
        if (response.success && response.data.config) {
          setMaxSearchTime(response.data.config.maxSearchTime || 1);
        }
      } catch (error) {
        console.error('Failed to fetch config for GlobalAlert:', error);
      }
    };

    syncAlerts(true);
    fetchConfig();

    // 3. Heartbeat: Periodic sync
    const heartbeat = setInterval(() => syncAlerts(false), 5000);

    // Listen for custom dashboard events from SocketContext
    const handleShowAlert = (e) => {
      if (e.detail) {
        setActiveAlertBookings(prev => {
          const bId = String(e.detail.id || e.detail._id);
          if (prev.find(b => String(b.id || b._id) === bId)) return prev;
          return [e.detail, ...prev];
        });
      }
    };

    const handleRemoveBooking = (e) => {
      if (e.detail?.id) {
        const idToRemove = String(e.detail.id);
        ignoredBookingIds.current.add(idToRemove);
        setActiveAlertBookings(prev => prev.filter(b => String(b.id || b._id) !== idToRemove));
      }
    };

    window.addEventListener('showDashboardBookingAlert', handleShowAlert);
    window.addEventListener('removeVendorBooking', handleRemoveBooking);

    return () => {
      window.removeEventListener('showDashboardBookingAlert', handleShowAlert);
      window.removeEventListener('removeVendorBooking', handleRemoveBooking);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(heartbeat);
    };
  }, []);

  // Effect to manage sound based on pending bookings
  useEffect(() => {
    if (activeAlertBookings.length > 0) {
      playAlertRing(true); // Always loop for vendor until actioned
    } else {
      stopAlertRing();
    }
    return () => stopAlertRing();
  }, [activeAlertBookings.length]);

  if (activeAlertBookings.length === 0) return null;

  return (
    <BookingAlertModal
      isOpen={activeAlertBookings.length > 0}
      bookings={activeAlertBookings}
      maxSearchTimeMins={maxSearchTime}
      onAccept={async (id) => {
        try {
          await acceptBooking(id);

          // Remove from local storage
          const pendingJobs = JSON.parse(localStorage.getItem('vendorPendingJobs') || '[]');
          const updated = pendingJobs.filter(b => String(b.id || b._id) !== String(id));
          localStorage.setItem('vendorPendingJobs', JSON.stringify(updated));

          // Dispatch remove event
          window.dispatchEvent(new CustomEvent('removeVendorBooking', { detail: { id } }));
          setActiveAlertBookings(prev => prev.filter(b => String(b.id || b._id) !== String(id)));

          window.dispatchEvent(new Event('vendorJobsUpdated'));
          window.dispatchEvent(new Event('vendorStatsUpdated'));
          toast.success('Job accepted! You can now start your journey.');
          navigate(`/vendor/booking/${id}`);
        } catch (e) {
          const errMsg = e.response?.data?.message || 'Failed to accept job';
          toast.error(errMsg);
          // If already taken, remove it from alerts immediately
          const pendingJobs = JSON.parse(localStorage.getItem('vendorPendingJobs') || '[]');
          const updated = pendingJobs.filter(b => String(b.id || b._id) !== String(id));
          localStorage.setItem('vendorPendingJobs', JSON.stringify(updated));
          window.dispatchEvent(new CustomEvent('removeVendorBooking', { detail: { id } }));
          setActiveAlertBookings(prev => prev.filter(b => String(b.id || b._id) !== String(id)));
        }
      }}
      onReject={async (id) => {
        try {
          // Reject is often silent or via reject api
          await rejectBooking(id);
        } catch (error) {
          console.error("Failed to reject job via API, removing locally");
        } finally {
          const pendingJobs = JSON.parse(localStorage.getItem('vendorPendingJobs') || '[]');
          const updated = pendingJobs.filter(b => String(b.id || b._id) !== String(id));
          localStorage.setItem('vendorPendingJobs', JSON.stringify(updated));

          window.dispatchEvent(new CustomEvent('removeVendorBooking', { detail: { id } }));
          setActiveAlertBookings(prev => prev.filter(b => String(b.id || b._id) !== String(id)));

          toast.success('Booking application rejected');
          window.dispatchEvent(new Event('vendorJobsUpdated'));
        }
      }}
      onMinimize={() => {
        setActiveAlertBookings([]); // simply minimizes current visible ones. We can fetch them later from pending.
      }}
    />
  );
}
