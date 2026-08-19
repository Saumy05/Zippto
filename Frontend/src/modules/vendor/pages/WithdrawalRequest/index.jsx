import React, { useState, useEffect, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiDollarSign,
  FiArrowRight,
  FiCreditCard,
  FiAlertCircle,
  FiCheckCircle,
  FiEdit2,
  FiClock,
  FiActivity,
  FiShield,
  FiInfo
} from 'react-icons/fi';
import { MdAccountBalance, MdOutlineQrCodeScanner } from 'react-icons/md';
import { vendorTheme as themeColors } from '../../../../theme';
import Header from '../../components/layout/Header';
import BottomNav from '../../components/layout/BottomNav';
import { requestWithdrawal, getWalletBalance, getWithdrawalHistory } from '../../services/walletService';
import { toast } from 'react-hot-toast';
import LogoLoader from '../../../../components/common/LogoLoader';

const WithdrawalRequest = () => {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState({ available: 0 });
  const [amount, setAmount] = useState('');
  const [transferType, setTransferType] = useState('bank'); // 'bank' | 'upi'
  const [showBankForm, setShowBankForm] = useState(false);
  const [history, setHistory] = useState([]);
  const [bankAccount, setBankAccount] = useState({
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    confirmAccountNumber: '',
    ifscCode: '',
    upiId: ''
  });
  const [isBankSaved, setIsBankSaved] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);

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
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setFetchingData(true);
      const [walletRes, historyRes] = await Promise.all([
        getWalletBalance(),
        getWithdrawalHistory()
      ]);

      const availableEarnings = walletRes.earnings || walletRes.balance || 0;
      setWallet({ available: availableEarnings });
      setHistory(historyRes || []);

      // Check for saved bank details in server response first, fallback to localStorage
      const serverBank = walletRes.bankDetails;
      const localBank = JSON.parse(localStorage.getItem('vendorBankAccount') || 'null');
      const activeBank = serverBank?.accountNumber || serverBank?.upiId ? serverBank : localBank;

      if (activeBank) {
        setBankAccount({
          accountHolderName: activeBank.accountHolderName || '',
          bankName: activeBank.bankName || '',
          accountNumber: activeBank.accountNumber || '',
          confirmAccountNumber: activeBank.accountNumber || '',
          ifscCode: activeBank.ifscCode || '',
          upiId: activeBank.upiId || ''
        });
        if (activeBank.upiId && !activeBank.accountNumber) {
          setTransferType('upi');
        }
        setIsBankSaved(true);
      } else {
        setShowBankForm(true);
      }
    } catch (err) {
      console.error('Error loading withdrawal data:', err);
      toast.error('Failed to load wallet data');
    } finally {
      setFetchingData(false);
    }
  };

  const handleAmountChange = (value) => {
    const numValue = value.replace(/[^0-9]/g, '');
    setAmount(numValue);
    setError('');

    const numAmount = parseInt(numValue) || 0;
    if (numAmount > wallet.available) {
      setError(`Amount cannot exceed available earnings (₹${wallet.available.toLocaleString()})`);
    } else if (numAmount < 100 && numValue !== '') {
      setError('Minimum withdrawal amount is ₹100');
    }
  };

  const handlePresetAmount = (val) => {
    const num = Math.min(val, wallet.available);
    setAmount(num.toString());
    setError('');
  };

  const handleMaxAmount = () => {
    setAmount(wallet.available.toString());
    setError('');
  };

  const handleBankInputChange = (e) => {
    const { name, value } = e.target;

    if (name === 'accountNumber' || name === 'confirmAccountNumber') {
      const numValue = value.replace(/[^0-9]/g, '');
      setBankAccount(prev => ({ ...prev, [name]: numValue }));
      return;
    }

    if (name === 'ifscCode') {
      setBankAccount(prev => ({ ...prev, [name]: value.toUpperCase() }));
      return;
    }

    setBankAccount(prev => ({ ...prev, [name]: value }));
  };

  const saveBankDetails = () => {
    if (transferType === 'upi') {
      if (!bankAccount.upiId || !/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(bankAccount.upiId.trim())) {
        toast.error('Please enter a valid UPI ID (e.g. mobile@upi or name@bank)');
        return;
      }
    } else {
      if (!bankAccount.accountHolderName?.trim() || !bankAccount.accountNumber?.trim() || !bankAccount.ifscCode?.trim()) {
        toast.error('Please fill all mandatory bank account fields');
        return;
      }
      if (bankAccount.accountNumber !== bankAccount.confirmAccountNumber) {
        toast.error('Account numbers do not match');
        return;
      }
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankAccount.ifscCode.trim())) {
        toast.error('Please enter a valid 11-digit IFSC code');
        return;
      }
    }

    localStorage.setItem('vendorBankAccount', JSON.stringify(bankAccount));
    setIsBankSaved(true);
    setShowBankForm(false);
    toast.success('Payout details saved');
  };

  const handleSubmit = async () => {
    const numAmount = parseInt(amount) || 0;
    if (!amount || numAmount === 0 || error) return;
    if (!isBankSaved) {
      toast.error('Please save your payout details first');
      return;
    }

    try {
      setLoading(true);
      await requestWithdrawal({
        amount: numAmount,
        bankDetails: {
          ...bankAccount,
          transferType
        }
      });
      toast.success('Withdrawal request submitted successfully!');
      window.dispatchEvent(new Event('vendorWalletUpdated'));
      navigate('/vendor/wallet');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const tdsRate = 2; // Standard 2% TDS on service provider payouts
  const grossAmount = parseInt(amount) || 0;
  const tdsAmount = Math.round(grossAmount * (tdsRate / 100));
  const netAmount = Math.max(0, grossAmount - tdsAmount);

  if (fetchingData) {
    return <LogoLoader />;
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: themeColors.backgroundGradient }}>
      <Header title="Request Withdrawal" />

      <main className="px-4 py-6 max-w-lg mx-auto space-y-5">
        {/* ── Balance Header ── */}
        <div className="rounded-3xl p-6 shadow-xl relative overflow-hidden bg-gradient-to-br from-green-600 via-green-700 to-slate-900 border border-green-500/30">
          <div className="relative z-10 text-white flex flex-col items-center">
            <span className="text-green-200 text-[10px] font-extrabold uppercase tracking-[0.2em] mb-1">
              Available Earnings
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-white/90">₹</span>
              <span className="text-5xl font-black text-white tracking-tight">
                {wallet.available.toLocaleString()}
              </span>
            </div>
            <div className="mt-3 flex gap-2">
              <div className="px-3 py-1 bg-white/15 text-white rounded-full text-[10px] font-bold border border-white/20 flex items-center gap-1 backdrop-blur-xs">
                <FiShield className="w-3 h-3 text-emerald-300" /> 100% Verified Balance
              </div>
            </div>
          </div>
          <div className="absolute -bottom-6 -right-6 text-white/10 transform rotate-12 pointer-events-none">
            <FiDollarSign className="w-40 h-40" />
          </div>
        </div>

        {/* ── Amount Input Card ── */}
        <div className="bg-white rounded-3xl p-5 shadow-lg border border-slate-100 space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <FiDollarSign className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-800">Withdraw Amount</h3>
            </div>
            {wallet.available > 0 && (
              <button
                type="button"
                onClick={handleMaxAmount}
                className="text-[10px] font-extrabold text-white px-3 py-1.5 rounded-xl transition-all active:scale-95 cursor-pointer shadow-xs"
                style={{ background: themeColors.button }}
              >
                USE MAX
              </button>
            )}
          </div>

          <div className="relative">
            <div className="absolute top-1/2 left-4 -translate-y-1/2 text-slate-400 font-black text-2xl">₹</div>
            <input
              type="text"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="0"
              className={`w-full pl-10 pr-4 py-4 bg-slate-50 rounded-2xl border-2 ${
                error ? 'border-red-300 bg-red-50/50 text-red-600' : 'border-slate-200 focus:border-emerald-500 focus:bg-white'
              } text-3xl font-black text-center focus:outline-none transition-all text-slate-900`}
            />
          </div>

          {/* Quick Preset Amount Chips */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {[500, 1000, 2000, 5000].filter(val => val <= wallet.available).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handlePresetAmount(preset)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-all cursor-pointer active:scale-95"
              >
                +₹{preset}
              </button>
            ))}
          </div>

          {error && (
            <p className="text-red-500 text-xs font-bold text-center flex justify-center items-center gap-1">
              <FiAlertCircle className="w-3.5 h-3.5" /> {error}
            </p>
          )}

          {/* TDS & Net Payout Calculation */}
          {amount && !error && grossAmount >= 100 && (
            <div className="bg-emerald-50/60 rounded-2xl p-4 space-y-2 border border-emerald-100 text-xs">
              <div className="flex justify-between font-semibold text-slate-600">
                <span>Gross Withdrawal:</span>
                <span className="font-bold text-slate-900">₹{grossAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-semibold text-amber-700">
                <span className="flex items-center gap-1">
                  <span>TDS Deduction (2%):</span>
                  <FiInfo className="w-3 h-3" title="Mandated TDS by Govt. Regulations" />
                </span>
                <span>- ₹{tdsAmount.toLocaleString()}</span>
              </div>
              <div className="pt-2 border-t border-emerald-200 flex justify-between items-baseline font-extrabold text-slate-900">
                <span className="text-xs uppercase tracking-wider text-slate-500">Net Credit to Bank:</span>
                <span className="text-xl font-black text-emerald-600">₹{netAmount.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Payout Destination Card ── */}
        <div className="bg-white rounded-3xl p-5 shadow-lg border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-2xs border border-blue-100">
                <FiCreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Payout Destination</h3>
                <p className="text-[10px] text-slate-500 font-semibold">Where should we transfer your payout?</p>
              </div>
            </div>
            {isBankSaved && !showBankForm && (
              <button
                type="button"
                onClick={() => setShowBankForm(true)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
                title="Edit Details"
              >
                <FiEdit2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {!isBankSaved || showBankForm ? (
            <div className="space-y-4 pt-1">
              {/* Method Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl text-xs font-extrabold">
                <button
                  type="button"
                  onClick={() => setTransferType('bank')}
                  className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    transferType === 'bank' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <MdAccountBalance className="w-4 h-4 text-blue-600" />
                  <span>Bank Account</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTransferType('upi')}
                  className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    transferType === 'upi' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <MdOutlineQrCodeScanner className="w-4 h-4 text-emerald-600" />
                  <span>Instant UPI</span>
                </button>
              </div>

              {transferType === 'upi' ? (
                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-bold text-slate-700">UPI ID / VPA</label>
                  <input
                    type="text"
                    name="upiId"
                    value={bankAccount.upiId}
                    onChange={handleBankInputChange}
                    placeholder="e.g. mobile@upi or name@okhdfcbank"
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-slate-900 text-xs font-bold text-slate-800 outline-none"
                    required
                  />
                  <p className="text-[10px] text-slate-400">Supported: GPay, PhonePe, Paytm, BHIM</p>
                </div>
              ) : (
                <div className="space-y-3 text-left text-xs font-bold text-slate-700">
                  <div className="space-y-1">
                    <label>Account Holder Name</label>
                    <input
                      type="text"
                      name="accountHolderName"
                      value={bankAccount.accountHolderName}
                      onChange={handleBankInputChange}
                      placeholder="As on bank passbook"
                      className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-slate-900 text-xs font-semibold outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label>Bank Name</label>
                    <input
                      type="text"
                      name="bankName"
                      value={bankAccount.bankName}
                      onChange={handleBankInputChange}
                      placeholder="e.g. State Bank of India / HDFC"
                      className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-slate-900 text-xs font-semibold outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label>Account Number</label>
                    <input
                      type="password"
                      name="accountNumber"
                      value={bankAccount.accountNumber}
                      onChange={handleBankInputChange}
                      placeholder="Enter account number"
                      className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-slate-900 text-xs font-bold tracking-wider outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label>Confirm Account Number</label>
                    <input
                      type="text"
                      name="confirmAccountNumber"
                      value={bankAccount.confirmAccountNumber}
                      onChange={handleBankInputChange}
                      placeholder="Re-enter account number"
                      className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-slate-900 text-xs font-bold tracking-wider outline-none"
                      onPaste={(e) => e.preventDefault()}
                      required
                    />
                    {bankAccount.confirmAccountNumber && bankAccount.accountNumber !== bankAccount.confirmAccountNumber && (
                      <p className="text-[10px] text-red-500 font-bold flex items-center gap-1">
                        <FiAlertCircle className="w-3 h-3" /> Account numbers do not match
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label>IFSC Code</label>
                    <input
                      type="text"
                      name="ifscCode"
                      value={bankAccount.ifscCode}
                      onChange={handleBankInputChange}
                      placeholder="e.g. SBIN0001234"
                      maxLength={11}
                      className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-slate-900 text-xs font-bold uppercase outline-none"
                      required
                    />
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={saveBankDetails}
                className="w-full py-3 bg-[#0B132B] hover:bg-slate-800 text-white rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer active:scale-95 shadow-md"
              >
                Save & Confirm Payout Details
              </button>
            </div>
          ) : (
            <div
              className="bg-blue-50/60 rounded-2xl p-4 border border-blue-100 relative cursor-pointer hover:border-blue-300 transition-all space-y-2.5"
              onClick={() => setShowBankForm(true)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                    {bankAccount.upiId && !bankAccount.accountNumber ? 'UPI Destination' : 'Bank Account'}
                  </span>
                  <p className="font-extrabold text-slate-900 text-sm">
                    {bankAccount.accountHolderName || bankAccount.upiId}
                  </p>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <FiCheckCircle className="w-3 h-3" /> Verified
                </span>
              </div>

              {bankAccount.accountNumber ? (
                <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-700">
                  <div>
                    <span className="text-[10px] text-slate-400 font-normal">Bank:</span>
                    <p className="font-bold">{bankAccount.bankName || 'Bank'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-normal">IFSC:</span>
                    <p className="font-bold uppercase">{bankAccount.ifscCode}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-400 font-normal">A/C:</span>
                    <p className="font-mono font-bold tracking-wider">
                      •••• •••• {bankAccount.accountNumber.slice(-4)}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs font-bold text-slate-800 font-mono">{bankAccount.upiId}</p>
              )}
            </div>
          )}
        </div>

        {/* ── Recent Activity / History ── */}
        {history.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <FiActivity className="text-slate-400 w-4 h-4" />
              <h3 className="font-extrabold text-slate-400 text-[10px] uppercase tracking-[0.2em]">
                Withdrawal Requests
              </h3>
            </div>
            <div className="space-y-2.5">
              {history.slice(0, 5).map((item) => (
                <div
                  key={item._id || item.id}
                  className="bg-white rounded-2xl p-4 shadow-2xs border border-slate-100 flex flex-col gap-1.5"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        item.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-700'
                          : item.status === 'rejected'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        <FiClock className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-black text-sm text-slate-900">₹{item.amount?.toLocaleString()}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">
                          {new Date(item.createdAt || item.requestDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                      item.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : item.status === 'rejected'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800 animate-pulse'
                    }`}>
                      {item.status === 'approved' ? '✓ Transferred' : item.status === 'rejected' ? '✕ Rejected' : '⏳ Processing'}
                    </span>
                  </div>

                  {item.transactionReference && (
                    <p className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-1 rounded-lg font-medium">
                      Bank Ref / UTR: <span className="font-bold">{item.transactionReference}</span>
                    </p>
                  )}
                  {item.rejectionReason && (
                    <p className="text-[10px] text-rose-800 bg-rose-50 px-2 py-1 rounded-lg font-medium">
                      Reason: {item.rejectionReason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Submit Action Button ── */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!amount || !!error || !isBankSaved || loading || grossAmount < 100 || grossAmount > wallet.available}
          className="w-full py-4 rounded-2xl font-black text-white text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-xl cursor-pointer"
          style={{
            background: `linear-gradient(135deg, ${themeColors.button}, #0f172a)`
          }}
        >
          {loading ? (
            <LogoLoader fullScreen={false} size="w-5 h-5" />
          ) : (
            <>
              <span>Confirm & Withdraw ₹{grossAmount.toLocaleString()}</span>
              <FiArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <p className="text-center text-[10.5px] text-slate-400 font-medium leading-relaxed px-4">
          Payouts are processed to your bank or UPI within 24-48 business hours.<br />
          TDS deduction certificates are available upon request.
        </p>
      </main>

      <BottomNav />
    </div>
  );
};

export default WithdrawalRequest;
