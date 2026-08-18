import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiBell,
  FiCheck,
  FiArrowLeft,
  FiTrash2,
  FiX,
  FiCalendar,
  FiDollarSign,
  FiChevronRight
} from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi';
import { toast } from 'react-hot-toast';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications
} from '../../services/notificationService';

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [filter, setFilter] = useState('all'); // all, jobs, payments

  const quickCategories = [
    { id: 'electrician', title: 'Electrician & Plumbing', image: '/cat_electrician_plumber.png' },
    { id: 'cleaning', title: 'Deep Cleaning', image: '/cat_cleaning.png' },
    { id: 'ac-repair', title: 'AC Service & Repair', image: '/ac_foam_jet_service.png' },
    { id: 'appliance', title: 'Appliance Repair', image: '/drill_wall_decor.png' },
  ];

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await getNotifications();
      setNotifications(data || []);
    } catch (error) {
      console.warn('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const handleUpdate = () => fetchNotifications();
    window.addEventListener('userNotificationsUpdated', handleUpdate);

    return () => {
      window.removeEventListener('userNotificationsUpdated', handleUpdate);
    };
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await markAsRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.warn('Failed to mark as read', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast.success('All marked as read');
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      await deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success('Notification removed');
    } catch (error) {
      toast.error('Failed to delete notification');
    }
  };

  const confirmClearAll = async () => {
    try {
      await deleteAllNotifications();
      setNotifications([]);
      toast.success('All notifications cleared');
      setShowClearConfirm(false);
    } catch (error) {
      toast.error('Failed to clear notifications');
      setShowClearConfirm(false);
    }
  };

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'all') return true;

    const type = (notif.type || '').toLowerCase();

    if (filter === 'payments') {
      return ['payment_', 'refund_', 'wallet_'].some(prefix => type.includes(prefix));
    }

    if (filter === 'jobs') {
      return ['booking_', 'job_', 'worker_', 'visit_', 'work_', 'journey_', 'vendor_'].some(prefix => type.includes(prefix));
    }

    return true;
  });

  const getNotificationIcon = (originalType) => {
    const type = (originalType || '').toLowerCase();

    if (['payment', 'refund', 'wallet'].some(t => type.includes(t))) return <FiDollarSign className="w-5 h-5 text-emerald-600" />;
    if (['booking', 'job', 'work', 'visit', 'journey', 'vendor'].some(t => type.includes(t))) return <FiCalendar className="w-5 h-5 text-blue-600" />;
    return <FiBell className="w-5 h-5 text-amber-500" />;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827] font-sans antialiased pb-28">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -ml-20" />
      </div>

      <div className="relative z-10">
        {/* Sticky Top Header */}
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
                  Notifications
                </h1>
                <span className="text-[10px] text-slate-500 font-semibold">Service Alerts & Updates</span>
              </div>
            </div>

            {notifications.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleMarkAllRead}
                  className="text-[11px] font-bold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Mark All Read
                </button>
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                  title="Clear All"
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Filter Pills Bar */}
        <section className="bg-white/80 backdrop-blur-xs border-b border-slate-200/80 sticky top-[57px] z-30 shadow-2xs">
          <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {[
              { id: 'all', label: 'All Alerts' },
              { id: 'jobs', label: 'Bookings' },
              { id: 'payments', label: 'Payments' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`px-4 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all active:scale-95 ${
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

        {/* Main Content Container */}
        <main className="max-w-4xl mx-auto px-4 pt-5 space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs animate-pulse space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-slate-200"></div>
                    <div className="space-y-1.5 flex-1">
                      <div className="h-4 w-40 bg-slate-200 rounded"></div>
                      <div className="h-3 w-full bg-slate-100 rounded"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            /* RICH EMPTY STATE CARD */
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-8 text-center border border-slate-200/80 shadow-2xs space-y-4 relative overflow-hidden">
                <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-[#0B132B] via-[#1C2541] to-[#0B132B] text-amber-400 flex items-center justify-center shadow-lg border border-slate-800">
                  <FiBell className="w-10 h-10" />
                </div>

                <div className="max-w-sm mx-auto space-y-1.5">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    You're All Caught Up!
                  </h2>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    You don't have any unread notifications or service updates right now. Check back when you book your next service.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => navigate('/user')}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[#0B132B] hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider shadow-md hover:shadow-lg active:scale-95 transition-all"
                  >
                    <HiSparkles className="w-4 h-4 text-amber-400" />
                    <span>Explore Home Services</span>
                  </button>
                </div>
              </div>

              {/* POPULAR CATEGORY SHORTCUTS */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-900 tracking-tight px-1">
                  Book a Service to Get Alerts
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
            /* NOTIFICATIONS LIST */
            <div className="space-y-3">
              {filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all relative group flex items-start gap-3.5 ${
                    !notif.read ? 'border-l-4 border-l-[#0B132B]' : ''
                  }`}
                >
                  <div className="w-11 h-11 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-200/80">
                    {getNotificationIcon(notif.type)}
                  </div>

                  <div className="flex-1 min-w-0 pr-6 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className={`text-sm text-slate-900 leading-snug ${!notif.read ? 'font-black' : 'font-extrabold'}`}>
                        {notif.title}
                      </h4>
                    </div>

                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                      {notif.message}
                    </p>

                    <div className="flex items-center justify-between pt-1 text-[11px] font-bold text-slate-400">
                      <span>{notif.time || 'Recently'}</span>

                      {notif.action && (
                        <button
                          onClick={() => {
                            if (notif.action === 'view_booking') {
                              navigate(`/user/booking/${notif.bookingId}`);
                            } else if (notif.action === 'view_wallet') {
                              navigate('/user/wallet');
                            }
                          }}
                          className="text-xs font-extrabold text-[#0B132B] hover:text-amber-600 flex items-center gap-0.5"
                        >
                          <span>Details</span>
                          <FiChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="absolute top-4 right-4 flex items-center gap-1">
                    {!notif.read && (
                      <button
                        onClick={() => handleMarkAsRead(notif.id)}
                        className="p-1 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                        title="Mark as read"
                      >
                        <FiCheck className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDelete(e, notif.id)}
                      className="p-1 rounded-lg bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete notification"
                    >
                      <FiX className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* CLEAR ALL CONFIRMATION MODAL */}
        {showClearConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 border border-rose-100">
                  <FiTrash2 className="w-7 h-7" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900">Clear All Notifications?</h3>
                <p className="text-xs text-slate-500 font-medium">This will permanently delete all your activity alerts.</p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="py-3 rounded-xl font-bold text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmClearAll}
                  className="py-3 rounded-xl font-bold text-xs text-white bg-rose-600 hover:bg-rose-700 shadow-md active:scale-95 transition-all uppercase tracking-wider"
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
