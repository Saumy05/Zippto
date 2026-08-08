import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiPlus,
  FiMapPin,
  FiClock,
  FiCheckCircle,
  FiArrowLeft,
  FiTrash2,
  FiX,
  FiTrendingUp,
  FiTruck,
  FiDollarSign,
  FiRepeat,
  FiCheck,
  FiZap
} from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi';
import { toast } from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import api from '../../../../services/api';
import NotificationBell from '../../components/common/NotificationBell';

const UserScrapPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'history'
  const [scraps, setScraps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedScrap, setSelectedScrap] = useState(null);

  // Estimated Scrap Market Rates Ticker Data
  const marketRates = [
    { title: 'Iron & Steel', rate: '₹32 - ₹36 / kg', icon: '⚙️' },
    { title: 'Copper & Wires', rate: '₹580 - ₹620 / kg', icon: '🔌' },
    { title: 'Cardboard & Paper', rate: '₹14 - ₹18 / kg', icon: '📦' },
    { title: 'Appliances & E-Waste', rate: 'Up to ₹2,500 / unit', icon: '📺' },
  ];

  useEffect(() => {
    fetchMyScrap();
  }, []);

  const fetchMyScrap = async () => {
    try {
      setLoading(true);
      const res = await api.get('/scrap/my');
      if (res.data.success) {
        setScraps(res.data.data);
      }
    } catch (err) {
      console.warn('Scrap list fetch issue:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to cancel and delete this scrap request?')) return;

    try {
      toast.loading('Deleting scrap request...', { id: 'delete-scrap' });
      const res = await api.delete(`/scrap/${id}`);
      if (res.data.success) {
        toast.success('Scrap request deleted successfully', { id: 'delete-scrap' });
        setSelectedScrap(null);
        fetchMyScrap();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete scrap request', { id: 'delete-scrap' });
    }
  };

  const activeScraps = scraps.filter(s => s.status === 'pending' || s.status === 'accepted');
  const historyScraps = scraps.filter(s => s.status === 'completed' || s.status === 'cancelled');

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
                <h1 className="text-base font-extrabold text-slate-900 tracking-tight leading-none flex items-center gap-1.5">
                  Sell Scrap & Recyclables
                </h1>
                <span className="text-[10px] text-slate-500 font-semibold">Instant Doorstep Weighing & Cash</span>
              </div>
            </div>
            <NotificationBell />
          </div>
        </header>

        {/* Main Content Area */}
        <main className="max-w-4xl mx-auto px-4 pt-5 space-y-5">
          
          {/* HERO BANNER CARD */}
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0B132B] via-[#1C2541] to-[#0B132B] p-5 sm:p-6 text-white shadow-lg border border-slate-800 space-y-4">
            {/* Ambient Lighting */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
              <div className="space-y-1.5 max-w-lg">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-400 border border-amber-400/30 text-[10px] font-black uppercase tracking-wider">
                  <HiSparkles className="w-3 h-3" /> Best Market Scrap Rates
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
                  Turn Your Household Scrap into Instant Cash!
                </h2>
                <p className="text-xs text-slate-300 font-medium">
                  Free doorstep pickup, digital scale accuracy, and immediate payment.
                </p>

                {/* Bullet Value Props */}
                <div className="flex flex-wrap gap-2 pt-1 text-[11px] font-bold text-slate-200">
                  <span className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-md backdrop-blur-xs">
                    <FiCheck className="text-amber-400" /> Free Pickup
                  </span>
                  <span className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-md backdrop-blur-xs">
                    <FiCheck className="text-amber-400" /> Digital Weighing
                  </span>
                  <span className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-md backdrop-blur-xs">
                    <FiCheck className="text-amber-400" /> Instant Cash
                  </span>
                </div>
              </div>

              {/* Main Action CTA */}
              <button
                onClick={() => navigate('/user/scrap/add')}
                className="w-full sm:w-auto shrink-0 px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-[#0B132B] font-extrabold text-xs tracking-wider uppercase shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <FiPlus className="w-4 h-4 stroke-[3]" />
                <span>Sell Scrap Now</span>
              </button>
            </div>
          </section>

          {/* SCRAP MARKET RATES TICKER GRID */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
                <FiTrendingUp className="w-4 h-4 text-emerald-600" /> Today's Scrap Market Rates
              </h3>
              <span className="text-[10px] font-bold text-slate-500">Updated Daily</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {marketRates.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-2xs space-y-1 flex flex-col justify-between"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <span>{item.icon}</span>
                    <span className="truncate">{item.title}</span>
                  </div>
                  <p className="text-xs font-black text-emerald-600">{item.rate}</p>
                </div>
              ))}
            </div>
          </section>

          {/* FILTER TAB PILLS */}
          <section className="flex items-center gap-2 pt-1 border-b border-slate-200/80 pb-3">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                activeTab === 'active'
                  ? 'bg-[#0B132B] text-amber-400 shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              <span>Active Listings</span>
              {activeScraps.length > 0 && (
                <span className="px-1.5 py-0.2 text-[9px] font-black rounded-full bg-amber-400 text-[#0B132B]">
                  {activeScraps.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-[#0B132B] text-amber-400 shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              <span>History</span>
              {historyScraps.length > 0 && (
                <span className="px-1.5 py-0.2 text-[9px] font-black rounded-full bg-slate-200 text-slate-800">
                  {historyScraps.length}
                </span>
              )}
            </button>
          </section>

          {/* SCRAP LISTINGS / EMPTY STATE */}
          <section className="space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs animate-pulse space-y-3">
                    <div className="h-4 w-40 bg-slate-200 rounded"></div>
                    <div className="h-3 w-full bg-slate-100 rounded"></div>
                  </div>
                ))}
              </div>
            ) : (activeTab === 'active' ? activeScraps : historyScraps).length === 0 ? (
              /* RICH EMPTY STATE CARD */
              <div className="bg-white rounded-3xl p-8 text-center border border-slate-200/80 shadow-2xs space-y-4 relative overflow-hidden">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center">
                  <FiRepeat className="w-8 h-8" />
                </div>

                <div className="max-w-sm mx-auto space-y-1">
                  <h3 className="text-base font-black text-slate-900">
                    No {activeTab === 'active' ? 'Active' : 'Past'} Scrap Listings
                  </h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    Have unused metal, old newspapers, broken appliances, or plastic scrap lying around? List them for instant pickup!
                  </p>
                </div>

                <button
                  onClick={() => navigate('/user/scrap/add')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0B132B] hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all"
                >
                  <FiPlus className="w-4 h-4 text-amber-400" />
                  <span>Create Scrap Pickup Request</span>
                </button>
              </div>
            ) : (
              (activeTab === 'active' ? activeScraps : historyScraps).map((item) => (
                <div
                  key={item._id}
                  onClick={() => setSelectedScrap(item)}
                  className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all cursor-pointer space-y-3 group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {item.images && item.images.length > 0 ? (
                        <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-slate-50">
                          <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-slate-100 text-slate-700 font-black text-xl flex items-center justify-center shrink-0">
                          <FiRepeat className="w-6 h-6 text-slate-500" />
                        </div>
                      )}

                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900 leading-snug">
                          {item.title}
                        </h4>
                        <p className="text-xs text-slate-500 font-medium line-clamp-1 mt-0.5">
                          {item.description || 'Scrap items ready for doorstep pickup'}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider border shrink-0 ${
                        item.status === 'pending'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : item.status === 'accepted'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : item.status === 'completed'
                          ? 'bg-slate-100 text-slate-700 border-slate-200'
                          : 'bg-red-50 text-red-600 border-red-200'
                      }`}>
                        {item.status}
                      </span>

                      {(item.status === 'pending' || item.status === 'cancelled') && (
                        <button
                          onClick={(e) => handleDelete(e, item._id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Request"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <FiClock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Listed on {new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                    {item.status === 'accepted' && (
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        <FiCheckCircle className="w-3.5 h-3.5" /> Pickup Scheduled
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </section>

        </main>

        {/* FLOATING ACTION BUTTON (FAB) */}
        <button
          onClick={() => navigate('/user/scrap/add')}
          className="fixed bottom-20 right-4 z-40 bg-[#0B132B] hover:bg-slate-800 text-amber-400 border border-amber-400/40 font-extrabold text-xs px-4 py-3 rounded-full shadow-xl flex items-center gap-2 active:scale-95 transition-all"
        >
          <FiPlus className="w-4 h-4 stroke-[3]" />
          <span className="uppercase tracking-wider">Sell Scrap</span>
        </button>

        {/* SCRAP DETAILS MODAL */}
        <AnimatePresence>
          {selectedScrap && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedScrap(null)}
                className="fixed inset-0 bg-slate-900/60 z-[60] backdrop-blur-xs"
              />
              <motion.div
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 30, stiffness: 350 }}
                className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-[70] max-h-[85vh] overflow-y-auto shadow-2xl border-t border-slate-200 flex flex-col"
                onClick={e => e.stopPropagation()}
              >
                <div className="p-4 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white/90 backdrop-blur-md z-10">
                  <h2 className="text-base font-extrabold text-slate-900">{selectedScrap.title}</h2>
                  <button
                    onClick={() => setSelectedScrap(null)}
                    className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-5 space-y-4">
                  {selectedScrap.images && selectedScrap.images.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {selectedScrap.images.map((img, i) => (
                        <div key={i} className="rounded-2xl overflow-hidden border border-slate-200 aspect-square">
                          <img src={img} alt="Scrap" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-800 flex justify-between items-center">
                    <span>Status</span>
                    <span className="uppercase font-black text-amber-600">{selectedScrap.status}</span>
                  </div>

                  {selectedScrap.description && (
                    <p className="text-xs text-slate-600 font-medium bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      "{selectedScrap.description}"
                    </p>
                  )}

                  {selectedScrap.address && (
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <FiMapPin className="text-rose-500" /> Pickup Address
                      </h4>
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs font-medium text-slate-700">
                        <p>{selectedScrap.address?.addressLine1}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-bold mt-0.5">{selectedScrap.address?.city}, {selectedScrap.address?.state}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
                  <button
                    onClick={() => setSelectedScrap(null)}
                    className="flex-1 py-3 bg-[#0B132B] text-white rounded-xl font-bold text-xs uppercase tracking-wider"
                  >
                    Close
                  </button>
                  {(selectedScrap.status === 'pending' || selectedScrap.status === 'cancelled') && (
                    <button
                      onClick={(e) => handleDelete(e, selectedScrap._id)}
                      className="px-4 py-3 bg-red-50 text-red-600 border border-red-200 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-1.5"
                    >
                      <FiTrash2 className="w-4 h-4" /> Delete
                    </button>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

export default UserScrapPage;
