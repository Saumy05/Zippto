import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowLeft,
  FiCheck,
  FiStar,
  FiZap,
  FiGift,
  FiArrowRight,
  FiShield
} from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi';
import { getPlans } from '../../services/planService';
import { userAuthService } from '../../../../services/authService';
import NotificationBell from '../../components/common/NotificationBell';

const MyPlan = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [plansRes, userRes] = await Promise.all([
        getPlans(),
        userAuthService.getProfile()
      ]);

      if (plansRes.success) setPlans(plansRes.data);
      if (userRes.success) setUser(userRes.user);

    } catch (error) {
      console.warn('Subscription fetch issue:', error);
    } finally {
      setLoading(false);
    }
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
                  Subscription Plans
                </h1>
                <span className="text-[10px] text-slate-500 font-semibold">Zippto Plus Protection</span>
              </div>
            </div>
            <NotificationBell />
          </div>
        </header>

        {/* Main Content Area */}
        <main className="max-w-4xl mx-auto px-4 pt-5 space-y-6">
          
          {/* HERO BANNER - Elegant Dark Navy */}
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0B132B] via-[#1C2541] to-[#0B132B] p-5 sm:p-6 text-white shadow-md border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-black uppercase tracking-wider">
              <HiSparkles className="w-4 h-4" />
              <span>Zippto Plus Membership</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
              Elevate Your Home Care with Zippto Plus
            </h2>

            <p className="text-xs text-slate-300 font-medium leading-relaxed max-w-xl">
              Enjoy up to 20% discount on every home booking, zero doorstep inspection fees, free service vouchers, and priority technician dispatch.
            </p>

            <div className="flex flex-wrap gap-2 pt-1 text-[11px] font-bold text-slate-200">
              <span className="bg-white/10 px-2.5 py-0.5 rounded-full border border-white/15">
                ✓ Up to 20% Off Services
              </span>
              <span className="bg-white/10 px-2.5 py-0.5 rounded-full border border-white/15">
                ✓ Free Doorstep Inspection
              </span>
              <span className="bg-white/10 px-2.5 py-0.5 rounded-full border border-white/15">
                ✓ Priority Dispatch
              </span>
            </div>
          </section>

          {/* UNIFIED ELEGANT CARDS GRID */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs animate-pulse space-y-4">
                  <div className="h-6 w-32 bg-slate-200 rounded"></div>
                  <div className="h-8 w-24 bg-slate-200 rounded"></div>
                  <div className="h-12 bg-slate-100 rounded-2xl"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plans.map((plan) => {
                const currentPlan = user?.plans;
                const isCurrent = currentPlan?.isActive && currentPlan?.name === plan.name;
                const isPopular = plan.name.toLowerCase().includes('gold') || plan.name.toLowerCase().includes('diamond');

                const userPlanPrice = currentPlan?.price || 0;
                const isUpgrade = currentPlan?.isActive && plan.price > userPlanPrice;
                const isDowngradeOrSame = currentPlan?.isActive && plan.price <= userPlanPrice && !isCurrent;
                const isDisabled = isCurrent || isDowngradeOrSame;

                let buttonText = `Select ${plan.name}`;
                if (isCurrent) buttonText = 'Active Membership';
                else if (isUpgrade) buttonText = 'Upgrade Plan';

                return (
                  <div
                    key={plan._id}
                    onClick={() => navigate(`/user/my-plan/${plan._id}`)}
                    className={`relative cursor-pointer rounded-3xl p-6 transition-all flex flex-col justify-between overflow-hidden bg-white border ${
                      isPopular
                        ? 'border-amber-400 shadow-md ring-1 ring-amber-400/20'
                        : 'border-slate-200/90 shadow-2xs hover:border-slate-300'
                    }`}
                  >
                    {/* Header Tag for Most Popular */}
                    {isPopular && (
                      <div className="absolute top-0 right-0 bg-amber-400 text-[#0B132B] font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-bl-xl shadow-xs">
                        Most Popular
                      </div>
                    )}

                    <div className="space-y-4">
                      {/* Name & Active Badge */}
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h3 className="text-xl font-black text-slate-900 tracking-tight">{plan.name}</h3>
                          {plan.tagline && (
                            <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[9.5px] font-bold text-slate-600 bg-slate-100 border border-slate-200">
                              {plan.tagline}
                            </span>
                          )}
                        </div>

                        {isCurrent && (
                          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                        )}
                      </div>

                      {/* Pricing */}
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-slate-900">₹{plan.price}</span>
                        <span className="text-xs font-semibold text-slate-400">/ {plan.duration || '1'} Month</span>
                      </div>

                      {/* Benefits & Included Vouchers */}
                      <div className="space-y-2 pt-1 text-xs font-semibold text-slate-700 border-t border-slate-100">
                        {(plan.freeCategories || []).map((cat, idx) => (
                          <div key={`cat-${idx}`} className="flex items-center gap-2">
                            <FiZap className="w-4 h-4 text-amber-500 shrink-0 fill-amber-500" />
                            <span className="font-bold text-slate-800">Free {cat.title || cat.name} Included</span>
                          </div>
                        ))}

                        {((() => {
                          const groups = new Map();
                          (plan.freeServices || []).forEach(svc => {
                            const cid = String(svc.categoryId?._id || svc.categoryId || 'unknown');
                            const tkey = (svc.title || '').trim().toLowerCase();
                            const key = `${cid}_${tkey}`;
                            if (!groups.has(key)) groups.set(key, svc);
                          });
                          
                          return Array.from(groups.values()).map((svc, idx) => (
                            <div key={`svc-${idx}`} className="flex items-center gap-2">
                              <FiZap className="w-4 h-4 text-amber-500 shrink-0 fill-amber-500" />
                              <span className="font-bold text-slate-800">Free {svc.title || svc.name} Voucher</span>
                            </div>
                          ));
                        })())}

                        {(() => {
                          const planOrder = ['Silver', 'Gold', 'Diamond', 'Platinum'];
                          const currentName = plan.name || '';
                          const baseName = planOrder.find(p => currentName.toLowerCase().includes(p.toLowerCase()));
                          const currentIndex = baseName ? planOrder.indexOf(baseName) : -1;
                          const prevName = currentIndex > 0 ? planOrder[currentIndex - 1] : null;

                          if (!prevName) return null;

                          return (
                            <div className="mt-2 p-2 bg-slate-50 rounded-xl border border-slate-200/80 text-[10px] font-bold text-slate-600 flex items-center gap-2">
                              <FiGift className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span>Includes All Benefits from {prevName} Tier</span>
                            </div>
                          );
                        })()}
                      </div>

                      {plan.description && (
                        <p className="text-xs leading-relaxed text-slate-500 font-medium">
                          {plan.description}
                        </p>
                      )}
                    </div>

                    {/* Uniform Clean Button Action */}
                    <div className="pt-5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/user/my-plan/${plan._id}`);
                        }}
                        className={`w-full py-3 px-4 rounded-2xl font-extrabold text-xs uppercase tracking-wider shadow-2xs transition-all active:scale-95 flex items-center justify-center gap-2 ${
                          isCurrent
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-[#0B132B] hover:bg-slate-800 text-amber-400'
                        } ${isDisabled && !isCurrent ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span>{buttonText}</span>
                        <FiArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {plans.length === 0 && !loading && (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-6 space-y-2">
              <FiStar className="h-10 w-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">No Membership Plans Available</h3>
              <p className="text-xs text-slate-500 font-medium">Please check back later for new subscription offers.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default MyPlan;
