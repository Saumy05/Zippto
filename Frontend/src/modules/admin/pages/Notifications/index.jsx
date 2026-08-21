import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiBell, FiRefreshCw, FiCheck, FiCheckCircle, FiTrash2,
  FiUser, FiDollarSign, FiUserCheck, FiSend, FiUsers,
  FiBriefcase, FiTool, FiSettings, FiAlertCircle
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import api from '../../../../services/api';

const TABS = [
  { key: 'push',     label: 'Push Notifications',   path: '/admin/notifications/push',     Icon: FiBell     },
  { key: 'messages', label: 'Custom Broadcasts',    path: '/admin/notifications/messages', Icon: FiSend     },
  { key: 'settings', label: 'Notification Settings',path: '/admin/notifications/settings', Icon: FiSettings },
];

const segToView = { '': 'push', 'push': 'push', 'messages': 'messages', 'settings': 'settings' };

/* ── Push Notifications inbox ── */
const PushNotificationsView = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [filter, setFilter]               = useState('all');

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications/admin', { params: { limit: 50 } });
      if (res.data.success) setNotifications(res.data.data || []);
    } catch { toast.error('Failed to load notifications'); }
    finally   { setLoading(false); }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const handleRefresh = async () => { setRefreshing(true); await fetchNotifications(); setRefreshing(false); toast.success('Refreshed'); };
  const markAsRead    = async (id) => { try { await api.put(`/notifications/${id}/read`); setNotifications(p => p.map(n => n._id === id ? { ...n, isRead: true } : n)); } catch {} };
  const markAllAsRead = async ()   => { try { await api.put('/notifications/read-all');   setNotifications(p => p.map(n => ({ ...n, isRead: true }))); toast.success('All marked'); } catch {} };
  const deleteOne     = async (id) => { try { await api.delete(`/notifications/${id}`);  setNotifications(p => p.filter(n => n._id !== id)); toast.success('Deleted'); } catch {} };
  const clearAll      = async ()   => { if (!window.confirm('Delete all?')) return; try { await api.delete('/notifications/delete-all'); setNotifications([]); toast.success('Cleared'); } catch {} };

  const getIcon = (type) => {
    if (type === 'vendor_withdrawal_request')  return <FiDollarSign className="text-green-500" />;
    if (type === 'vendor_approval_request')    return <FiUserCheck  className="text-blue-500"  />;
    if (type === 'vendor_cash_limit_exceeded') return <FiDollarSign className="text-red-500"   />;
    return <FiBell className="text-gray-500" />;
  };

  const filtered    = notifications.filter(n => filter === 'all' ? true : filter === 'unread' ? !n.isRead : n.isRead);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center"><FiBell className="text-blue-600 text-lg" /></div>
            <div><h2 className="text-lg font-bold text-gray-900">Push Notifications</h2><p className="text-xs text-gray-500">{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}</p></div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleRefresh} className="p-2 hover:bg-gray-100 rounded-lg" disabled={refreshing}><FiRefreshCw className={`text-gray-500 ${refreshing ? 'animate-spin' : ''}`} /></button>
            {unreadCount > 0 && <button onClick={markAllAsRead} className="px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-1"><FiCheckCircle className="text-sm" /> Mark All Read</button>}
            {notifications.length > 0 && <button onClick={clearAll} className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-1"><FiTrash2 className="text-sm" /> Clear All</button>}
          </div>
        </div>
        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
          {['all','unread','read'].map(f => <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${filter===f?'bg-blue-600 text-white':'text-gray-500 hover:bg-gray-100'}`}>{f}</button>)}
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"/><p className="text-xs text-gray-500 mt-2">Loading...</p></div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center"><FiBell className="text-4xl text-gray-300 mx-auto mb-2"/><p className="text-sm text-gray-500">No notifications found</p></div>
        ) : (
          <div className="divide-y divide-gray-50">
            <AnimatePresence>
              {filtered.map(n => (
                <motion.div key={n._id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                  className={`p-4 hover:bg-gray-50 flex items-start gap-3 ${!n.isRead ? 'bg-blue-50/30' : ''}`}>
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">{getIcon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div><p className={`text-sm ${!n.isRead?'font-semibold text-gray-900':'text-gray-700'}`}>{n.title}</p><p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p></div>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      {!n.isRead && <button onClick={() => markAsRead(n._id)} className="text-[10px] font-semibold text-blue-600 hover:underline flex items-center gap-1"><FiCheck className="text-xs"/> Mark as read</button>}
                      <button onClick={() => deleteOne(n._id)} className="text-[10px] font-semibold text-red-500 hover:underline flex items-center gap-1"><FiTrash2 className="text-xs"/> Delete</button>
                    </div>
                  </div>
                  {!n.isRead && <div className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0 mt-2"/>}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Custom Broadcasts ── */
const AUDIENCE_OPTIONS = [
  { value: 'all',     label: 'Everyone',           Icon: FiUsers,     color: 'blue'   },
  { value: 'users',   label: 'Users / Customers',  Icon: FiUser,      color: 'green'  },
  { value: 'vendors', label: 'Vendors',            Icon: FiBriefcase, color: 'amber'  },
  { value: 'workers', label: 'Workers',            Icon: FiTool,      color: 'purple' },
];

const CustomBroadcastsView = () => {
  const [form, setForm]       = useState({ title: '', message: '', audience: 'all' });
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState([]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) { toast.error('Title and message are required'); return; }
    setSending(true);
    try {
      const res = await api.post('/notifications/broadcast', form);
      if (res.data.success) {
        toast.success(`Broadcast sent to ${res.data.sentCount} recipients!`);
        setHistory(prev => [{ ...form, sentAt: new Date(), sentCount: res.data.sentCount }, ...prev.slice(0, 9)]);
        setForm(f => ({ ...f, title: '', message: '' }));
      }
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to send broadcast'); }
    finally { setSending(false); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center"><FiSend className="text-indigo-600"/></div>
          <div><h2 className="text-lg font-bold text-gray-900">Send Broadcast</h2><p className="text-xs text-gray-500">Push a message to your audience via FCM</p></div>
        </div>
        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Audience</label>
            <div className="grid grid-cols-2 gap-2">
              {AUDIENCE_OPTIONS.map(opt => (
                <button key={opt.value} type="button" onClick={() => setForm(f => ({ ...f, audience: opt.value }))}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${form.audience===opt.value?'border-blue-500 bg-blue-50 text-blue-700':'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  <opt.Icon className="w-4 h-4 flex-shrink-0"/><span className="truncate">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Notification Title</label>
            <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. New Feature Launched 🚀" maxLength={100}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-medium"/>
            <p className="text-[10px] text-gray-400 mt-1">{form.title.length}/100</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Message Body</label>
            <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              placeholder="Write your notification message here..." maxLength={500} rows={4}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm resize-none"/>
            <p className="text-[10px] text-gray-400 mt-1">{form.message.length}/500</p>
          </div>
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3">
            <FiAlertCircle className="text-amber-500 mt-0.5 flex-shrink-0"/>
            <p className="text-xs text-amber-700">This will send to <strong>all active {form.audience==='all'?'users, vendors, and workers':form.audience}</strong> immediately.</p>
          </div>
          <button type="submit" disabled={sending}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 flex items-center justify-center gap-2 disabled:opacity-60 transition-all shadow-md shadow-indigo-200">
            {sending ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Sending...</> : <><FiSend className="w-4 h-4"/>Send Broadcast</>}
          </button>
        </form>
      </div>
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Recent Broadcasts (this session)</h3>
        {history.length === 0 ? (
          <div className="text-center py-12"><FiSend className="text-3xl text-gray-200 mx-auto mb-2"/><p className="text-xs text-gray-400">No broadcasts sent yet</p></div>
        ) : (
          <div className="space-y-3">
            {history.map((h, i) => (
              <div key={i} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900">{h.title}</p>
                  <span className="text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full flex-shrink-0">{h.sentCount} sent</span>
                </div>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{h.message}</p>
                <p className="text-[10px] text-gray-400 mt-2">→ {h.audience} · {formatDistanceToNow(h.sentAt, { addSuffix: true })}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Notification Settings ── */
const NotificationSettingsView = () => {
  const [settings, setSettings] = useState({ isPushNotificationEnabled: true, isChatEnabled: true, isReferralEnabled: true });
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    api.get('/admin/settings').then(res => {
      if (res.data.success && res.data.settings) {
        const s = res.data.settings;
        setSettings({ isPushNotificationEnabled: s.isPushNotificationEnabled !== false, isChatEnabled: s.isChatEnabled !== false, isReferralEnabled: s.isReferralEnabled !== false });
      }
    }).catch(() => {});
  }, []);

  const toggle = (key) => setSettings(prev => ({ ...prev, [key]: !prev[key] }));

  const save = async () => {
    setLoading(true);
    try {
      await api.put('/admin/settings', settings);
      toast.success('Settings saved');
      window.dispatchEvent(new Event('platformSettingsUpdated'));
    } catch {
      toast.error('Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const items = [
    { key: 'isPushNotificationEnabled', label: 'Push Notifications',    desc: 'Enable FCM push notifications platform-wide',        Icon: FiBell,    color: 'blue'   },
    { key: 'isChatEnabled',             label: 'In-App Chat',           desc: 'Enable chat between users and vendors',               Icon: FiUsers,   color: 'green'  },
    { key: 'isReferralEnabled',         label: 'Referral Notifications', desc: 'Send notifications for referral rewards and events', Icon: FiUser,    color: 'purple' },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center"><FiSettings className="text-slate-600"/></div>
          <div><h2 className="text-lg font-bold text-gray-900">Notification Settings</h2><p className="text-xs text-gray-500">Control which notification channels are active platform-wide</p></div>
        </div>
        <div className="space-y-4">
          {items.map(item => (
            <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center"><item.Icon className="text-blue-600 w-4 h-4"/></div>
                <div><p className="text-sm font-semibold text-gray-900">{item.label}</p><p className="text-xs text-gray-500">{item.desc}</p></div>
              </div>
              <button onClick={() => toggle(item.key)}
                className={`relative w-12 h-6 rounded-full transition-all duration-200 flex-shrink-0 ${settings[item.key] ? 'bg-blue-600' : 'bg-gray-300'}`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${settings[item.key] ? 'translate-x-6' : 'translate-x-0.5'}`}/>
              </button>
            </div>
          ))}
        </div>
        <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
          <button onClick={save} disabled={loading}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 flex items-center gap-2 disabled:opacity-60 shadow-sm">
            {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>}
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Shell ── */
const Notifications = () => {
  const location = useLocation();
  const navigate  = useNavigate();

  const activeView = useMemo(() => {
    const seg = location.pathname.replace('/admin/notifications', '').replace(/^\//, '');
    return segToView[seg] || 'push';
  }, [location.pathname]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => navigate(tab.path)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeView===tab.key?'bg-white text-blue-700 shadow-sm':'text-gray-500 hover:text-gray-800'}`}>
            <tab.Icon className="w-4 h-4"/>{tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeView === 'push' && (
          <motion.div key="push" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }}>
            <PushNotificationsView/>
          </motion.div>
        )}
        {activeView === 'messages' && (
          <motion.div key="messages" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }}>
            <CustomBroadcastsView/>
          </motion.div>
        )}
        {activeView === 'settings' && (
          <motion.div key="settings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }}>
            <NotificationSettingsView/>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Notifications;
