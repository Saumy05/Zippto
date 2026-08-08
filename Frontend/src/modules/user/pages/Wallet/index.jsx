import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowLeft,
  FiCreditCard,
  FiTrendingDown,
  FiAlertTriangle,
  FiGift,
  FiArrowDownCircle,
  FiArrowUpCircle,
  FiChevronRight,
  FiClock
} from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi';
import { toast } from 'react-hot-toast';
import { walletService } from '../../../../services/walletService';
import LogoLoader from '../../../../components/common/LogoLoader';
import NotificationBell from '../../components/common/NotificationBell';

const Wallet = () => {
  const navigate = useNavigate();
  const [walletBalance, setWalletBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadWalletData = async () => {
      try {
        setLoading(true);
        const [balanceResponse, transactionsResponse] = await Promise.all([
          walletService.getBalance(),
          walletService.getTransactions()
        ]);
        if (balanceResponse.success) {
          setWalletBalance(balanceResponse.data.balance || 0);
        }
        if (transactionsResponse.success) {
          setTransactions(transactionsResponse.data || []);
        }
      } catch (error) {
        toast.error('Failed to load wallet data');
      } finally {
        setLoading(false);
      }
    };
    loadWalletData();
  }, []);

  const totalSpent = transactions
    .filter((t) =>
      ['payment', 'withdrawal', 'platform_fee', 'convenience_fee', 'gst', 'worker_payment', 'cash_collected'].includes(t.type)
    )
    .reduce((sum, t) => sum + t.amount, 0);

  const totalPenalty = transactions
    .filter((t) => ['penalty', 'fine', 'cancellation_fee', 'debit'].includes(t.type))
    .reduce((sum, t) => sum + t.amount, 0);

  const getTransactionStyle = (type) => {
    if (['credit', 'refund', 'topup', 'referral', 'cashback', 'cash_collected'].includes(type)) {
      return {
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        border: 'border-emerald-100',
        iconBg: 'bg-emerald-100',
        Icon: FiArrowDownCircle,
        sign: '+'
      };
    }
    if (['payment', 'withdrawal'].includes(type)) {
      return {
        color: 'text-rose-600',
        bg: 'bg-rose-50',
        border: 'border-rose-100',
        iconBg: 'bg-rose-100',
        Icon: FiArrowUpCircle,
        sign: '-'
      };
    }
    if (['penalty', 'fine', 'cancellation_fee', 'debit'].includes(type)) {
      return {
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        border: 'border-amber-100',
        iconBg: 'bg-amber-100',
        Icon: FiAlertTriangle,
        sign: '-'
      };
    }
    return {
      color: 'text-slate-600',
      bg: 'bg-slate-50',
      border: 'border-slate-100',
      iconBg: 'bg-slate-100',
      Icon: FiCreditCard,
      sign: ''
    };
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans antialiased pb-28">
      {/* Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-400/5 rounded-full blur-3xl -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-slate-800/5 rounded-full blur-3xl -ml-20" />
      </div>

      <div className="relative z-10">
        {/* Sticky Header */}
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 py-3.5 shadow-2xs">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center transition-colors active:scale-95"
                aria-label="Go back"
              >
                <FiArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-base font-extrabold text-slate-900 tracking-tight leading-none">
                  Wallet
                </h1>
                <span className="text-[10px] text-slate-500 font-semibold">Payments & Transactions</span>
              </div>
            </div>
            <NotificationBell />
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-4 pt-5 space-y-4">

          {/* ── Referral Banner ── */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B132B] via-[#1C2541] to-[#0B132B] p-5 shadow-md">
            {/* Glow orbs */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-amber-400/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-28 h-28 bg-amber-300/5 rounded-full blur-xl -ml-8 -mb-8 pointer-events-none" />

            <div className="relative z-10 flex items-center justify-between gap-4">
              <div className="space-y-1.5">
                <span className="text-[9px] font-extrabold tracking-[0.15em] text-amber-400 uppercase">
                  Referral Bonus
                </span>
                <h2 className="text-base font-black text-white leading-snug">
                  Refer friends & earn <span className="text-amber-400">₹100</span>
                </h2>
                <p className="text-[11px] text-slate-400 font-medium">
                  They get ₹100 · You get ₹100
                </p>
                <button className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#0B132B] font-extrabold text-[10px] uppercase tracking-wider transition-all active:scale-95 shadow-md">
                  <HiSparkles className="w-3 h-3" />
                  Share Referral Link
                </button>
              </div>
              <div className="w-16 h-16 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shrink-0 text-3xl shadow-lg">
                🎁
              </div>
            </div>
          </div>

          {/* ── Balance Card ── */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B132B] via-[#1C2541] to-slate-800 p-5 shadow-md">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/[0.03] rounded-full -mr-20 -mt-20" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/[0.03] rounded-full -ml-12 -mb-12" />

            <div className="relative z-10 space-y-3">
              <div className="flex items-center gap-2">
                <FiCreditCard className="w-4 h-4 text-amber-400" />
                <span className="text-[10px] font-extrabold tracking-[0.15em] text-slate-400 uppercase">
                  Current Balance
                </span>
              </div>

              <div>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-black text-white tracking-tight">
                    ₹{walletBalance.toLocaleString('en-IN')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-1">
                  Zippto Wallet · Secured
                </p>
              </div>

              {totalPenalty > 0 && (
                <div className="flex items-center gap-2 bg-amber-400/10 border border-amber-400/20 rounded-xl px-3 py-2 w-fit">
                  <FiAlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-[11px] text-amber-400 font-bold">
                    ₹{totalPenalty.toLocaleString('en-IN')} in penalties
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── Stats Row ── */}
          <div className="grid grid-cols-2 gap-3">
            {/* Total Spent */}
            <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center">
                <FiTrendingDown className="w-5 h-5 text-slate-700" />
              </div>
              <div>
                <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
                  Total Spent
                </p>
                <p className="text-xl font-black text-slate-900 mt-0.5">
                  ₹{totalSpent.toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            {/* Total Penalty */}
            <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center">
                <FiAlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
                  Total Penalty
                </p>
                <p className="text-xl font-black text-amber-600 mt-0.5">
                  ₹{totalPenalty.toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          </div>

          {/* ── Recent Transactions ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                Recent Transactions
              </h3>
              {transactions.length > 0 && (
                <button className="text-[10px] font-bold text-[#0B132B] hover:text-amber-600 uppercase tracking-wider flex items-center gap-0.5 transition-colors">
                  See All <FiChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>

            {loading ? (
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-8 flex flex-col items-center justify-center gap-3">
                <LogoLoader fullScreen={false} />
                <p className="text-xs text-slate-400 font-medium">Loading transactions...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-8 flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#0B132B] via-[#1C2541] to-[#0B132B] flex items-center justify-center border border-slate-800">
                  <FiClock className="w-7 h-7 text-amber-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-extrabold text-slate-900">No Transactions Yet</p>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    Your wallet activity will appear here once you start booking services.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/user')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#0B132B] hover:bg-slate-800 text-white text-xs font-extrabold uppercase tracking-wider shadow-md active:scale-95 transition-all"
                >
                  <HiSparkles className="w-3.5 h-3.5 text-amber-400" />
                  Explore Services
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {transactions.map((item, index) => {
                  const style = getTransactionStyle(item.type);
                  const { Icon } = style;
                  return (
                    <div
                      key={item.id || index}
                      className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-4 flex items-center gap-3.5 hover:border-slate-300 transition-all"
                    >
                      {/* Icon */}
                      <div className={`w-11 h-11 rounded-2xl ${style.iconBg} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-5 h-5 ${style.color}`} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-extrabold text-slate-900 leading-snug line-clamp-1">
                          {item.description || item.title || 'Transaction'}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-400 font-semibold">
                            {formatDate(item.date)}
                          </span>
                          {item.type && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-extrabold uppercase tracking-wider ${style.bg} ${style.color}`}>
                              {item.type.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-black ${style.color}`}>
                          {style.sign}₹{item.amount.toLocaleString('en-IN')}
                        </p>
                        {item.balanceAfter !== undefined && (
                          <p className="text-[9px] text-slate-400 font-semibold mt-0.5">
                            Bal: ₹{item.balanceAfter.toLocaleString('en-IN')}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Wallet;
