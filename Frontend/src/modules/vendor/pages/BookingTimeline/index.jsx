import React, { useState, useEffect, useLayoutEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiCheck, FiClock, FiUser, FiMapPin, FiTool, FiDollarSign, FiFileText, FiCheckCircle, FiX, FiNavigation } from 'react-icons/fi';
import { vendorTheme as themeColors } from '../../../../theme';
import Header from '../../components/layout/Header';
import BottomNav from '../../components/layout/BottomNav';
import { getBookingById, updateBookingStatus, startSelfJob, verifySelfVisit, completeSelfJob, collectSelfCash } from '../../services/bookingService';
import { CashCollectionModal, ConfirmDialog } from '../../components/common';
import WorkCompletionModal from '../../components/common/WorkCompletionModal';
import { toast } from 'react-hot-toast';

const BookingTimeline = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [currentStage, setCurrentStage] = useState(1);
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const [isWorkDoneModalOpen, setIsWorkDoneModalOpen] = useState(false);
  const [otpInput, setOtpInput] = useState(['', '', '', '']);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { }
  });

  useLayoutEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');
    const bgStyle = themeColors.backgroundGradient;

    if (html) html.style.background = bgStyle;
    if (body) body.style.background = bgStyle;
    if (root) root.style.background = bgStyle;
  }, []);

  useEffect(() => {
    const loadBooking = async () => {
      try {
        const response = await getBookingById(id);
        const apiData = response.data || response;

        const mappedBooking = {
          ...apiData,
          id: apiData._id || apiData.id,
          location: {
            address: apiData.address?.addressLine1 || apiData.location?.address || 'Address not available',
            lat: apiData.address?.lat || apiData.location?.lat,
            lng: apiData.address?.lng || apiData.location?.lng
          },
          status: apiData.status,
          timeline: [
            { stage: 1, timestamp: apiData.createdAt },
            { stage: 2, timestamp: apiData.acceptedAt },
            { stage: 3, timestamp: apiData.journeyStartedAt || apiData.startedAt },
            { stage: 4, timestamp: apiData.visitedAt },
            { stage: 5, timestamp: apiData.completedAt },
          ]
        };
        setBooking(mappedBooking);

        // Map status to progression stage
        const statusMap = {
          'requested': 1,
          'searching': 1,
          'confirmed': 2,
          'accepted': 2,
          'journey_started': 3,
          'visited': 4,
          'in_progress': 4,
          'work_done': 5,
          'completed': 6,
        };

        const stage = statusMap[apiData.status] || 2;
        setCurrentStage(stage);
      } catch (error) {
        console.error('Error loading booking:', error);
      }
    };

    loadBooking();

    const handleUpdate = () => {
      loadBooking();
    };

    window.addEventListener('vendorJobsUpdated', handleUpdate);
    return () => window.removeEventListener('vendorJobsUpdated', handleUpdate);
  }, [id]);

  /* Direct Service Partner Actions */
  const handleStartJourney = async () => {
    try {
      setActionLoading(true);
      await startSelfJob(id);
      toast.success('Journey started! Drive safely.');
      window.location.reload();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start journey');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyVisit = async () => {
    const otp = otpInput.join('');
    if (otp.length !== 4) {
      toast.error('Please enter complete 4-digit OTP');
      return;
    }

    try {
      setActionLoading(true);
      await verifySelfVisit(id, otp);
      toast.success('Arrival verified successfully!');
      setIsVisitModalOpen(false);
      window.location.reload();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid arrival OTP');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteWork = async (data) => {
    try {
      setActionLoading(true);
      await completeSelfJob(id, data);
      toast.success('Work marked as complete!');
      setIsWorkDoneModalOpen(false);
      window.location.reload();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete work');
    } finally {
      setActionLoading(false);
    }
  };

  const timelineStages = [
    {
      id: 1,
      title: 'Booking Requested',
      icon: FiClock,
      action: null,
      description: 'Booking request received from customer',
    },
    {
      id: 2,
      title: 'Booking Confirmed',
      icon: FiCheck,
      action: currentStage === 2 ? handleStartJourney : null,
      actionLabel: 'Start Journey',
      description: 'You confirmed and accepted the job',
    },
    {
      id: 3,
      title: 'Journey Started',
      icon: FiNavigation,
      action: currentStage === 3 ? () => setIsVisitModalOpen(true) : null,
      actionLabel: 'Verify Arrival (OTP)',
      description: 'En route to customer location',
    },
    {
      id: 4,
      title: 'Visited Site & Verified',
      icon: FiMapPin,
      action: currentStage === 4 ? () => setIsWorkDoneModalOpen(true) : null,
      actionLabel: 'Complete Service',
      description: 'Arrived on doorstep and OTP verified',
    },
    {
      id: 5,
      title: 'Work Done & Billing',
      icon: FiTool,
      action: (() => {
        if (booking?.status === 'completed' || booking?.status === 'COMPLETED' || booking?.paymentStatus === 'SUCCESS' || booking?.paymentStatus === 'paid') return null;
        if (currentStage === 5) return () => navigate(`/vendor/booking/${id}/billing`);
        return null;
      })(),
      actionLabel: 'Collect Payment',
      description: 'Service execution finished, collect settlement',
    },
    {
      id: 6,
      title: 'Job Completed',
      icon: FiCheckCircle,
      action: null,
      description: 'Booking fulfilled and payment settled',
    },
  ];

  // Auto-verify as last digit enters
  useEffect(() => {
    const otpValue = otpInput.join('');
    if (otpValue.length === 4 && !actionLoading && isVisitModalOpen) {
      handleVerifyVisit();
    }
  }, [otpInput]);

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return;
    const newOtp = [...otpInput];
    newOtp[index] = value;
    setOtpInput(newOtp);
    if (value && index < 3) document.getElementById(`otp-${index + 1}`).focus();
  };

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <p className="text-gray-500 font-semibold text-sm">Loading order timeline...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header title="Order Timeline" showBack={true} />

      <main className="max-w-xl mx-auto px-4 pt-4 space-y-4">
        {/* Booking Brief Card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-black text-gray-400 uppercase tracking-wider">
              #{booking.bookingNumber || booking._id?.slice(-6).toUpperCase()}
            </span>
            <h2 className="text-base font-extrabold text-gray-900 mt-0.5">
              {booking.serviceName || booking.serviceId?.title || 'Service Job'}
            </h2>
            <p className="text-xs text-gray-500 font-medium flex items-center gap-1 mt-1">
              <FiMapPin className="w-3.5 h-3.5 text-gray-400" />
              {booking.location?.address}
            </p>
          </div>
          <div className="text-right">
            <span className="text-sm font-black text-teal-700">
              ₹{booking.finalAmount || booking.userPayableAmount || 0}
            </span>
          </div>
        </div>

        {/* Stepper Timeline */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="relative pl-6 space-y-6 border-l-2 border-gray-100 ml-3">
            {timelineStages.map((stage) => {
              const isCompleted = currentStage > stage.id || booking.status === 'completed';
              const isCurrent = currentStage === stage.id && booking.status !== 'completed';
              const IconComp = stage.icon;

              return (
                <div key={stage.id} className="relative">
                  {/* Step Pin */}
                  <div
                    className={`absolute -left-[31px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${
                      isCurrent
                        ? 'bg-teal-600 border-teal-600 text-white ring-4 ring-teal-100 shadow-xs'
                        : isCompleted
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'bg-white border-gray-200 text-gray-300'
                    }`}
                  >
                    {isCompleted ? <FiCheck className="w-3.5 h-3.5" /> : <IconComp className="w-3 h-3" />}
                  </div>

                  <div>
                    <h3 className={`text-xs font-bold ${isCurrent ? 'text-teal-700' : isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                      {stage.title}
                    </h3>
                    <p className="text-[11px] text-gray-500 mt-0.5">{stage.description}</p>

                    {/* Action Button */}
                    {stage.action && (
                      <button
                        onClick={stage.action}
                        disabled={actionLoading}
                        className="mt-2 px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer disabled:opacity-50"
                      >
                        {actionLoading ? 'Processing...' : stage.actionLabel}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <BottomNav />

      {/* Arrival OTP Modal */}
      {isVisitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-extrabold text-sm text-gray-900">Verify Customer Arrival</h3>
              <button onClick={() => setIsVisitModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <FiX className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-4">Ask customer for the 4-digit arrival OTP.</p>
            <div className="flex gap-2 justify-center mb-4">
              {[0, 1, 2, 3].map((i) => (
                <input
                  key={i}
                  id={`otp-${i}`}
                  type="number"
                  value={otpInput[i]}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  className="w-11 h-12 border border-gray-200 rounded-xl text-center font-bold text-lg focus:outline-none focus:border-teal-600"
                  maxLength={1}
                />
              ))}
            </div>
            <button
              onClick={handleVerifyVisit}
              disabled={actionLoading}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer"
            >
              {actionLoading ? 'Verifying...' : 'Verify & Begin Work'}
            </button>
          </div>
        </div>
      )}

      {/* Work Completion Modal */}
      <WorkCompletionModal
        isOpen={isWorkDoneModalOpen}
        onClose={() => setIsWorkDoneModalOpen(false)}
        job={booking}
        onComplete={handleCompleteWork}
        loading={actionLoading}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
      />
    </div>
  );
};

export default BookingTimeline;
