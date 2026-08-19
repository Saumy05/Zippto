import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowLeft,
  FiCreditCard,
  FiTrendingDown,
  FiTrendingUp,
  FiAlertTriangle,
  FiArrowDownCircle,
  FiArrowUpCircle,
  FiClock,
  FiX,
  FiCheckCircle,
  FiExternalLink,
  FiShield,
  FiDollarSign,
  FiInfo
} from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi';
import { MdAccountBalance, MdOutlineQrCodeScanner } from 'react-icons/md';
import { toast } from 'react-hot-toast';
import { walletService } from '../../../../services/walletService';
import LogoLoader from '../../../../components/common/LogoLoader';
import NotificationBell from '../../components/common/NotificationBell';

const Wallet = () => {
  const navigate = useNavigate();
  const [walletBalance, setWalletBalance] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'credits', 'debits', 'withdrawals'
  const [loading, setLoading] = useState(true);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);

  // Withdrawal form state
  const [withdrawType, setWithdrawType] = useState('upi'); // 'upi' | 'bank'
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [upiId, setUpiId] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [bankName, setBankName] = useState('');

  // Load wallet, stats, and transaction history
  const loadWalletData = useCallback(async () => {
    try {
      setLoading(true);
      const [balanceRes, txnRes, withdrawalRes] = await Promise.all([
        walletService.getBalance(),
        walletService.getTransactions({ type: activeFilter }),
        walletService.getWithdrawals()
      ]);

      if (balanceRes.success && balanceRes.data) {
        setWalletBalance(balanceRes.data.balance || 0);
        setTotalEarned(balanceRes.data.totalEarned || 0);
        setTotalSpent(balanceRes.data.totalSpent || 0);
      }

      if (txnRes.success) {
        setTransactions(txnRes.data || []);
      }

      if (withdrawalRes.success) {
        setWithdrawals(withdrawalRes.data || []);
      }
    } catch (error) {
      console.error('Failed to load wallet data:', error);
      toast.error('Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    loadWalletData();
  }, [loadWalletData]);

  // Handle Withdrawal Submission
  const handleWithdrawSubmit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(withdrawAmount);

    if (isNaN(amount) || amount < 100) {
      toast.error('Minimum withdrawal amount is ₹100');
      return;
    }

    if (amount > walletBalance) {
      toast.error(`Insufficient balance. Available: ₹${walletBalance}`);
      return;
    }

    const payload = {
      amount,
      transferType: withdrawType
    };

    if (withdrawType === 'upi') {
      if (!upiId.trim() || !/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upiId.trim())) {
        toast.error('Please enter a valid UPI ID (e.g. mobile@upi or name@bank)');
        return;
      }
      payload.upiId = upiId.trim();
    } else {
      if (!accountNumber.trim() || accountNumber.trim().length < 8) {
        toast.error('Please enter a valid bank account number');
        return;
      }
      if (accountNumber.trim() !== confirmAccountNumber.trim()) {
        toast.error('Bank account numbers do not match');
        return;
      }
      if (!ifscCode.trim() || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode.trim().toUpperCase())) {
        toast.error('Please enter a valid 11-digit IFSC code (e.g. SBIN0001234)');
        return;
      }
      if (!accountHolderName.trim() || accountHolderName.trim().length < 2) {
        toast.error('Please enter account holder name');
        return;
      }

      payload.accountNumber = accountNumber.trim();
      payload.ifscCode = ifscCode.trim().toUpperCase();
      payload.accountHolderName = accountHolderName.trim();
      payload.bankName = bankName.trim() || 'Bank Account';
    }

    try {
      setSubmittingWithdraw(true);
      const res = await walletService.requestWithdrawal(payload);
      if (res.success) {
        toast.success(res.message || 'Withdrawal request submitted successfully!');
        setIsWithdrawModalOpen(false);
        setWithdrawAmount('');
        // Reload wallet balances and withdrawal logs
        loadWalletData();
      } else {
        toast.error(res.message || 'Failed to submit withdrawal request');
      }
    } catch (err) {
      console.error('Withdrawal error:', err);
      toast.error(err.response?.data?.message || 'Failed to submit withdrawal request');
    } finally {
      setSubmittingWithdraw(false);
    }
  };

  const getTransactionStyle = (type) => {
    if (['credit', 'refund', 'referral_bonus', 'cashback', 'referral'].includes(type)) {
      return {
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        border: 'border-emerald-100',
        iconBg: 'bg-emerald-100',
        Icon: FiArrowDownCircle,
        sign: '+'
      };
    }
    if (['payment', 'debit'].includes(type)) {
      return {
        color: 'text-rose-600',
        bg: 'bg-rose-50',
        border: 'border-rose-100',
        iconBg: 'bg-rose-100',
        Icon: FiArrowUpCircle,
        sign: '-'
      };
    }
    if (['withdrawal'].includes(type)) {
      return {
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        border: 'border-blue-100',
        iconBg: 'bg-blue-100',
        Icon: FiExternalLink,
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
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
                aria-label="Go back"
              >
                <FiArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-base font-extrabold text-slate-900 tracking-tight leading-none">
                  Zippto Wallet
                </h1>
                <span className="text-[10px] text-slate-500 font-semibold">Rewards, Refunds & Withdrawals</span>
              </div>
            </div>
            <NotificationBell />
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-4 pt-5 space-y-4">

          {/* ── Referral Banner ── */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B132B] via-[#1C2541] to-[#0B132B] p-5 shadow-md">
            <div className="absolute top-0 right-0 w-40 h-40 bg-amber-400/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-28 h-28 bg-amber-300/5 rounded-full blur-xl -ml-8 -mb-8 pointer-events-none" />

            <div className="relative z-10 flex items-center justify-between gap-4">
              <div className="space-y-1.5">
                <span className="text-[9px] font-extrabold tracking-[0.15em] text-amber-400 uppercase">
                  Referral Rewards
                </span>
                <h2 className="text-base font-black text-white leading-snug">
                  Invite Friends & Earn <span className="text-amber-400">₹100</span>
                </h2>
                <p className="text-[11px] text-slate-400 font-medium">
                  Earn wallet cash directly on every friend’s completed booking.
                </p>
                <button
                  onClick={() => navigate('/user/rewards')}
                  className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#0B132B] font-extrabold text-[10px] uppercase tracking-wider transition-all active:scale-95 shadow-md cursor-pointer"
                >
                  <HiSparkles className="w-3 h-3" />
                  View Referral Program
                </button>
              </div>
              <div className="w-16 h-16 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shrink-0 text-3xl shadow-lg">
                🎁
              </div>
            </div>
          </div>

          {/* ── Main Hero Balance Card ── */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B132B] via-[#1C2541] to-slate-900 p-5 sm:p-6 shadow-md border border-slate-700/50">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/[0.03] rounded-full -mr-20 -mt-20 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/[0.03] rounded-full -ml-12 -mb-12 pointer-events-none" />

            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FiCreditCard className="w-4 h-4 text-amber-400" />
                  <span className="text-[10px] font-extrabold tracking-[0.15em] text-slate-400 uppercase">
                    Available Balance
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <FiShield className="w-3 h-3" /> 100% Protected
                </span>
              </div>

              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                    ₹{walletBalance.toLocaleString('en-IN')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium mt-1.5 flex items-center gap-1.5">
                  <FiInfo className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  Earned from Referrals, Cashbacks & Booking Refunds
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  onClick={() => setIsWithdrawModalOpen(true)}
                  disabled={walletBalance < 100}
                  className={`flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-extrabold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 ${
                    walletBalance >= 100
                      ? 'bg-amber-400 hover:bg-amber-300 text-[#0B132B] cursor-pointer'
                      : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  }`}
                  title={walletBalance < 100 ? 'Minimum balance of ₹100 required to withdraw' : 'Transfer to Bank or UPI'}
                >
                  <MdAccountBalance className="w-4 h-4" />
                  <span>Withdraw / Transfer to Bank or UPI</span>
                </button>

                <button
                  onClick={() => navigate('/user')}
                  className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all backdrop-blur-xs cursor-pointer active:scale-95"
                >
                  <FiDollarSign className="w-3.5 h-3.5 text-amber-400" />
                  <span>Use on Services</span>
                </button>
              </div>

              {walletBalance < 100 && (
                <p className="text-[10.5px] text-slate-400 italic">
                  * Minimum withdrawal amount is ₹100. You can use your balance at checkout anytime!
                </p>
              )}
            </div>
          </div>

          {/* ── Stats Row ── */}
          <div className="grid grid-cols-2 gap-3">
            {/* Total Rewards & Refunds Earned */}
            <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-2xs space-y-2.5">
              <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <FiTrendingUp className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
                  Total Rewards Earned
                </p>
                <p className="text-lg font-black text-slate-900 mt-0.5">
                  ₹{totalEarned.toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            {/* Total Spent on Bookings */}
            <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-2xs space-y-2.5">
              <div className="w-9 h-9 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <FiTrendingDown className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
                  Spent on Bookings
                </p>
                <p className="text-lg font-black text-slate-900 mt-0.5">
                  ₹{totalSpent.toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          </div>

          {/* ── Pending / Active Withdrawal Requests ── */}
          {withdrawals.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center justify-between">
                <span>Withdrawal Requests</span>
                <span className="text-[10px] text-slate-400 font-semibold">{withdrawals.length} total</span>
              </h3>

              <div className="space-y-2.5">
                {withdrawals.map((w) => {
                  const isPending = w.status === 'pending';
                  const isApproved = w.status === 'approved';
                  const isRejected = w.status === 'rejected';

                  return (
                    <div
                      key={w.id}
                      className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                            isApproved ? 'bg-emerald-100 text-emerald-700' : isPending ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            <MdAccountBalance className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">
                              Transfer to {w.destination}
                            </p>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {formatDate(w.requestDate)}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-black text-slate-900">
                            ₹{w.amount.toLocaleString('en-IN')}
                          </p>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider ${
                            isApproved
                              ? 'bg-emerald-100 text-emerald-700'
                              : isPending
                              ? 'bg-amber-100 text-amber-700 animate-pulse'
                              : 'bg-rose-100 text-rose-700'
                          }`}>
                            {isApproved ? '✓ Transferred' : isPending ? '⏳ Processing' : '✕ Rejected'}
                          </span>
                        </div>
                      </div>

                      {isApproved && w.transactionReference && (
                        <p className="text-[10.5px] text-emerald-700 bg-emerald-50/80 px-2.5 py-1 rounded-lg border border-emerald-100 font-medium">
                          Bank Ref / UTR: <span className="font-bold">{w.transactionReference}</span>
                        </p>
                      )}

                      {isRejected && (
                        <p className="text-[10.5px] text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100 font-medium">
                          Reason: {w.rejectionReason || 'Admin review failed'}. Balance has been restored.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Filterable Transaction Ledger ── */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                Transaction History
              </h3>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto text-[10px] font-bold">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'credits', label: 'Credits (+)' },
                  { key: 'debits', label: 'Payments (-)' },
                  { key: 'withdrawals', label: 'Withdrawals (↗)' }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveFilter(tab.key)}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      activeFilter === tab.key
                        ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-8 flex flex-col items-center justify-center gap-3">
                <LogoLoader fullScreen={false} />
                <p className="text-xs text-slate-400 font-medium">Loading transactions...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-8 flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center border border-slate-200">
                  <FiClock className="w-6 h-6 text-slate-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-extrabold text-slate-900">No Transactions Found</p>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    Transactions from referral bonuses, booking refunds, and withdrawals will appear here.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {transactions.map((item, index) => {
                  const style = getTransactionStyle(item.type);
                  const { Icon } = style;
                  return (
                    <div
                      key={item.id || index}
                      className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3.5 flex items-center gap-3 hover:border-slate-300 transition-all"
                    >
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-xl ${style.iconBg} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-5 h-5 ${style.color}`} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-extrabold text-slate-900 leading-snug line-clamp-1">
                          {item.description || item.title || 'Transaction'}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-400 font-semibold">
                            {formatDate(item.date)}
                          </span>
                          {item.type && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-extrabold uppercase tracking-wider ${style.bg} ${style.color}`}>
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

      {/* ── Withdrawal Modal ── */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 relative animate-scaleUp max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => setIsWithdrawModalOpen(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
            >
              <FiX className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="space-y-1 text-left mb-5">
              <span className="text-[10px] font-extrabold text-amber-600 uppercase tracking-widest">
                Wallet Withdrawal
              </span>
              <h2 className="text-lg font-black text-slate-900">
                Transfer to Bank or UPI
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Available Wallet Balance: <span className="font-extrabold text-slate-900">₹{walletBalance.toLocaleString('en-IN')}</span>
              </p>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
              {/* Method Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setWithdrawType('upi')}
                  className={`py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    withdrawType === 'upi'
                      ? 'bg-white text-[#0B132B] shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <MdOutlineQrCodeScanner className="w-4 h-4 text-emerald-600" />
                  <span>Instant UPI</span>
                </button>

                <button
                  type="button"
                  onClick={() => setWithdrawType('bank')}
                  className={`py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    withdrawType === 'bank'
                      ? 'bg-white text-[#0B132B] shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <MdAccountBalance className="w-4 h-4 text-blue-600" />
                  <span>Bank Transfer</span>
                </button>
              </div>

              {/* Amount Input */}
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Amount to Withdraw (₹)</span>
                  <span className="text-[10px] text-slate-400 font-semibold">Min ₹100</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-slate-400 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    min="100"
                    max={walletBalance}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="Enter amount (e.g. 500)"
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition-all"
                    required
                  />
                </div>

                {/* Preset Chips */}
                <div className="flex items-center gap-2 pt-1">
                  {[100, 250, 500].filter(amt => amt <= walletBalance).map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setWithdrawAmount(preset.toString())}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-700 transition-colors cursor-pointer"
                    >
                      ₹{preset}
                    </button>
                  ))}
                  {walletBalance >= 100 && (
                    <button
                      type="button"
                      onClick={() => setWithdrawAmount(walletBalance.toString())}
                      className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-[10px] font-extrabold text-amber-800 transition-colors cursor-pointer"
                    >
                      Withdraw All (₹{walletBalance})
                    </button>
                  )}
                </div>
              </div>

              {/* Transfer Details: UPI */}
              {withdrawType === 'upi' ? (
                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-bold text-slate-800">
                    UPI ID / VPA
                  </label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. 9876543210@paytm or name@okaxis"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition-all"
                    required
                  />
                  <p className="text-[10px] text-slate-400">
                    Enter your Google Pay, PhonePe, Paytm, or BHIM UPI ID.
                  </p>
                </div>
              ) : (
                /* Transfer Details: Bank Account */
                <div className="space-y-3 text-left">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800">Account Holder Name</label>
                    <input
                      type="text"
                      value={accountHolderName}
                      onChange={(e) => setAccountHolderName(e.target.value)}
                      placeholder="As on bank passbook"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:border-slate-900 outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800">Bank Account Number</label>
                    <input
                      type="password"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="Enter account number"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:border-slate-900 outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800">Confirm Account Number</label>
                    <input
                      type="text"
                      value={confirmAccountNumber}
                      onChange={(e) => setConfirmAccountNumber(e.target.value)}
                      placeholder="Re-enter account number"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:border-slate-900 outline-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-800">IFSC Code</label>
                      <input
                        type="text"
                        value={ifscCode}
                        onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                        placeholder="e.g. SBIN0001234"
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 uppercase focus:bg-white focus:border-slate-900 outline-none"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-800">Bank Name</label>
                      <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="e.g. HDFC / SBI"
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:border-slate-900 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Fee Breakdown */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between font-medium">
                  <span>Withdrawal Amount:</span>
                  <span className="font-bold text-slate-900">₹{withdrawAmount || 0}</span>
                </div>
                <div className="flex justify-between font-medium text-emerald-600">
                  <span>Processing Fee:</span>
                  <span className="font-bold">₹0 (FREE)</span>
                </div>
                <div className="border-t border-slate-200 pt-1.5 flex justify-between font-extrabold text-slate-900">
                  <span>Net Amount to Receive:</span>
                  <span className="text-amber-600">₹{withdrawAmount || 0}</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submittingWithdraw || !withdrawAmount || parseFloat(withdrawAmount) < 100 || parseFloat(withdrawAmount) > walletBalance}
                className="w-full py-3.5 rounded-2xl bg-[#0B132B] hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
              >
                {submittingWithdraw ? (
                  <span>Processing Request...</span>
                ) : (
                  <>
                    <FiCheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>Confirm & Withdraw ₹{withdrawAmount || 0}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Wallet;
