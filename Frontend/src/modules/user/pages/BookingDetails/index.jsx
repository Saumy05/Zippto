import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import useAppNotifications from '../../../../hooks/useAppNotifications';
import { themeColors } from '../../../../theme';
import { MdQrCode } from 'react-icons/md';
import { FaWhatsapp } from 'react-icons/fa';
import { HiSparkles, HiBadgeCheck } from 'react-icons/hi';
import {
  FiArrowLeft,
  FiMapPin,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiLoader,
  FiCalendar,
  FiDollarSign,
  FiPackage,
  FiPhone,
  FiMail,
  FiKey,
  FiStar,
  FiAward,
  FiX,
  FiUser,
  FiChevronRight,
  FiSearch,
  FiHome,
  FiAlertCircle,
  FiMessageSquare,
  FiNavigation,
  FiCopy,
  FiCheck,
  FiShield,
  FiFileText,
  FiShare2,
  FiCompass,
  FiPlus,
  FiMinus,
  FiCrosshair
} from 'react-icons/fi';
import { GoogleMap, useJsApiLoader, OverlayView } from '@react-google-maps/api';
import { bookingService } from '../../../../services/bookingService';
import { paymentService } from '../../../../services/paymentService';
import { cartService } from '../../../../services/cartService';
import RatingModal from '../../components/booking/RatingModal';
import PaymentVerificationModal from '../../components/booking/PaymentVerificationModal';
import { ConfirmDialog } from '../../../../components/common';
import ReviewCard from '../../components/booking/ReviewCard';
import NotificationBell from '../../components/common/NotificationBell';
import ChatDrawerModal from '../../../../components/chat/ChatDrawerModal';
import api from '../../../../services/api';

const toAssetUrl = (url) => {
  if (!url) return '';
  const clean = url.replace('/api/upload', '/upload');
  if (clean.startsWith('http')) return clean;
  const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/api$/, '');
  return `${base}${clean.startsWith('/') ? '' : '/'}${clean}`;
};

const mapLibraries = ['places', 'geometry'];

