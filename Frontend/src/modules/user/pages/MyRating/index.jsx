import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowLeft,
  FiStar,
  FiUser,
  FiBriefcase,
  FiLoader,
  FiCalendar,
  FiChevronRight
} from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi';
import { toast } from 'react-hot-toast';
import bookingService from '../../../../services/bookingService';
import NotificationBell from '../../components/common/NotificationBell';

const MyRating = () => {
  const navigate = useNavigate();
  const [ratings, setRatings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });

  const quickCategories = [
    { id: 'electrician', title: 'Electrician & Plumbing', image: '/cat_electrician_plumber.png' },
    { id: 'cleaning', title: 'Deep Cleaning', image: '/cat_cleaning.png' },
    { id: 'ac-repair', title: 'AC Service & Repair', image: '/ac_foam_jet_service.png' },
    { id: 'scrap', title: 'Sell Scrap & Recyclables', image: '/drill_wall_decor.png' },
  ];

  const fetchRatings = async (page = 1) => {
    try {
      setIsLoading(true);
      const response = await bookingService.getRatings({ page, limit: 10 });
      if (response.success) {
        setRatings(page === 1 ? response.data : [...ratings, ...response.data]);
        setPagination(response.pagination);
      } else {
        setRatings([]);
      }
    } catch (error) {
      console.warn('Error fetching ratings:', error);
      setRatings([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRatings();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'Recently';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
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
                  My Service Reviews
                </h1>
                <span className="text-[10px] text-slate-500 font-semibold">Technician Ratings & Feedback</span>
              </div>
            </div>
            <NotificationBell />
          </div>
        </header>

        {/* Main Content Area */}
        <main className="max-w-4xl mx-auto px-4 pt-5 space-y-6">
          {isLoading && pagination.page === 1 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <FiLoader className="w-8 h-8 text-amber-500 animate-spin mb-3" />
              <p className="text-xs font-bold text-slate-500">Loading your service reviews...</p>
            </div>
          ) : ratings.length > 0 ? (
            <div className="space-y-4">
              {ratings.map((rating, idx) => (
                <div
                  key={rating._id || idx}
                  className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs space-y-3.5 hover:border-slate-300 transition-all"
                >
                  <div className="flex justify-between items-start gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-[#0B132B] text-amber-400 flex items-center justify-center overflow-hidden shrink-0 border border-slate-800">
                        {rating.vendorId?.profilePhoto ? (
                          <img src={rating.vendorId.profilePhoto} alt={rating.vendorId.name} className="w-full h-full object-cover" />
                        ) : (
                          <FiUser className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900">
                          {rating.vendorId?.businessName || rating.vendorId?.name || 'Zippto Technician'}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <FiStar
                                key={s}
                                className={`w-3.5 h-3.5 ${s <= rating.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`}
                              />
                            ))}
                          </div>
                          <span className="text-[10px] font-bold text-slate-400">
                            • {formatDate(rating.reviewedAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[10px] font-bold uppercase shrink-0">
                      {rating.serviceName || rating.serviceId?.title || 'Service'}
                    </span>
                  </div>

                  {rating.review && (
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-xs font-medium text-slate-700 italic">
                      "{rating.review}"
                    </div>
                  )}

                  {rating.reviewImages && rating.reviewImages.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {rating.reviewImages.map((img, i) => (
                        <img key={i} src={img} className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-200" alt="Review media" />
                      ))}
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-between text-xs font-semibold">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">
                      Booking #{rating.bookingNumber || 'N/A'}
                    </span>
                    <button
                      onClick={() => navigate(`/user/booking/${rating.bookingId || rating._id}`)}
                      className="text-xs font-extrabold text-[#0B132B] hover:text-amber-600 flex items-center gap-1"
                    >
                      <span>View Booking</span>
                      <FiChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {pagination.total > ratings.length && (
                <button
                  onClick={() => fetchRatings(pagination.page + 1)}
                  className="w-full py-3.5 bg-white rounded-2xl border border-slate-200 text-slate-800 font-extrabold text-xs uppercase tracking-wider hover:bg-slate-50 transition-colors shadow-2xs"
                >
                  {isLoading ? <FiLoader className="animate-spin mx-auto" /> : 'Load More Reviews'}
                </button>
              )}
            </div>
          ) : (
            /* RICH EMPTY STATE CARD */
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-8 text-center border border-slate-200/80 shadow-2xs space-y-4 relative overflow-hidden">
                <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-[#0B132B] via-[#1C2541] to-[#0B132B] text-amber-400 flex items-center justify-center shadow-lg border border-slate-800">
                  <FiStar className="w-10 h-10 fill-amber-400 text-amber-400" />
                </div>

                <div className="max-w-sm mx-auto space-y-1.5">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    No Reviews Submitted Yet
                  </h2>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    You haven't reviewed any completed home services yet. Rate your doorstep technician after your next booking!
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => navigate('/user/my-bookings')}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[#0B132B] hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider shadow-md hover:shadow-lg active:scale-95 transition-all"
                  >
                    <HiSparkles className="w-4 h-4 text-amber-400" />
                    <span>Go to My Bookings</span>
                  </button>
                </div>
              </div>

              {/* POPULAR CATEGORY SHORTCUTS */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-900 tracking-tight px-1">
                  Book a Service to Rate
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
          )}
        </main>
      </div>
    </div>
  );
};

export default MyRating;
