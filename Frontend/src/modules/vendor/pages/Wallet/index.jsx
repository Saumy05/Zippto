import React, { useState, useEffect, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiDollarSign, FiArrowUp, FiArrowDown, FiArrowRight, FiClock, FiCheckCircle, FiAlertCircle, FiSend, FiX } from 'react-icons/fi';
import { vendorTheme as themeColors } from '../../../../theme';
import Header from '../../components/layout/Header';
import LogoLoader from '../../../../components/common/LogoLoader';
import vendorWalletService from '../../../../services/vendorWalletService';
import { toast } from 'react-hot-toast';

// Last wallet data, kept across tab switches so revisiting shows it instantly while refreshing quietly.
// Keyed by vendor so another account never sees the previous one's balance.
let walletCache = null; // { vendorKey, wallet, transactions }
const currentVendorKey = () => {
  try {
    const v = JSON.parse(localStorage.getItem('vendorData') || '{}');
    return String(v._id || v.id || '');
  } catch (e) {
    return '';
  }
};
const readWalletCache = () => (walletCache && walletCache.vendorKey === currentVendorKey() ? walletCache : null);

const Wallet = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(() => !readWalletCache());
  const [wallet, setWallet] = useState(() => readWalletCache()?.wallet || {
    balance: 0,
    dues: 0,
    earnings: 0,
    amountDue: 0,
    totalCashCollected: 0,
    totalSettled: 0,
    totalWithdrawn: 0,
    pendingSettlements: 0,
    cashLimit: 10000
  });
  const [transactions, setTransactions] = useState(() => readWalletCache()?.transactions || []);
  const [filter, setFilter] = useState('all');

  useLayoutEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');
    const bgStyle = themeColors.backgroundGradient;

    if (html) html.style.background = bgStyle;
    if (body) body.style.background = bgStyle;
    if (root) root.style.background = bgStyle;

    return () => {
      if (html) html.style.background = '';
      if (body) body.style.background = '';
      if (root) root.style.background = '';
    };
  }, []);

  useEffect(() => {
    // Cached data is already on screen: refresh without the full-screen loader
    loadWalletData(!readWalletCache());
  }, []);

  const loadWalletData = async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      const [walletRes, txnRes] = await Promise.all([
        vendorWalletService.getWallet(),
        vendorWalletService.getTransactions({ limit: 50 })
      ]);

      if (walletRes.success) {
        setWallet(walletRes.data);
      }

      if (txnRes.success) {
        setTransactions(txnRes.data || []);
      }

      if (walletRes.success && txnRes.success) {
        walletCache = { vendorKey: currentVendorKey(), wallet: walletRes.data, transactions: txnRes.data || [] };
      }
    } catch (error) {
      console.error('Error loading wallet:', error);
      toast.error('Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(txn => {
    if (filter === 'all') return true;
    return txn.type === filter;
  });

  const handleOffsetDues = async () => {
    try {
      setLoading(true);
      const res = await vendorWalletService.offsetDuesFromEarnings();
      if (res.success) {
        toast.success(res.message);
        loadWalletData();
      } else {
        toast.error(res.message || 'Failed to offset dues');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to offset dues from earnings');
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'cash_collected':
        return <FiArrowDown className="w-5 h-5 text-red-500" />;
      case 'earnings_credit':
        return <FiArrowUp className="w-5 h-5 text-green-500" />;
      case 'settlement':
        return <FiSend className="w-5 h-5 text-blue-500" />;
      case 'withdrawal':
        return <FiDollarSign className="w-5 h-5 text-purple-500" />;
      case 'tds_deduction':
        return <FiAlertCircle className="w-5 h-5 text-amber-500" />;
      case 'commission':
        return <FiDollarSign className="w-5 h-5 text-orange-500" />;
      case 'platform_fee':
        return <FiAlertCircle className="w-5 h-5 text-rose-500" />;
      default:
        return <FiDollarSign className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTransactionLabel = (type) => {
    switch (type) {
      case 'cash_collected':
        return 'Cash Collected';
      case 'earnings_credit':
        return 'Earnings Credited';
      case 'settlement':
        return 'Settlement Paid';
      case 'withdrawal':
        return 'Withdrawal Payout';
      case 'tds_deduction':
        return 'TDS Deduction';
      case 'commission':
        return 'Commission';
      case 'platform_fee':
        return 'Platform Charge';
      default:
        return type;
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return <LogoLoader />;
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: themeColors.backgroundGradient }}>
      <Header title="Wallet & Ledger" />

      <main className="px-4 py-4">
        {/* Earnings Card (Green): balance on the left, withdraw on the right */}
        <div className="rounded-2xl p-4 shadow-lg relative overflow-hidden mb-3 bg-gradient-to-br from-green-600 to-green-800 text-white">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-white/80 text-xs font-medium mb-0.5">Available Earnings</p>
              <p className="text-3xl font-extrabold tracking-tight truncate">₹{wallet.earnings?.toLocaleString() || 0}</p>
            </div>
            <button
              onClick={() => navigate('/vendor/wallet/withdraw')}
              className="shrink-0 bg-white text-green-700 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-green-50 active:scale-95 transition-all shadow-sm flex items-center gap-1.5"
            >
              Withdraw
              <FiArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dues: a quiet row when nothing is due, a red action card only when it matters */}
        {wallet.dues > 0 ? (
          <div className="rounded-2xl p-4 shadow-lg relative overflow-hidden mb-4 bg-gradient-to-br from-red-600 to-red-800 text-white">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <p className="text-white/80 text-xs font-medium">Amount Due to Admin</p>
                  <FiAlertCircle className="w-3.5 h-3.5 text-red-200 animate-pulse" />
                </div>
                <p className="text-2xl font-extrabold tracking-tight truncate">₹{wallet.dues?.toLocaleString() || 0}</p>
              </div>
              <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm shrink-0">
                <FiArrowDown className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="space-y-2">
              {wallet.earnings > 0 && (
                <button
                  onClick={handleOffsetDues}
                  className="w-full bg-amber-400 text-slate-900 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider hover:bg-amber-300 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>⚡ Settle ₹{Math.min(wallet.dues, wallet.earnings).toLocaleString()} from Earnings</span>
                </button>
              )}
              <button
                onClick={() => navigate('/vendor/wallet/settle')}
                className="w-full bg-white text-red-700 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-red-50 active:scale-95 transition-all shadow-sm cursor-pointer"
              >
                Pay via UPI / Card / Bank
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 bg-white rounded-2xl px-4 py-3 mb-4 shadow-sm border border-emerald-100">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                <FiCheckCircle className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-800 leading-tight">No dues pending</p>
                <p className="text-[11px] text-gray-500">You don't owe the platform anything</p>
              </div>
            </div>
            <span className="text-sm font-bold text-emerald-600 shrink-0">₹0</span>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Cash Collected */}
          <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-red-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-red-50">
                <FiArrowDown className="w-4 h-4 text-red-500" />
              </div>
              <p className="text-xs text-gray-600 font-semibold">Cash Collected</p>
            </div>
            <p className="text-xl font-bold text-red-600">
              ₹{wallet.totalCashCollected?.toLocaleString() || 0}
            </p>
          </div>

          {/* Total Settled */}
          <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-green-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-green-50">
                <FiArrowUp className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-xs text-gray-600 font-semibold">Total Settled</p>
            </div>
            <p className="text-xl font-bold text-green-600">
              ₹{wallet.totalSettled?.toLocaleString() || 0}
            </p>
          </div>
        </div>

        {/* Blocked Status Notice */}
        {wallet.isBlocked && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <div className="flex items-start gap-3">
              <FiX className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-bold text-red-800">Account Blocked</p>
                <p className="text-sm text-red-600 mb-2">
                  {wallet.blockReason || 'Your account is blocked due to excessive dues.'}
                </p>
                <button
                  onClick={() => navigate('/vendor/wallet/settle')}
                  className="text-xs font-bold uppercase tracking-wider text-white bg-red-600 px-3 py-1.5 rounded-lg shadow-sm active:scale-95 transition-all"
                >
                  Pay Now to Unblock
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cash Limit Indicator */}
        <div className="bg-white rounded-2xl p-3.5 shadow-sm mb-4 border border-blue-50">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-700">Cash Collection Limit</p>
            <p className="text-xs font-medium text-gray-500">
              ₹{(wallet.dues || 0).toLocaleString()} / ₹{(wallet.cashLimit || 10000).toLocaleString()}
            </p>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${(wallet.dues / (wallet.cashLimit || 10000)) > 0.8 ? 'bg-red-500' : 'bg-blue-500'
                }`}
              style={{ width: `${Math.min(100, (wallet.dues / (wallet.cashLimit || 10000)) * 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5">
            Account is auto-blocked above ₹{(wallet.cashLimit || 10000).toLocaleString()} in dues.
          </p>
        </div>



        {/* Filter Buttons */}
        <div className="flex gap-2 mb-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          {[
            { id: 'all', label: 'All' },
            { id: 'cash_collected', label: 'Cash Collected' },
            { id: 'settlement', label: 'Settlements' },
            { id: 'withdrawal', label: 'Withdrawals' },
            { id: 'tds_deduction', label: 'TDS' },
            { id: 'platform_fee', label: 'Platform Fees' },
          ].map((filterOption) => (
            <button
              key={filterOption.id}
              onClick={() => setFilter(filterOption.id)}
              className={`px-3.5 py-1.5 rounded-full font-semibold text-xs whitespace-nowrap transition-all ${filter === filterOption.id
                ? 'text-white'
                : 'bg-white text-gray-700'
                }`}
              style={
                filter === filterOption.id
                  ? {
                    background: themeColors.button,
                    boxShadow: `0 2px 8px ${themeColors.button}40`,
                  }
                  : {
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                  }
              }
            >
              {filterOption.label}
            </button>
          ))}
        </div>

        {/* Transactions/Ledger */}
        <div>
          <h3 className="font-bold text-gray-800 mb-3 text-sm">Transaction History</h3>
          {filteredTransactions.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center shadow-md">
              <FiDollarSign className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-600 font-semibold mb-2">No transactions yet</p>
              <p className="text-sm text-gray-500">Your ledger will appear here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTransactions.map((txn) => (
                <div
                  key={txn._id}
                  className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 border-l-4"
                  style={{
                    borderLeftColor:
                      txn.type === 'cash_collected' ? '#DC2626' :
                        txn.type === 'settlement' ? '#10B981' :
                          txn.type === 'withdrawal' ? '#8B5CF6' :
                            txn.type === 'tds_deduction' ? '#F59E0B' :
                              txn.type === 'platform_fee' ? '#E11D48' : '#F97316'
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background:
                          txn.type === 'cash_collected' ? '#FEE2E2' :
                            txn.type === 'settlement' ? '#D1FAE5' :
                              txn.type === 'withdrawal' ? '#EDE9FE' :
                                txn.type === 'tds_deduction' ? '#FEF3C7' :
                                  txn.type === 'platform_fee' ? '#FFF1F2' : '#FFEDD5'
                      }}
                    >
                      {getTransactionIcon(txn.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className="font-bold text-gray-900 text-sm">
                          {getTransactionLabel(txn.type)}
                        </p>
                        <p className={`text-base font-bold shrink-0 ${['cash_collected', 'tds_deduction', 'withdrawal', 'platform_fee'].includes(txn.type)
                          ? 'text-red-600'
                          : 'text-green-600'
                          }`}>
                          {['cash_collected', 'tds_deduction', 'withdrawal', 'platform_fee'].includes(txn.type) ? '-' : '+'}₹{Math.abs(txn.amount).toLocaleString()}
                        </p>
                      </div>

                      <p className="text-xs text-gray-600 truncate mb-0.5">{txn.description}</p>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{formatDate(txn.createdAt)}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${txn.status === 'completed' ? 'bg-green-100 text-green-700' :
                          txn.status === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                          {txn.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* View Settlements Link */}
        <button
          onClick={() => navigate('/vendor/wallet/settlements')}
          className="w-full mt-4 py-3 rounded-xl font-semibold text-sm text-gray-700 bg-white border border-gray-200 flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          View Settlement History
          <FiArrowRight className="w-4 h-4" />
        </button>
      </main>

    </div>
  );
};

export default Wallet;
