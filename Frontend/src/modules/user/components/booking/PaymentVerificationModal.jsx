import React, { useState, useEffect } from 'react';
import { FiCheckCircle, FiShield, FiAlertCircle, FiPackage, FiX, FiInfo, FiCopy, FiCheck, FiMessageSquare, FiPhone, FiCreditCard } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { configService } from '../../../../services/configService';
import { toast } from 'react-hot-toast';

const PaymentVerificationModal = ({ isOpen, onClose, booking, onPayOnline, onOpenChat }) => {
  const [isOnlinePaymentEnabled, setIsOnlinePaymentEnabled] = useState(true);
  const [configLoading, setConfigLoading] = useState(true);
  const [copiedOtp, setCopiedOtp] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await configService.getSettings();
        if (res.success && res.settings) {
          setIsOnlinePaymentEnabled(res.settings.isOnlinePaymentEnabled !== false);
        }
      } catch (error) {
        console.error('Error fetching payment config:', error);
      } finally {
        setConfigLoading(false);
      }
    };

    if (isOpen) {
      fetchConfig();
    }
  }, [isOpen]);

  if (!isOpen || !booking) return null;

  // --- 1. Total & Breakdown Calculations ---
  const isPlanBenefit = booking.paymentMethod === 'plan_benefit';
  const bill = booking.bill;

  // Base Logic (Services)
  const originalBase = bill ? (bill.originalServiceBase || 0) : (parseFloat(booking.basePrice) || 0);

  // Extra Services
  const allBillServices = bill?.services || [];
  const services = allBillServices.filter(s => !s.isOriginal);
  const originalServiceFromBill = allBillServices.find(s => s.isOriginal);

  let extraServiceBase = 0;
  let extraServiceGST = 0;

  services.forEach(s => {
    const qty = parseFloat(s.quantity) || 1;
    const base = (parseFloat(s.price) || 0) * qty;
    const gst = parseFloat(s.gstAmount) || 0;
    extraServiceBase += base;
    extraServiceGST += gst;
  });

  const totalServiceBase = originalBase + extraServiceBase;

  // Parts & Custom Items
  const parts = bill?.parts || [];
  const customItems = bill?.customItems || [];

  let partsBase = 0;
  let partsGST = 0;

  parts.forEach(p => {
    const qty = parseFloat(p.quantity) || 1;
    partsBase += ((parseFloat(p.price) || 0) * qty);
    partsGST += (parseFloat(p.gstAmount) || 0);
  });

  customItems.forEach(c => {
    const qty = parseFloat(c.quantity) || 1;
    partsBase += ((parseFloat(c.price) || 0) * qty);
    partsGST += (parseFloat(c.gstAmount) || 0);
  });

  // Tax Logic
  const originalGST = bill ? (bill.originalGST || 0) : (originalBase * 0.18);
  const totalGST = originalGST + extraServiceGST + partsGST;

  // Final Total
  const finalTotal = bill?.grandTotal || (booking.finalAmount || 0);
  const otpValue = booking.customerConfirmationOTP || booking.paymentOtp;

  // --- 2. Identity Helpers ---
  const categoryName = booking.serviceCategory || 'General';
  const brandName = booking.brandName || booking.bookedItems?.[0]?.sectionTitle || '';
  const serviceName = booking.serviceName || 'Service Request';

  const CategoryIcon = booking.categoryIcon ? (
    <img src={booking.categoryIcon} alt={categoryName} className="w-full h-full object-cover" />
  ) : (
    <span className="text-2xl font-black uppercase text-white">{categoryName.charAt(0)}</span>
  );

  const handleCopyOtp = () => {
    if (!otpValue) return;
    navigator.clipboard.writeText(otpValue);
    setCopiedOtp(true);
    toast.success('Code copied to clipboard!');
    setTimeout(() => setCopiedOtp(false), 2500);
  };

  const isPaid = ['success', 'paid', 'collected_by_vendor'].includes((booking.paymentStatus || '').toLowerCase()) || booking.cashCollected;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", bounce: 0.3 }}
          className="bg-white w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl relative max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="relative bg-slate-900 border-b border-slate-800 p-5 shrink-0">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
              title="Close modal"
            >
              <FiX className="w-5 h-5 text-white/80" />
            </button>

            <div className="flex flex-col items-center text-center mt-2">
              <div className="w-14 h-14 bg-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/30 mb-3 text-white overflow-hidden border-2 border-slate-800">
                {CategoryIcon}
              </div>
              <h3 className="text-white font-bold text-lg">
                {isPaid ? 'Payment Verified' : 'Payment Verification'}
              </h3>
              <p className="text-slate-400 text-xs mt-1">
                {isPaid ? 'Service order completed' : 'Review final bill & complete payment'}
              </p>
            </div>
          </div>

          <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
            {/* Booking Identity Card */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-5 relative overflow-hidden">
              <div className="flex flex-col gap-1 relative z-10">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-md">
                    {categoryName}
                  </span>
                  {brandName && (
                    <div className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                      {booking.brandIcon && <img src={booking.brandIcon} alt={brandName} className="w-3 h-3 object-contain" />}
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {brandName}
                      </span>
                    </div>
                  )}
                </div>
                <h4 className="text-lg font-bold text-slate-800 leading-tight">
                  {serviceName}
                </h4>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  ID: #{booking.bookingNumber || booking._id?.slice(-8).toUpperCase()}
                </p>
              </div>
              <FiPackage className="absolute -bottom-2 -right-2 w-16 h-16 text-slate-100 rotate-[-15deg] z-0" />
            </div>

            {/* Bill Details */}
            <div className="space-y-4">
              <div className="flex justify-between items-end border-b border-slate-100 pb-2">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Total Amount</p>
                  {isPlanBenefit && (
                    <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 mt-0.5">
                      Membership Plan Benefit
                    </span>
                  )}
                </div>
                <p className="text-3xl font-black text-slate-900 font-mono">
                  ₹{finalTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              </div>

              {/* 1. Services */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FiCheckCircle className="w-3.5 h-3.5 text-teal-500" />
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Services</span>
                </div>
                <div className="space-y-2 pl-1">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>{originalServiceFromBill?.name || booking.serviceName || 'Service'}</span>
                    {isPlanBenefit ? (
                      <div className="flex items-center gap-1.5">
                        <span className="line-through text-slate-400">₹{originalBase.toFixed(2)}</span>
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 rounded">FREE</span>
                      </div>
                    ) : (
                      <span className="font-medium font-mono">₹{originalBase.toFixed(2)}</span>
                    )}
                  </div>
                  {services.map((s, idx) => (
                    <div key={`s-${idx}`} className="flex justify-between text-xs text-slate-600">
                      <span>{s.name} <span className="text-slate-400">x{s.quantity}</span></span>
                      <span className="font-medium font-mono">₹{((parseFloat(s.price) || 0) * (parseFloat(s.quantity) || 1)).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-xs text-slate-500 border-t border-dashed border-slate-100 pt-1 mt-1">
                    <span>GST (18%)</span>
                    <span className="font-mono">₹{(originalGST + extraServiceGST).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-slate-800 pt-1">
                    <span>Total Service</span>
                    <span>₹{(totalServiceBase + originalGST + extraServiceGST).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* 2. Parts & Custom Items */}
              {(parts.length > 0 || customItems.length > 0) && (
                <div>
                  <div className="flex items-center gap-2 mb-2 mt-4">
                    <FiPackage className="w-3.5 h-3.5 text-orange-500" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Parts & Materials</span>
                  </div>
                  <div className="space-y-2 pl-1">
                    {parts.map((p, idx) => (
                      <div key={`p-${idx}`} className="flex justify-between text-xs text-slate-600">
                        <span>{p.name} <span className="text-slate-400">x{p.quantity}</span></span>
                        <span className="font-medium font-mono">₹{(p.price * p.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                    {customItems.map((c, idx) => (
                      <div key={`c-${idx}`} className="flex justify-between text-xs text-slate-600">
                        <div>
                          <span>{c.name || 'Custom Item'} <span className="text-slate-400">x{c.quantity}</span></span>
                          {c.hsnCode && <p className="text-[9px] text-slate-400">HSN: {c.hsnCode}</p>}
                        </div>
                        <span className="font-medium font-mono">₹{(c.price * c.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-xs text-slate-500 border-t border-dashed border-slate-100 pt-1 mt-1">
                      <span>GST (18%)</span>
                      <span className="font-mono">₹{partsGST.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold text-slate-800 pt-1">
                      <span>Total Parts</span>
                      <span>₹{(partsBase + partsGST).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Visiting Charges */}
              {(booking.visitingCharges > 0 || bill?.visitingCharges > 0) && (
                <div className="mt-4 pt-2 border-t border-slate-100">
                  <div className="flex justify-between text-xs font-bold text-slate-600">
                    <span className="flex items-center gap-2 uppercase tracking-wide">
                      <FiInfo className="w-3.5 h-3.5 text-blue-400" /> Visiting Charges
                    </span>
                    <span className="font-mono">₹{(bill?.visitingCharges || booking.visitingCharges || 0).toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* 4. Transport Charges */}
              {(bill?.transportCharges > 0) && (
                <div className="mt-2 pt-2 border-t border-slate-100">
                  <div className="flex justify-between text-xs font-bold text-slate-600">
                    <span className="flex items-center gap-2 uppercase tracking-wide">
                      <FiPackage className="w-3.5 h-3.5 text-blue-400" /> Transport Charges
                    </span>
                    <span className="font-mono">₹{(bill.transportCharges).toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Actions & Verification Section */}
            <div className="mt-8 space-y-3">
              {isPaid ? (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-emerald-500 shadow-sm shrink-0">
                    <FiCheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-emerald-900 font-bold text-sm">Payment Recorded</p>
                    <p className="text-emerald-700 text-xs">Thank you! Transaction verified and closed.</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Option A: Online Pay Button */}
                  {!configLoading && isOnlinePaymentEnabled && (
                    <button
                      onClick={onPayOnline}
                      className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer"
                    >
                      <FiCreditCard className="w-4 h-4 text-emerald-400" />
                      <span>Pay Online (UPI / Cards / NetBanking)</span>
                    </button>
                  )}

                  {/* Option B: Cash Collection OTP */}
                  {otpValue && (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center mt-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                          Cash Payment Verification PIN
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyOtp}
                          className="flex items-center gap-1 text-[10px] font-bold text-teal-700 hover:text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100 transition-colors"
                        >
                          {copiedOtp ? <FiCheck className="w-3 h-3 text-emerald-600" /> : <FiCopy className="w-3 h-3" />}
                          <span>{copiedOtp ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>

                      <div className="bg-white border-2 border-dashed border-emerald-300 rounded-xl py-2 px-4 inline-block my-1 shadow-inner">
                        <span className="text-3xl font-black font-mono text-emerald-700 tracking-[0.25em]">
                          {otpValue}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                        Share this 4-digit code with the professional <strong>only after</strong> paying in cash.
                      </p>
                    </div>
                  )}

                  {/* Billing Questions / Chat Quick Help */}
                  <div className="pt-2 flex justify-center">
                    <p className="text-[11px] text-slate-500 text-center">
                      Questions regarding the bill?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          if (onOpenChat) onOpenChat();
                        }}
                        className="font-bold text-teal-700 hover:underline cursor-pointer"
                      >
                        Chat with Technician
                      </button>
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PaymentVerificationModal;

