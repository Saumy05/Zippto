import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { FiUser, FiMail, FiPhone, FiArrowRight, FiChevronLeft, FiCheckCircle } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { normalizePhoneInput } from '../../../utils/phone';
import { themeColors } from '../../../theme';
import { userAuthService } from '../../../services/authService';
import Logo from '../../../components/common/Logo';
import LogoLoader from '../../../components/common/LogoLoader';
import useKeyboardVisible from '../../../hooks/useKeyboardVisible';

import { z } from "zod";

// Zod schema
const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").regex(/^[a-zA-Z\s]+$/, "Name can only contain letters"),
  email: z.string().optional().refine(val => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), "Invalid email address"),
  phoneNumber: z.string().regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit Indian phone number"),
});

const Signup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isKeyboardOpen = useKeyboardVisible();
  const [step, setStep] = useState('details'); // 'details' or 'otp'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: ''
  });
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpToken, setOtpToken] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Timer countdown effect
  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Refs for auto-focus
  const nameInputRef = useRef(null);
  const otpInputRefs = useRef([]);

  // Pre-fill from navigation state (Unified Flow)
  useEffect(() => {
    if (location.state?.phone && location.state?.verificationToken) {
      setFormData(prev => ({ ...prev, phoneNumber: location.state.phone }));
      setVerificationToken(location.state.verificationToken);
    }
  }, [location.state]);

  // Auto-focus logic
  useEffect(() => {
    if (step === 'details' && nameInputRef.current) {
      setTimeout(() => nameInputRef.current.focus(), 100);
    } else if (step === 'otp' && otpInputRefs.current[0]) {
      setTimeout(() => otpInputRefs.current[0].focus(), 100);
    }
  }, [step]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDetailsSubmit = async (e) => {
    e.preventDefault();

    // Zod Validation
    const validationResult = signupSchema.safeParse(formData);

    if (!validationResult.success) {
      toast.error(validationResult.error.issues[0].message);
      return;
    }

    setIsLoading(true);

    if (verificationToken) {
      try {
        const response = await userAuthService.register({
          name: formData.name,
          email: formData.email || null,
          verificationToken
        });
        if (response.success) {
          try {
            const { registerFCMToken } = await import('../../../services/pushNotificationService');
            await registerFCMToken('user', true);
          } catch (e) { console.error(e); }

          window.dispatchEvent(new Event('userLoggedIn'));
        window.dispatchEvent(new Event('userNotificationsChanged'));
          window.dispatchEvent(new Event('userNotificationsChanged'));

          toast.success(
            <div className="flex flex-col">
              <span className="font-bold">Welcome to Zippto!</span>
              <span className="text-xs">Your account has been created successfully.</span>
            </div>,
            { icon: <FiCheckCircle className="text-green-500" /> }
          );

          const fromTarget = location.state?.from;
          if (fromTarget) {
            if (typeof fromTarget === 'string') {
              navigate(fromTarget, { replace: true });
            } else if (fromTarget.pathname) {
              navigate(fromTarget.pathname, { state: fromTarget.state, replace: true });
            } else {
              navigate('/user', { replace: true });
            }
          } else {
            navigate('/user', { replace: true });
          }
        } else {
          toast.error(response.message || 'Registration failed');
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'Registration failed');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    try {
      const response = await userAuthService.sendOTP(formData.phoneNumber, formData.email || null);
      if (response.success) {
        setOtpToken(response.token);
        setIsLoading(false);
        setStep('otp');
        setResendTimer(120); // Start timer
        toast.success('OTP sent successfully');
      } else {
        setIsLoading(false);
        toast.error(response.message || 'Failed to send OTP');
      }
    } catch (error) {
      setIsLoading(false);
      toast.error(error.response?.data?.message || 'Failed to send OTP. Please try again.');
    }
  };

  const handleOtpChange = (index, value) => {
    const cleanValue = value.replace(/\D/g, '').slice(0, 1);
    const newOtp = [...otp];
    newOtp[index] = cleanValue;
    setOtp(newOtp);

    if (cleanValue && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!digits) return;
    e.preventDefault();
    setOtp(Array.from({ length: 6 }, (_, i) => digits[i] || ''));
    otpInputRefs.current[Math.min(digits.length, 6) - 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Auto-verify as last digit enters
  useEffect(() => {
    const otpValue = otp.join('');
    if (otpValue.length === 6 && !isLoading && otpToken) {
      handleOtpSubmit();
    }
  }, [otp]);

  const handleOtpSubmit = async (e) => {
    if (e) e.preventDefault();
    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      toast.error('Please enter complete OTP');
      return;
    }
    if (!otpToken) {
      toast.error('Please request OTP first');
      return;
    }
    setIsLoading(true);
    try {
      const response = await userAuthService.register({
        name: formData.name,
        email: formData.email || null,
        phone: formData.phoneNumber,
        otp: otpValue,
        token: otpToken
      });
      if (response.success) {
        setIsLoading(false);
        try {
          const { registerFCMToken } = await import('../../../services/pushNotificationService');
          await registerFCMToken('user', true);
        } catch (fcmError) {
          console.error('FCM Registration failed on signup:', fcmError);
        }

        window.dispatchEvent(new Event('userLoggedIn'));
        window.dispatchEvent(new Event('userNotificationsChanged'));

        toast.success(
          <div className="flex flex-col">
            <span className="font-bold">Welcome to Zippto!</span>
            <span className="text-xs">Account created successfully.</span>
          </div>,
          { icon: <FiCheckCircle className="text-green-500" /> }
        );

        const fromTarget = location.state?.from;
        if (fromTarget) {
          if (typeof fromTarget === 'string') {
            navigate(fromTarget, { replace: true });
          } else if (fromTarget.pathname) {
            navigate(fromTarget.pathname, { state: fromTarget.state, replace: true });
          } else {
            navigate('/user', { replace: true });
          }
        } else {
          navigate('/user', { replace: true });
        }
      } else {
        setIsLoading(false);
        toast.error(response.message || 'Registration failed');
      }
    } catch (error) {
      setIsLoading(false);
      toast.error(error.response?.data?.message || 'Registration failed. Please try again.');
    }
  };

  const brandColor = themeColors.brand?.teal || '#347989';

  return (
    <div className="h-[100dvh] min-h-[100dvh] bg-gray-50 flex flex-col justify-center py-2 sm:py-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden auth-screen-container">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#347989] opacity-[0.03] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#D68F35] opacity-[0.03] rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-2.5 sm:mb-5 relative z-10 animate-fade-in auth-header-wrapper">
        <div className={`flex justify-center transition-all duration-300 auth-logo-wrapper ${isKeyboardOpen ? 'hidden' : 'mb-2 sm:mb-3'}`}>
          <Logo className="h-12 w-12 sm:h-16 sm:w-auto transform hover:scale-105 transition-transform duration-300 mx-auto" />
        </div>
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">
          {step === 'details' ? 'Create Account' : 'Verify Phone'}
        </h2>
        <p className="mt-0.5 text-xs sm:text-sm text-gray-600 animate-stagger-1 animate-fade-in">
          {step === 'details' ? 'Join Zippto to start booking services' : `We've sent a 6-digit code to ${formData.phoneNumber}`}
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-0 relative z-10">
        <div className="bg-white py-4 sm:py-6 px-4 sm:px-8 shadow-xl shadow-gray-200/50 rounded-2xl border border-gray-100 relative overflow-hidden animate-slide-in-bottom auth-card">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#347989] via-[#D68F35] to-[#BB5F36]" />

          {step === 'details' ? (
            <form onSubmit={handleDetailsSubmit} className="space-y-3 sm:space-y-4">
              {verificationToken && (
                <button
                  type="button"
                  onClick={() => navigate('/user/login')}
                  className="flex items-center text-xs sm:text-sm text-gray-500 hover:text-[#347989] transition-colors mb-2 animate-fade-in cursor-pointer"
                >
                  <FiChevronLeft className="mr-0.5" /> Back to Login
                </button>
              )}

              <div className="animate-stagger-1 animate-fade-in">
                <label htmlFor="name" className="block text-xs sm:text-sm font-medium text-gray-700 mb-0.5">
                  Full Name
                </label>
                <div className="relative rounded-xl shadow-xs group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none group-focus-within:text-[#347989] transition-colors">
                    <FiUser className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-gray-400" />
                  </div>
                  <input
                    ref={nameInputRef}
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="block w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 border border-gray-300 rounded-xl text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-300 hover:border-gray-400"
                    placeholder="Enter your name"
                    style={{ '--tw-ring-color': brandColor }}
                  />
                </div>
              </div>

              <div className="animate-stagger-2 animate-fade-in">
                <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-gray-700 mb-0.5">
                  Email <span className="text-gray-400 text-[10px] sm:text-xs font-normal ml-1">(Optional)</span>
                </label>
                <div className="relative rounded-xl shadow-xs group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none group-focus-within:text-[#347989] transition-colors">
                    <FiMail className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="block w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 border border-gray-300 rounded-xl text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-300 hover:border-gray-400"
                    placeholder="you@example.com"
                    style={{ '--tw-ring-color': brandColor }}
                  />
                </div>
              </div>

              {!verificationToken && (
                <div className="animate-stagger-3 animate-fade-in">
                  <label htmlFor="phoneNumber" className="block text-xs sm:text-sm font-medium text-gray-700 mb-0.5">
                    Phone Number
                  </label>
                  <div className="relative rounded-xl shadow-xs group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none group-focus-within:text-[#347989] transition-colors">
                      <FiPhone className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-gray-400" />
                    </div>
                    <div className="absolute inset-y-0 left-9 sm:left-10 flex items-center pointer-events-none">
                      <span className="text-gray-500 font-medium border-r border-gray-300 pr-1.5 text-xs sm:text-sm">+91</span>
                    </div>
                    <input
                      id="phoneNumber"
                      name="phoneNumber"
                      type="tel"
                      autoComplete="tel-national"
                      required
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: normalizePhoneInput(e.target.value) }))}
                      className="block w-full pl-20 sm:pl-24 pr-4 py-2 sm:py-2.5 border border-gray-300 rounded-xl text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-300 hover:border-gray-400"
                      placeholder="9876543210"
                      style={{ '--tw-ring-color': brandColor }}
                    />
                  </div>
                </div>
              )}

              <div className="animate-stagger-4 animate-fade-in pt-1">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="group relative w-full flex justify-center py-2.5 sm:py-3.5 px-4 border border-transparent text-xs sm:text-sm font-bold rounded-xl text-white transition-all duration-500 shadow-md hover:shadow-lg hover:-translate-y-0.5 transform disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden cursor-pointer"
                  style={{
                    backgroundColor: brandColor,
                    boxShadow: `0 10px 15px -3px ${brandColor}4D`
                  }}
                >
                  <span className="absolute inset-0 w-full h-full bg-white/10 group-hover:translate-x-full transition-transform duration-700 -translate-x-full" />
                  {isLoading ? (
                    <LogoLoader fullScreen={false} inline={true} size="w-5 h-5" />
                  ) : (
                    <span className="flex items-center relative z-10">
                      {verificationToken ? 'Complete Registration' : 'Send OTP'}
                      <FiArrowRight className="ml-1.5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 sm:space-y-5">
              <button
                type="button"
                onClick={() => setStep('details')}
                className="flex items-center text-xs sm:text-sm text-gray-500 hover:text-[#347989] transition-colors mb-2 animate-fade-in cursor-pointer"
              >
                <FiChevronLeft className="mr-0.5" /> Edit details
              </button>

              <form onSubmit={handleOtpSubmit} className="space-y-4 sm:space-y-6">
                <div className="flex justify-between gap-1.5 sm:gap-3 animate-stagger-1 animate-fade-in">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (otpInputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      onPaste={handleOtpPaste}
                      className="w-full h-11 sm:h-14 text-center text-lg sm:text-xl font-bold border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-300 hover:border-gray-400"
                      style={{
                        '--tw-ring-color': brandColor,
                        caretColor: brandColor,
                        backgroundColor: digit ? `${brandColor}05` : 'white'
                      }}
                    />
                  ))}
                </div>

                <div className="text-center animate-stagger-2 animate-fade-in">
                  <button
                    type="button"
                    onClick={async () => {
                      if (resendTimer > 0) return;
                      try {
                        const response = await userAuthService.sendOTP(formData.phoneNumber, formData.email || null);
                        if (response.success) {
                          setOtpToken(response.token);
                          setResendTimer(120);
                          toast.success('New code sent!');
                        }
                      } catch (error) {
                        toast.error('Failed to resend code');
                      }
                    }}
                    disabled={resendTimer > 0}
                    className="text-xs sm:text-sm font-semibold hover:text-[#D68F35] transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    style={{ color: brandColor }}
                  >
                    {resendTimer > 0
                      ? `Resend in ${Math.floor(resendTimer / 60)}:${String(resendTimer % 60).padStart(2, '0')}`
                      : 'Resend code'}
                  </button>
                </div>

                <div className="animate-stagger-3 animate-fade-in">
                  <button
                    type="submit"
                    disabled={isLoading || otp.join('').length !== 6}
                    className="group relative w-full flex justify-center py-2.5 sm:py-3.5 px-4 border border-transparent text-xs sm:text-sm font-bold rounded-xl text-white transition-all duration-500 shadow-md hover:shadow-lg hover:-translate-y-0.5 transform disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden cursor-pointer"
                    style={{
                      backgroundColor: brandColor,
                      boxShadow: `0 10px 15px -3px ${brandColor}4D`
                    }}
                  >
                    <span className="absolute inset-0 w-full h-full bg-white/10 group-hover:translate-x-full transition-transform duration-700 -translate-x-full" />
                    {isLoading ? (
                      <LogoLoader fullScreen={false} inline={true} size="w-5 h-5" />
                    ) : (
                      <span className="flex items-center relative z-10">
                        Create Account
                        <FiArrowRight className="ml-1.5 group-hover:translate-x-1 transition-transform" />
                      </span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        <p className={`mt-3 sm:mt-5 text-center text-xs sm:text-sm text-gray-500 animate-fade-in auth-hide-on-keyboard ${isKeyboardOpen ? 'hidden' : 'block'}`}>
          Already have an account?{' '}
          <Link to="/user/login" className="font-semibold text-[#347989] hover:text-[#D68F35] transition-colors duration-300">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