const silverMapStyles = [
  { "elementType": "geometry", "stylers": [{ "color": "#f8fafc" }] },
  { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#64748b" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#ffffff" }] },
  { "featureType": "administrative.land_parcel", "elementType": "labels.text.fill", "stylers": [{ "color": "#cbd5e1" }] },
  { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#f1f5f9" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#94a3b8" }] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#e2e8f0" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#ffffff" }] },
  { "featureType": "road.arterial", "elementType": "labels.text.fill", "stylers": [{ "color": "#64748b" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#e2e8f0" }] },
  { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{ "color": "#475569" }] },
  { "featureType": "road.local", "elementType": "labels.text.fill", "stylers": [{ "color": "#94a3b8" }] },
  { "featureType": "transit.line", "elementType": "geometry", "stylers": [{ "color": "#e2e8f0" }] },
  { "featureType": "transit.station", "elementType": "geometry", "stylers": [{ "color": "#f1f5f9" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#cbd5e1" }] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#94a3b8" }] }
];

const BookingDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(Boolean(location.pathname?.endsWith('/chat')));
  const [paying, setPaying] = useState(false);
  const [mapZoom, setMapZoom] = useState(15);
  const [detailMap, setDetailMap] = useState(null);

  const { isLoaded: isMapScriptLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: mapLibraries,
    language: localStorage.getItem('zippto_language') || 'en'
  });

  const destinationCoords = React.useMemo(() => {
    if (!booking?.address) return null;
    if (typeof booking.address === 'object' && booking.address.lat && booking.address.lng) {
      const lat = parseFloat(booking.address.lat);
      const lng = parseFloat(booking.address.lng);
      if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
        return { lat, lng };
      }
    }
    return null;
  }, [booking?.address]);

  const mapOptions = React.useMemo(() => ({
    disableDefaultUI: true,
    zoomControl: false,
    mapTypeId: 'roadmap',
    gestureHandling: 'greedy',
    rotateControl: false,
    tiltControl: false,
    mapTypeControl: false,
    mapTypeControlOptions: { mapTypeIds: [] },
    streetViewControl: false,
    fullscreenControl: false,
    styles: silverMapStyles
  }), []);

  const [copiedId, setCopiedId] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { }
  });

  const [supportInfo, setSupportInfo] = useState({
    email: 'help@zippto.in',
    phone: '+917879363299'
  });

  const socket = useAppNotifications();

  // Fetch support settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get('/public/config');
        if (response.data?.success && response.data?.settings) {
          const { supportEmail, supportPhone } = response.data.settings;
          setSupportInfo({
            email: supportEmail || 'help@zippto.in',
            phone: supportPhone || '+917879363299'
          });
        }
      } catch (error) {
        console.error('Failed to fetch support settings:', error);
      }
    };
    fetchSettings();
  }, []);

  // Function to load booking
  const loadBooking = async () => {
    try {
      const response = await bookingService.getById(id);
      if (response.success) {
        const data = { ...response.data };
        if (data.paymentMethod === 'plan_benefit') {
          if (!data.tax) data.tax = (data.basePrice || 0) * 0.18;
          if (!data.visitingCharges && !data.visitationFee) data.visitingCharges = 49;
        }
        setBooking(data);
      } else {
        toast.error(response.message || 'Booking not found');
        navigate('/user/my-bookings');
      }
    } catch (error) {
      console.warn('Failed to load booking:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadBooking();
    }
  }, [id, navigate]);

  // Auto-show rating modal ONLY when booking is fully completed AND paid
  useEffect(() => {
    if (booking) {
      const isCompleted = ['completed', 'work_done'].includes(booking.status?.toLowerCase());
      const isPaid = ['success', 'paid', 'collected_by_vendor'].includes(booking.paymentStatus?.toLowerCase());
      const isRated = !!booking.rating;
      const isDismissed = localStorage.getItem(`rating_dismissed_${id}`);

      if (isCompleted && isPaid && !isRated && !isDismissed) {
        setShowRatingModal(true);
      }
    }
  }, [booking, id]);

  // Handle Payment Modal Visibility - Auto-open on new payment request from vendor
  useEffect(() => {
    if (!booking) return;
    
    const isPaymentDone = booking.paymentStatus === 'success' || booking.cashCollected === true;
    const lastSeenOtp = sessionStorage.getItem(`last_seen_otp_${booking._id}`);
    const hasNewOtpRequest = booking.customerConfirmationOTP && booking.customerConfirmationOTP !== lastSeenOtp;
    const hasShown = sessionStorage.getItem(`payment_modal_shown_${booking._id}`);

    if (!isPaymentDone && (hasNewOtpRequest || (!hasShown && (booking.customerConfirmationOTP || booking.qrPaymentInitiated || booking.billGenerated || booking.status === 'awaiting_payment')))) {
      setShowPaymentModal(true);
      sessionStorage.setItem(`payment_modal_shown_${booking._id}`, 'true');
      if (booking.customerConfirmationOTP) {
        sessionStorage.setItem(`last_seen_otp_${booking._id}`, booking.customerConfirmationOTP);
      }
    } else if (booking.qrPaymentInitiated === false && booking.customerConfirmationOTP && !isPaymentDone) {
      setShowPaymentModal(true);
    } else if (isPaymentDone) {
      setShowPaymentModal(false);
    }
  }, [booking]);

  // Socket Listener for Real-time Updates
  useEffect(() => {
    if (socket && id) {
      const handleUpdate = (data) => {
        if (data.bookingId === id || data.relatedId === id || data.data?.bookingId === id) {
          setBooking(prev => {
            if (!prev) return prev;
            const newData = { ...prev, ...(data.data || data) };
            if (newData.paymentMethod === 'plan_benefit') {
              if (!newData.tax) newData.tax = (newData.basePrice || 0) * 0.18;
              if (!newData.visitingCharges && !newData.visitationFee) newData.visitingCharges = 49;
            }
            return newData;
          });

          if (data.billGenerated || data.payOnlineTriggered) {
            setShowPaymentModal(true);
            toast.success('Bill ready! You can now pay online.', { icon: '💳' });
          }

          loadBooking();

          if (data.message) {
            toast(data.message, { icon: '🔔' });
          }
        }
      };

      socket.on('booking_updated', handleUpdate);
      socket.on('bill_generated_pay_online', handleUpdate);
      socket.on('notification', handleUpdate);

      return () => {
        socket.off('booking_updated', handleUpdate);
        socket.off('bill_generated_pay_online', handleUpdate);
        socket.off('notification', handleUpdate);
      };
    }
  }, [socket, id]);

  const handleCopyId = () => {
    const bookingCode = booking.bookingNumber || booking._id?.slice(-8).toUpperCase();
    navigator.clipboard.writeText(bookingCode);
    setCopiedId(true);
    toast.success('Booking ID copied to clipboard!');
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCancelBooking = async () => {
    const journeyStarted = ['journey_started', 'visited', 'in_progress'].includes(booking.status?.toLowerCase());
    const cancellationFee = booking.visitingCharges || 49;

    const modalTitle = journeyStarted ? 'Cancellation Fee Applies' : 'Cancel Booking';
    const modalMessage = journeyStarted
      ? `The service agent has already started their journey. Cancelling now will incur a fee of ₹${cancellationFee}, which will be deducted from your wallet or refund amount. Do you want to proceed?`
      : 'Are you sure you want to cancel this booking? You will receive a full refund if applicable. This action cannot be undone.';

    setConfirmDialog({
      isOpen: true,
      title: modalTitle,
      message: modalMessage,
      type: 'danger',
      onConfirm: async () => {
        try {
          const response = await bookingService.cancel(booking._id || booking.id, 'Cancelled by user');
          if (response.success) {
            toast.success('Booking cancelled successfully');
            loadBooking();
          } else {
            toast.error(response.message || 'Failed to cancel booking');
          }
        } catch (error) {
          toast.error('Failed to cancel booking. Please try again.');
        }
      }
    });
  };

  const handleOnlinePayment = async () => {
    if (paying || !booking) return;

    try {
      setPaying(true);
      toast.loading('Creating payment order...');
      const orderResponse = await paymentService.createOrder(booking._id || booking.id);
      toast.dismiss();

      if (!orderResponse.success) {
        toast.error(orderResponse.message || 'Failed to create payment order');
        setPaying(false);
        return;
      }

      const orderData = orderResponse.data;

      if (orderData.isMock || !orderData.key || typeof window.Razorpay === 'undefined') {
        toast.loading('Verifying secure payment...');
        const verifyResponse = await paymentService.verifyPayment({
          razorpay_order_id: orderData.orderId,
          razorpay_payment_id: `pay_test_${Date.now()}`,
          razorpay_signature: 'test_signature'
        });
        toast.dismiss();

        if (verifyResponse.success) {
          toast.success('Payment completed successfully!', { icon: '🎉' });
          setShowPaymentModal(false);
          loadBooking();
        } else {
          toast.error('Payment verification failed');
        }
        setPaying(false);
        return;
      }

      const options = {
        key: orderData.key || import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: Math.round((orderData.amount || booking.finalAmount || 0) * 100),
        currency: orderData.currency || 'INR',
        order_id: orderData.orderId,
        name: 'Zippto',
        description: `Payment for ${booking.serviceName || 'Service'}`,
        handler: async function (response) {
          toast.loading('Verifying payment...');
          const verifyResponse = await paymentService.verifyPayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature
          });
          toast.dismiss();

          if (verifyResponse.success) {
            toast.success('Payment successful!', { icon: '🎉' });
            setShowPaymentModal(false);
            loadBooking();
          } else {
            toast.error('Payment verification failed');
          }
          setPaying(false);
        },
        modal: {
          ondismiss: function () {
            setPaying(false);
          }
        },
        prefill: {
          name: booking.userId?.name || 'Customer',
          contact: booking.userId?.phone || ''
        },
        theme: {
          color: "#0F766E"
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      toast.dismiss();
      console.error('Payment error:', error);
      toast.error('Failed to process payment');
      setPaying(false);
    }
  };

  const handlePayAtHome = async () => {
    try {
      toast.loading('Confirming request...');
      const response = await paymentService.confirmPayAtHome(booking._id || booking.id);
      toast.dismiss();

      if (response.success) {
        toast.success('Booking confirmed!');
        loadBooking();
      } else {
        toast.error(response.message || 'Failed to confirm booking');
      }
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to process request');
    }
  };

  const handleRateSubmit = async (ratingData) => {
    try {
      const response = await bookingService.addReview(booking._id || booking.id, ratingData);
      if (response.success) {
        toast.success('Thank you for your feedback!');
        setShowRatingModal(false);
        loadBooking();
      } else {
        toast.error(response.message || 'Failed to submit review');
      }
    } catch (error) {
      toast.error('Failed to submit review');
    }
  };

  const getAddressString = (address) => {
    if (typeof address === 'string') return address;
    if (address && typeof address === 'object') {
      return `${address.addressLine1 || ''}${address.addressLine2 ? `, ${address.addressLine2}` : ''}, ${address.city || ''}, ${address.state || ''} - ${address.pincode || ''}`;
    }
    return 'N/A';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] pb-32">
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200/80 px-4 py-3.5">
          <div className="max-w-xl mx-auto flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-slate-200 animate-pulse" />
            <div className="h-5 w-32 bg-slate-200 rounded animate-pulse" />
            <div className="w-9 h-9 rounded-xl bg-slate-200 animate-pulse" />
          </div>
        </header>
        <main className="max-w-xl mx-auto px-4 py-6 space-y-4">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 h-36 animate-pulse" />
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 h-28 animate-pulse" />
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 h-44 animate-pulse" />
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 h-56 animate-pulse" />
        </main>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-6">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center mx-auto mb-5 border border-slate-100">
            <FiSearch className="w-9 h-9 text-slate-400" />
          </div>
          <h2 className="text-lg font-black text-slate-900 mb-1">Booking Not Found</h2>
          <p className="text-xs text-slate-500 mb-6 font-medium">The requested booking could not be loaded or was removed.</p>
          <button
            onClick={() => navigate('/user/my-bookings')}
            className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all"
          >
            Go to My Bookings
          </button>
        </div>
      </div>
    );
  }

  // --- Calculations for Detailed Bill ---
  const isPlanBenefit = booking.paymentMethod === 'plan_benefit';
  const bill = booking.bill;
  const originalBase = bill ? (bill.originalServiceBase || 0) : (parseFloat(booking.basePrice) || 0);
  const allBillServices = bill?.services || [];
  const services = allBillServices.filter(s => !s.isOriginal);
  const originalServiceFromBill = allBillServices.find(s => s.isOriginal);
  const parts = bill?.parts || [];
  const customItems = bill?.customItems || [];

  let extraServiceBase = 0;
  let extraServiceGST = 0;
  services.forEach(s => {
    const qty = parseFloat(s.quantity) || 1;
    extraServiceBase += (parseFloat(s.price) || 0) * qty;
    extraServiceGST += parseFloat(s.gstAmount) || 0;
  });

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

  const originalGST = bill ? (bill.originalGST || 0) : (originalBase * 0.18);
  const totalGST = originalGST + extraServiceGST + partsGST;
  const hasBill = !!bill;
  const finalTotal = bill?.grandTotal || (booking.finalAmount || booking.totalAmount || 0);

  // Status Stepper Data
  const statusStr = (booking.status || '').toLowerCase();
  const isCancelled = ['cancelled', 'rejected'].includes(statusStr);
  const isCompleted = ['work_done', 'completed'].includes(statusStr);
  const isInTransit = ['journey_started', 'started'].includes(statusStr);
  const isAtLocation = ['visited', 'in_progress'].includes(statusStr);
  const isAssigned = ['assigned', 'confirmed'].includes(statusStr) || isInTransit || isAtLocation || isCompleted;

  let currentStepIndex = 1;
  if (isCompleted) currentStepIndex = 4;
  else if (isAtLocation || isInTransit) currentStepIndex = 3;
  else if (isAssigned) currentStepIndex = 2;
  else currentStepIndex = 1;

  const steps = [
    { label: 'Booked', icon: FiCheckCircle, desc: 'Slot Reserved' },
    { label: 'Assigned', icon: FiUser, desc: 'Partner Matched' },
    { label: isInTransit ? 'En Route' : 'At Doorstep', icon: isInTransit ? FiNavigation : FiMapPin, desc: isInTransit ? 'Live GPS' : 'Inspection' },
    { label: 'Done', icon: FiShield, desc: 'Verified & Closed' }
  ];

  const bookingCode = booking.bookingNumber || booking._id?.slice(-8).toUpperCase();
  const assignedPartner = booking.workerId || booking.assignedTo || booking.vendorId;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827] font-sans antialiased pb-32">
      {/* Background Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl -mr-20 -mt-20" />
        <div className="absolute bottom-1/3 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -ml-20" />
      </div>

      <div className="relative z-10">
        {/* Sticky Glassmorphic Top Header */}
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 shadow-2xs">
          <div className="max-w-xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/user/my-bookings')}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
                aria-label="Go back"
              >
                <FiArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-extrabold text-slate-900 tracking-tight leading-none">
                    Booking Details
                  </h1>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 font-semibold mt-0.5 group transition-colors"
                >
                  <span>ID: <strong className="font-mono text-slate-700">#{bookingCode}</strong></span>
                  {copiedId ? (
                    <FiCheck className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <FiCopy className="w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-colors" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <NotificationBell />
            </div>
          </div>
        </header>

        <main className="max-w-xl mx-auto px-4 pt-4 pb-6 space-y-4">

          {/* 1. UNIFIED LIVE STATUS HERO CARD & PROGRESS TRACKER */}
          {isCancelled ? (
            <div className="bg-white rounded-3xl p-5 border border-rose-200 shadow-sm flex items-center gap-3.5 bg-rose-50/50">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <FiXCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-rose-900">Booking Cancelled</h3>
                <p className="text-xs text-rose-600 font-medium mt-0.5">This service order has been cancelled.</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/80 relative overflow-hidden">
              {/* Header Status Row */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-500 text-white flex items-center justify-center shadow-md shadow-teal-500/20 shrink-0">
                    {isInTransit ? (
                      <FiNavigation className="w-5 h-5 animate-pulse" />
                    ) : isAtLocation ? (
                      <FiTool className="w-5 h-5" />
                    ) : isCompleted ? (
                      <FiCheckCircle className="w-5 h-5" />
                    ) : (
                      <FiCompass className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                        {booking.status?.replace('_', ' ').toUpperCase() || 'CONFIRMED'}
                      </span>
                    </div>
                    <h2 className="text-sm font-extrabold text-slate-900 mt-0.5">
                      {isCompleted
                        ? 'Service Completed Successfully'
                        : isInTransit
                        ? 'Expert is on the Way to Your Doorstep'
                        : isAtLocation
                        ? 'Expert Arrived & Working'
                        : assignedPartner
                        ? 'Service Confirmed & Partner Assigned'
                        : 'Finding Nearest Verified Partner...'}
                    </h2>
                  </div>
                </div>
              </div>

              {/* Modern 4-Step Interactive Stepper */}
              <div className="relative pt-2">
                {/* Connecting Background Rail */}
                <div className="absolute top-6 left-6 right-6 h-1 bg-slate-100 rounded-full z-0">
                  <div 
                    className="h-full bg-gradient-to-r from-teal-500 via-emerald-400 to-teal-500 rounded-full transition-all duration-700 shadow-xs"
                    style={{ width: `${((currentStepIndex - 1) / 3) * 100}%` }}
                  />
                </div>

                <div className="grid grid-cols-4 relative z-10">
                  {steps.map((step, idx) => {
                    const stepNum = idx + 1;
                    const isPassed = stepNum <= currentStepIndex;
                    const isCurrent = stepNum === currentStepIndex;
                    const StepIcon = step.icon;

                    return (
                      <div key={step.label} className="flex flex-col items-center text-center">
                        <div
                          className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                            isCurrent
                              ? 'bg-teal-600 text-white shadow-lg shadow-teal-500/30 ring-4 ring-teal-50 scale-110'
                              : isPassed
                              ? 'bg-emerald-500 text-white shadow-sm'
                              : 'bg-white text-slate-300 border-2 border-slate-200'
                          }`}
                        >
                          {isPassed && !isCurrent ? (
                            <FiCheck className="w-4 h-4 stroke-[3]" />
                          ) : (
                            <StepIcon className="w-4 h-4" />
                          )}
                        </div>
                        <span className={`text-[11px] font-extrabold mt-2 leading-tight ${isCurrent ? 'text-slate-900' : isPassed ? 'text-slate-700' : 'text-slate-400'}`}>
                          {step.label}
                        </span>
                        <span className="text-[9px] text-slate-400 font-semibold hidden sm:block">
                          {step.desc}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 2. VERIFIED SERVICE PARTNER / EXPERT CARD */}
          {assignedPartner && ['confirmed', 'assigned', 'journey_started', 'visited', 'in_progress', 'work_done'].includes(statusStr) && (
            <div className="bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/80">
              <div className="flex items-center justify-between mb-3.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Assigned Professional
                </span>
                {['journey_started', 'visited', 'in_progress'].includes(statusStr) && (
                  <button
                    type="button"
                    onClick={() => navigate(`/user/booking/${booking._id || booking.id}/track`)}
                    className="text-xs font-extrabold text-teal-600 hover:text-teal-700 flex items-center gap-1 bg-teal-50 px-2.5 py-1 rounded-xl border border-teal-100 transition-all cursor-pointer active:scale-95"
                  >
                    <span>Live GPS Map</span>
                    <FiChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3.5">
                {/* Avatar with Online Glow */}
                <div className="relative shrink-0">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-slate-100 to-slate-200 p-0.5 shadow-sm border border-slate-200 overflow-hidden">
                    {(assignedPartner?.profileImage || assignedPartner?.profilePhoto) ? (
                      <img
                        src={toAssetUrl(assignedPartner?.profileImage || assignedPartner?.profilePhoto)}
                        alt="Partner"
                        className="w-full h-full object-cover rounded-[14px]"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-full h-full rounded-[14px] bg-slate-900 text-white flex items-center justify-center font-black text-lg">
                        {(assignedPartner?.name || 'Z').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-white" title="Verified Online" />
                </div>

                {/* Name & Credentials */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-extrabold text-slate-900 text-base truncate">
                      {assignedPartner?.name || 'Verified Service Partner'}
                    </h3>
                    <HiBadgeCheck className="w-4.5 h-4.5 text-blue-500 shrink-0" title="Zippto Verified Pro" />
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 text-xs font-black px-2 py-0.5 rounded-lg border border-amber-200/60">
                      <FiStar className="w-3 h-3 text-amber-500 fill-current" />
                      {(assignedPartner?.rating || 0) > 0 ? Number(assignedPartner?.rating).toFixed(1) : '4.9'}
                    </span>
                    <span className="text-[11px] text-slate-500 font-semibold truncate">
                      • Doorstep Specialist
                    </span>
                  </div>
                </div>

                {/* Quick Contact Action Cluster */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsChatOpen(true)}
                    className="px-3.5 py-2.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-2xl flex items-center gap-1.5 text-xs font-extrabold border border-teal-200/80 transition-all active:scale-95 shadow-2xs cursor-pointer"
                    title="Chat with Expert"
                  >
                    <FiMessageSquare className="w-4 h-4 text-teal-600" />
                    <span>Chat</span>
                  </button>

                  {assignedPartner?.phone && (
                    <a
                      href={`tel:${assignedPartner.phone}`}
                      className="w-10 h-10 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200/80 flex items-center justify-center transition-all active:scale-95 shadow-2xs"
                      title="Call Expert"
                    >
                      <FiPhone className="w-4.5 h-4.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 3. DOORSTEP ARRIVAL VERIFICATION OTP CARD (If Active) */}
          {(booking.arrivalOTP || booking.visitOtp) && ['confirmed', 'assigned', 'journey_started'].includes(statusStr) && (
            <div className="bg-gradient-to-br from-[#0B132B] to-slate-900 rounded-3xl p-5 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                    <FiKey className="w-4.5 h-4.5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white">Start Work Verification PIN</h3>
                    <p className="text-[11px] text-slate-300 font-medium">Share with technician upon arrival</p>
                  </div>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </div>

              {/* Large Digital OTP Tiles */}
              <div className="flex justify-center gap-2.5 my-2">
                {String(booking.arrivalOTP || booking.visitOtp).split('').map((digit, idx) => (
                  <div
                    key={idx}
                    className="w-12 h-14 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center border-2 border-white/30 shadow-inner"
                  >
                    <span className="text-2xl font-black text-amber-300">{digit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. LUXURY SERVICE DESTINATION MAP CARD */}
          {booking.address && (
            <div className="bg-white rounded-3xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/80 overflow-hidden space-y-3">
              {/* Card Header Row */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center shrink-0 shadow-2xs">
                    <FiNavigation className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-900 tracking-tight">Service Destination Radar</h3>
                    <p className="text-[11px] text-slate-500 font-medium truncate max-w-[200px] sm:max-w-xs">
                      {typeof booking.address === 'object' ? (booking.address.city || booking.address.addressLine1 || 'Doorstep Location') : booking.address}
                    </p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Pin
                </span>
              </div>

              {/* Map Canvas Frame */}
              <div className="relative h-60 sm:h-64 w-full rounded-2xl overflow-hidden bg-slate-100 group border border-slate-200/60 shadow-inner">
                {(() => {
                  let dirUrl = 'https://maps.google.com';
                  let mapQuery = '';
                  if (destinationCoords) {
                    dirUrl = `https://www.google.com/maps/dir/?api=1&destination=${destinationCoords.lat},${destinationCoords.lng}`;
                    mapQuery = `${destinationCoords.lat},${destinationCoords.lng}`;
                  } else {
                    const addrStr = typeof booking.address === 'string'
                      ? booking.address
                      : `${booking.address?.addressLine1 || ''}, ${booking.address?.city || ''}`;
                    mapQuery = encodeURIComponent(addrStr);
                    dirUrl = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;
                  }

                  return (
                    <>
                      {isMapScriptLoaded && destinationCoords ? (
                        <GoogleMap
                          mapContainerStyle={{ width: '100%', height: '100%' }}
                          center={destinationCoords}
                          zoom={mapZoom}
                          onLoad={(mapInstance) => setDetailMap(mapInstance)}
                          options={mapOptions}
                        >
                          <OverlayView
                            position={destinationCoords}
                            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                          >
                            <div className="relative -translate-x-1/2 -translate-y-full flex flex-col items-center pointer-events-none">
                              <div className="relative z-10 w-9 h-9 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white shadow-xl shadow-teal-500/40 flex items-center justify-center border-2 border-white ring-2 ring-teal-500/20">
                                <FiMapPin className="w-4.5 h-4.5 text-white" />
                              </div>
                              <div className="w-2.5 h-2.5 bg-emerald-500 rotate-45 -mt-1 shadow-sm" />
                              <div className="w-10 h-10 rounded-full bg-teal-500/30 animate-ping absolute top-0.5" />
                            </div>
                          </OverlayView>
                        </GoogleMap>
                      ) : (
                        <iframe
                          key={mapZoom}
                          className="w-full h-full opacity-90 group-hover:opacity-100 transition-opacity"
                          frameBorder="0"
                          style={{ border: 0 }}
                          src={`https://maps.google.com/maps?q=${mapQuery}&z=${mapZoom}&output=embed`}
                          allowFullScreen
                          tabIndex="-1"
                          title="Doorstep Location"
                        />
                      )}

                      {/* Top Overlay Badges */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
                        <span className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl text-[11px] font-extrabold text-slate-800 shadow-md border border-white/80 flex items-center gap-1.5 pointer-events-auto">
                          <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                          Doorstep Pin
                        </span>

                        <a
                          href={dirUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-white/95 hover:bg-white backdrop-blur-md px-3 py-1.5 rounded-xl text-[11px] font-extrabold text-teal-700 hover:text-teal-800 shadow-md border border-white/80 flex items-center gap-1.5 pointer-events-auto transition-all active:scale-95 cursor-pointer"
                          title="Open in Google Maps"
                        >
                          <span>Get Directions</span>
                          <FiNavigation className="w-3.5 h-3.5 rotate-45" />
                        </a>
                      </div>

                      {/* Connected Glassmorphic Zoom Control Pill */}
                      <div className="absolute bottom-3 right-3 z-10 flex flex-col rounded-2xl bg-white/95 backdrop-blur-md shadow-lg border border-slate-200/90 overflow-hidden divide-y divide-slate-100 pointer-events-auto">
                        <button
                          type="button"
                          onClick={() => {
                            const nextZoom = Math.min(mapZoom + 1, 20);
                            setMapZoom(nextZoom);
                            if (detailMap) detailMap.setZoom(nextZoom);
                          }}
                          className="w-9 h-9 flex items-center justify-center text-slate-800 hover:bg-slate-50 active:scale-90 transition-all font-bold cursor-pointer hover:text-teal-700"
                          title="Zoom In"
                        >
                          <FiPlus className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const nextZoom = Math.max(mapZoom - 1, 4);
                            setMapZoom(nextZoom);
                            if (detailMap) detailMap.setZoom(nextZoom);
                          }}
                          className="w-9 h-9 flex items-center justify-center text-slate-800 hover:bg-slate-50 active:scale-90 transition-all font-bold cursor-pointer hover:text-teal-700"
                          title="Zoom Out"
                        >
                          <FiMinus className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Recenter Button on Bottom Left */}
                      {destinationCoords && (
                        <button
                          type="button"
                          onClick={() => {
                            if (detailMap && destinationCoords) {
                              detailMap.panTo(destinationCoords);
                              detailMap.setZoom(16);
                              setMapZoom(16);
                            }
                          }}
                          className="absolute bottom-3 left-3 z-10 w-9 h-9 rounded-2xl bg-white/95 hover:bg-white backdrop-blur-md text-slate-800 shadow-lg border border-slate-200/90 flex items-center justify-center active:scale-90 transition-all cursor-pointer hover:text-teal-700 pointer-events-auto"
                          title="Recenter Map"
                        >
                          <FiCrosshair className="w-4.5 h-4.5" />
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Live Tracking Trigger Bar */}
              {['confirmed', 'assigned', 'journey_started', 'in_progress'].includes(statusStr) && (
                <button
                  type="button"
                  onClick={() => navigate(`/user/booking/${booking._id || booking.id}/track`)}
                  className="w-full py-2.5 px-3.5 bg-slate-50 hover:bg-teal-50/70 border border-slate-200/70 hover:border-teal-200/80 rounded-2xl flex items-center justify-between text-xs transition-all active:scale-[0.99] group cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-teal-500/10 text-teal-700 flex items-center justify-center">
                      <FiNavigation className="w-3.5 h-3.5 group-hover:rotate-45 transition-transform" />
                    </div>
                    <span className="font-extrabold text-slate-700 group-hover:text-teal-900">
                      {isInTransit ? 'Track Expert’s Live Real-Time Route' : 'Open Live GPS Radar Tracker'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 font-black text-teal-700 text-[11px]">
                    <span>Track Live</span>
                    <FiChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              )}
            </div>
          )}

          {/* 5. DEDICATED DOORSTEP ADDRESS & APPOINTMENT SCHEDULE CARD */}
          <div className="bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/80 space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 border border-teal-100">
                <FiMapPin className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Service Doorstep Location
                </span>
                <p className="text-xs font-bold text-slate-800 leading-relaxed">
                  {getAddressString(booking.address)}
                </p>
              </div>
            </div>

            <div className="w-full h-px bg-slate-100" />

            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                <FiCalendar className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Scheduled Appointment
                </span>
                <p className="text-xs font-bold text-slate-800">
                  {formatDate(booking.scheduledDate)}
                </p>
                <span className="inline-block mt-1 text-[11px] font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                  ⏱ {booking.scheduledTime || booking.timeSlot?.start || 'ASAP Slot'}
                </span>
              </div>
            </div>
          </div>

          {/* 5. ITEMIZED ORDER & BILL BREAKDOWN */}
          <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/80 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <FiPackage className="w-4 h-4 text-teal-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">Order Summary</h3>
              </div>
              <span className="text-xs font-black text-slate-900">
                ₹{(finalTotal || 0).toLocaleString('en-IN')}
              </span>
            </div>

            <div className="p-5 space-y-4">
              {/* Category & Brand Header */}
              <div className="flex items-center justify-between pb-3 border-b border-dashed border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0 overflow-hidden">
                    {booking.categoryIcon ? (
                      <img src={booking.categoryIcon} alt="" className="w-6 h-6 object-contain" />
                    ) : (
                      <FiPackage className="w-5 h-5 text-teal-600" />
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Category</span>
                    <h4 className="text-xs font-bold text-slate-900">{booking.serviceCategory || booking.serviceName || 'Service'}</h4>
                  </div>
                </div>

                {booking.brandName && (
                  <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-xl">
                    {booking.brandName}
                  </span>
                )}
              </div>

              {/* Booked Items List */}
              {booking.bookedItems && booking.bookedItems.length > 0 && (
                <div className="space-y-2.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                    Booked Services ({booking.bookedItems.length})
                  </span>
                  {booking.bookedItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-slate-50/80 rounded-2xl p-3 border border-slate-100">
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <span className="text-xs font-black text-teal-700 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-100">
                          {item.quantity || 1}x
                        </span>
                        <div className="truncate">
                          <p className="text-xs font-bold text-slate-900 truncate">{item.card?.title || item.title || 'Service Item'}</p>
                          {item.card?.duration && <p className="text-[10px] text-slate-400 font-semibold">⏱ {item.card.duration}</p>}
                        </div>
                      </div>
                      <span className="text-xs font-black text-slate-900 shrink-0 font-mono">
                        ₹{((item.card?.price || item.price || 0) * (item.quantity || 1)).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Extra Billed Services & Parts (If Any) */}
              {hasBill && (services.length > 0 || parts.length > 0 || customItems.length > 0) && (
                <div className="pt-3 border-t border-dashed border-slate-200 space-y-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 block">
                    Extra On-Site Parts & Services Added
                  </span>
                  {services.map((s, i) => (
                    <div key={i} className="flex justify-between text-xs font-semibold text-slate-700">
                      <span>{s.name} <span className="text-slate-400">x{s.quantity}</span></span>
                      <span className="font-mono">₹{((parseFloat(s.price) || 0) * (parseFloat(s.quantity) || 1)).toFixed(2)}</span>
                    </div>
                  ))}
                  {parts.map((p, i) => (
                    <div key={i} className="flex justify-between text-xs font-semibold text-slate-700">
                      <span>{p.name} <span className="text-slate-400">x{p.quantity}</span></span>
                      <span className="font-mono">₹{((parseFloat(p.price) || 0) * (parseFloat(p.quantity) || 1)).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Price Calculation Summary */}
              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>Base Fare</span>
                  {isPlanBenefit ? (
                    <span className="text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.2 rounded">FREE (Plan Benefit)</span>
                  ) : (
                    <span className="font-mono">₹{originalBase.toFixed(2)}</span>
                  )}
                </div>

                <div className="flex justify-between text-slate-600 font-medium">
                  <span>Taxes & GST (18%)</span>
                  <span className="font-mono">₹{totalGST.toFixed(2)}</span>
                </div>

                {booking.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Discount Applied</span>
                    <span>-₹{booking.discount.toFixed(2)}</span>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                  <span className="text-sm font-extrabold text-slate-900">Total Payable</span>
                  <span className="text-xl font-black text-teal-700 font-mono">
                    ₹{finalTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Method Bar */}
            <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Payment Status</span>
              <span className={`px-2.5 py-1 rounded-xl text-xs font-extrabold uppercase ${
                ['success', 'collected_by_vendor', 'paid'].includes((booking.paymentStatus || '').toLowerCase())
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {['success', 'collected_by_vendor', 'paid'].includes((booking.paymentStatus || '').toLowerCase())
                  ? '✓ Paid'
                  : booking.paymentMethod === 'plan_benefit'
                  ? 'Plan Covered'
                  : 'Pending'}
              </span>
            </div>
          </div>

          {/* 6. ACTION & SUPPORT CLUSTER */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <a
              href={`tel:${supportInfo.phone}`}
              className="flex items-center justify-center gap-2 py-3.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-extrabold text-xs rounded-2xl transition-all active:scale-95 shadow-2xs"
            >
              <FiPhone className="w-4 h-4 text-teal-600" />
              <span>Call Helpline</span>
            </a>

            <a
              href={`mailto:${supportInfo.email}`}
              className="flex items-center justify-center gap-2 py-3.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-extrabold text-xs rounded-2xl transition-all active:scale-95 shadow-2xs"
            >
              <FiMail className="w-4 h-4 text-blue-600" />
              <span>Email Support</span>
            </a>

            {!isCancelled && !isCompleted && (
              <button
                type="button"
                onClick={handleCancelBooking}
                className="col-span-2 py-3.5 px-4 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 font-extrabold text-xs uppercase tracking-wider rounded-2xl transition-all active:scale-95 cursor-pointer"
              >
                Cancel Booking
              </button>
            )}
          </div>

          {/* Customer Reviews Section */}
          <ReviewCard
            booking={booking}
            onWriteReview={() => setShowRatingModal(true)}
          />
        </main>

        {/* Global Rating Modal */}
        <RatingModal
          isOpen={showRatingModal}
          onClose={() => {
            setShowRatingModal(false);
            localStorage.setItem(`rating_dismissed_${id}`, 'true');
          }}
          onSubmit={handleRateSubmit}
          bookingName={booking.serviceName || booking.serviceCategory || 'Service'}
          workerName={booking.workerId?.name || (booking.assignedTo?.name === 'You (Self)' ? 'Service Provider' : (booking.assignedTo?.name || 'Expert'))}
        />

        {/* Payment Verification Modal */}
        <PaymentVerificationModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          booking={booking}
          onPayOnline={handleOnlinePayment}
        />

        {/* Cancellation Confirmation Dialog */}
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
          onConfirm={confirmDialog.onConfirm}
          title={confirmDialog.title}
          message={confirmDialog.message}
          type={confirmDialog.type}
        />

        {/* Real-time In-App Chat Drawer */}
        <ChatDrawerModal
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          bookingId={booking._id || booking.id || id}
          bookingData={booking}
          userType="user"
        />
      </div>
    </div>
  );
};

export default BookingDetails;
