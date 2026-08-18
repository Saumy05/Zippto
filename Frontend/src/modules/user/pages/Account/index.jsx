import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
  FiArrowLeft,
  FiUser,
  FiEdit3,
  FiClipboard,
  FiHeadphones,
  FiFileText,
  FiStar,
  FiMapPin,
  FiSettings,
  FiChevronRight,
  FiShoppingBag,
  FiLogOut,
  FiGift,
  FiShield,
  FiZap,
  FiCheckCircle,
  FiPlus,
  FiArrowUpRight,
  FiInfo,
  FiGlobe
} from 'react-icons/fi';
import { MdAccountBalanceWallet } from 'react-icons/md';
import { useLanguage } from '../../../../context/LanguageContext';
import { userAuthService } from '../../../../services/authService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import NotificationBell from '../../components/common/NotificationBell';

const Account = () => {
  const navigate = useNavigate();
  const { openLanguageModal } = useLanguage();
  const [userProfile, setUserProfile] = useState({
    name: 'Verified Customer',
    phone: '',
    email: '',
    isPhoneVerified: false,
    isEmailVerified: false,
    walletBalance: 0,
    plans: null,
    profilePhoto: ''
  });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user profile from database or localStorage fallback
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const storedUserData = localStorage.getItem('userData');
        if (storedUserData) {
          const userData = JSON.parse(storedUserData);
          setUserProfile({
            name: userData.name || 'Verified Customer',
            phone: userData.phone || '',
            email: userData.email || '',
            isPhoneVerified: userData.isPhoneVerified || false,
            isEmailVerified: userData.isEmailVerified || false,
            profilePhoto: userData.profilePhoto || '',
            walletBalance: userData.wallet?.balance ?? 0
          });
        }

        const response = await userAuthService.getProfile();
        if (response.success && response.user) {
          setUserProfile({
            name: response.user.name || 'Verified Customer',
            phone: response.user.phone || '',
            email: response.user.email || '',
            isPhoneVerified: response.user.isPhoneVerified || false,
            isEmailVerified: response.user.isEmailVerified || false,
            profilePhoto: response.user.profilePhoto || '',
            walletBalance: response.user.wallet?.balance ?? 0,
            plans: response.user.plans
          });
        }
      } catch (error) {
        console.warn('Using offline account profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const formatPhoneNumber = (phone) => {
    if (!phone) return '+91 7389279971';
    if (phone.startsWith('+91')) return phone;
    if (phone.length === 10) return `+91 ${phone}`;
    return phone;
  };

  const getInitials = () => {
    if (userProfile.name && userProfile.name !== 'Verified Customer') {
      const names = userProfile.name.split(' ');
      if (names.length >= 2) {
        return (names[0][0] + names[1][0]).toUpperCase();
      }
      return names[0][0].toUpperCase();
    }
    if (userProfile.phone) {
      return userProfile.phone.slice(-2);
    }
    return 'TU';
  };

  const handleLogout = async () => {
    try {
      await userAuthService.logout();
    } catch (e) {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userData');
      toast.success('Logged out successfully');
      navigate('/user/login');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <LoadingSpinner />
      </div>
    );
  }

  // Generic Reusable Menu Card Item Component
  const MenuItem = ({ icon: Icon, title, subtitle, onClick, iconBg = "bg-slate-100", iconColor = "text-slate-700", badge }) => (
    <motion.button
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="w-full flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all group"
    >
      <div className="flex items-center gap-3.5">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg} ${iconColor} shrink-0 group-hover:scale-105 transition-transform`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="text-left">
          <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug flex items-center gap-1.5">
            {title}
            {badge && (
              <span className="px-1.5 py-0.2 bg-amber-100 text-amber-700 text-[9px] font-black uppercase rounded-full">
                {badge}
              </span>
            )}
          </h4>
          {subtitle && <p className="text-[11px] text-slate-500 font-medium">{subtitle}</p>}
        </div>
      </div>
      <FiChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all shrink-0" />
    </motion.button>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827] font-sans antialiased pb-28">
      {/* Dynamic Background Glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl -mr-20 -mt-20" />
        <div className="absolute top-1/3 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -ml-20" />
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
                  Account
                </h1>
                <span className="text-[10px] text-slate-500 font-semibold">Profile & Settings</span>
              </div>
            </div>
            <NotificationBell />
          </div>
        </header>

        {/* Main Content Container */}
        <main className="max-w-4xl mx-auto px-4 pt-5 space-y-6">
          
          {/* HERO USER PROFILE CARD */}
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0B132B] via-[#1C2541] to-[#0B132B] p-5 sm:p-6 text-white shadow-lg border border-slate-800">
            {/* Ambient Backdrops */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 text-center sm:text-left">
              
              {/* Profile Avatar */}
              <div className="relative shrink-0">
                <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl p-1 bg-gradient-to-tr from-amber-400 via-amber-300 to-amber-500 shadow-md">
                  {userProfile.profilePhoto ? (
                    <img
                      src={userProfile.profilePhoto}
                      alt={userProfile.name}
                      className="w-full h-full rounded-[14px] object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-[14px] bg-[#0B132B] flex items-center justify-center text-amber-400 font-black text-2xl tracking-wider">
                      {getInitials()}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => navigate('/user/update-profile')}
                  className="absolute -bottom-1 -right-1 p-1.5 bg-amber-400 text-[#0B132B] rounded-lg border-2 border-[#0B132B] shadow-md hover:scale-105 active:scale-95 transition-all"
                  aria-label="Edit Profile Photo"
                >
                  <FiEdit3 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* User Info & Quick Action */}
              <div className="flex-1 space-y-1.5 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">
                        {userProfile.name}
                      </h2>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 text-[10px] font-bold shrink-0">
                        <FiCheckCircle className="w-3 h-3" /> Verified
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-300 font-semibold mt-0.5">
                      {formatPhoneNumber(userProfile.phone)}
                    </p>
                    {userProfile.email && (
                      <p className="text-xs text-slate-400 font-medium truncate">
                        {userProfile.email}
                      </p>
                    )}
                  </div>

                  {/* Edit Profile Button */}
                  <button
                    onClick={() => navigate('/user/update-profile')}
                    className="self-center sm:self-start px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-extrabold text-xs tracking-wider uppercase backdrop-blur-md transition-all active:scale-95"
                  >
                    Edit Profile
                  </button>
                </div>
              </div>

            </div>
          </section>

          {/* 2-COLUMN METRICS (BALANCE & REWARDS) */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Wallet Balance Card */}
            <div
              onClick={() => navigate('/user/wallet')}
              className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all cursor-pointer group flex items-center justify-between"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <MdAccountBalanceWallet className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
                    Zippto Wallet
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-xl font-black text-slate-900">
                      ₹{Math.abs(userProfile.walletBalance || 0).toLocaleString('en-IN')}
                    </span>
                    {userProfile.walletBalance < 0 && (
                      <span className="text-xs font-bold text-red-500">(Penalty)</span>
                    )}
                  </div>
                </div>
              </div>
              <button className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-slate-900 group-hover:text-white text-slate-700 flex items-center justify-center transition-colors">
                <FiPlus className="w-4 h-4" />
              </button>
            </div>

            {/* Refer & Earn Rewards Card */}
            <div
              onClick={() => navigate('/user/rewards')}
              className="bg-gradient-to-r from-[#0B132B] to-[#1C2541] text-white rounded-2xl p-4 shadow-xs hover:shadow-md transition-all cursor-pointer group flex items-center justify-between relative overflow-hidden"
            >
              <div className="flex items-center gap-3.5 relative z-10">
                <div className="w-11 h-11 rounded-xl bg-amber-400/20 text-amber-400 border border-amber-400/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <FiGift className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                    Rewards & Offers
                  </span>
                  <p className="text-sm font-black text-white mt-0.5 leading-snug">
                    Refer & Earn ₹100
                  </p>
                </div>
              </div>
              <FiArrowUpRight className="w-5 h-5 text-amber-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform relative z-10" />
            </div>
          </section>

          {/* ACTIVE MEMBERSHIP PLAN CARD */}
          {userProfile.plans && userProfile.plans.isActive ? (
            <section
              onClick={() => navigate('/user/my-plan')}
              className="relative overflow-hidden rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-md cursor-pointer group"
            >
              <div className="flex items-center justify-between relative z-10">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-white/90">
                    <FiShield className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      Active Membership
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white">{userProfile.plans.name}</h3>
                  <p className="text-xs text-white/90 font-medium">
                    Valid until {new Date(userProfile.plans.expiry).toLocaleDateString()}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white group-hover:rotate-12 transition-transform">
                  <FiZap className="w-6 h-6 fill-white" />
                </div>
              </div>
            </section>
          ) : (
            <section
              onClick={() => navigate('/user/my-plan')}
              className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between cursor-pointer group hover:bg-amber-500/15 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                  <FiZap className="w-5 h-5 fill-white" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900">
                    Join Zippto Plus Membership
                  </h4>
                  <p className="text-[11px] text-slate-600 font-medium">
                    Save up to 15% on every booking & priority technician dispatch
                  </p>
                </div>
              </div>
              <FiChevronRight className="w-5 h-5 text-slate-500 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </section>
          )}

          {/* CATEGORIZED MENU NAVIGATION GROUPS */}

          {/* GROUP 1: SHOPPING & SERVICES */}
          <section className="space-y-2.5">
            <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest px-1">
              Shopping & Services
            </h3>
            <div className="grid grid-cols-1 gap-2.5">
              <MenuItem
                icon={FiShoppingBag}
                title="Scrap Deals"
                subtitle="Sell recyclable scrap with instant doorstep pickup & weight verification"
                onClick={() => navigate('/user/scrap')}
                iconBg="bg-amber-50"
                iconColor="text-amber-600"
              />
              <MenuItem
                icon={FiFileText}
                title="My Plans & Subscriptions"
                subtitle="Manage active Zippto protection plans and service passes"
                onClick={() => navigate('/user/my-plan')}
                iconBg="bg-blue-50"
                iconColor="text-blue-600"
              />
            </div>
          </section>

          {/* GROUP 2: ACTIVITY & HISTORY */}
          <section className="space-y-2.5">
            <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest px-1">
              Activity & History
            </h3>
            <div className="grid grid-cols-1 gap-2.5">
              <MenuItem
                icon={FiClipboard}
                title="My Bookings"
                subtitle="View active bookings, past service history & track technicians"
                onClick={() => navigate('/user/my-bookings')}
                iconBg="bg-emerald-50"
                iconColor="text-emerald-600"
              />
              <MenuItem
                icon={FiStar}
                title="My Ratings & Reviews"
                subtitle="Feedback and ratings submitted for completed services"
                onClick={() => navigate('/user/my-rating')}
                iconBg="bg-purple-50"
                iconColor="text-purple-600"
              />
            </div>
          </section>

          {/* GROUP 3: PREFERENCES & ADDRESSES */}
          <section className="space-y-2.5">
            <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest px-1">
              Preferences & Addresses
            </h3>
            <div className="grid grid-cols-1 gap-2.5">
              <MenuItem
                icon={FiGlobe}
                title="App Language / भाषा"
                subtitle="English, हिन्दी, मराठी, ગુજરાતી, தமிழ், తెలుగు..."
                onClick={openLanguageModal}
                iconBg="bg-teal-50"
                iconColor="text-teal-600"
              />
              <MenuItem
                icon={FiMapPin}
                title="Manage Saved Addresses"
                subtitle="Add or edit doorstep service locations (Home, Office, Relatives)"
                onClick={() => navigate('/user/manage-addresses')}
                iconBg="bg-rose-50"
                iconColor="text-rose-600"
              />
              <MenuItem
                icon={FiSettings}
                title="Account Settings"
                subtitle="App preferences, security, and notification controls"
                onClick={() => navigate('/user/settings')}
                iconBg="bg-slate-100"
                iconColor="text-slate-700"
              />
            </div>
          </section>

          {/* GROUP 4: SUPPORT & ABOUT */}
          <section className="space-y-2.5">
            <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest px-1">
              Support & Information
            </h3>
            <div className="grid grid-cols-1 gap-2.5">
              <MenuItem
                icon={FiHeadphones}
                title="Help & Support"
                subtitle="24/7 customer care, booking FAQs & raise support ticket"
                onClick={() => navigate('/user/help-support')}
                iconBg="bg-sky-50"
                iconColor="text-sky-600"
              />
              <MenuItem
                icon={FiInfo}
                title="About Zippto Home Services"
                subtitle="Company details, terms & privacy policies"
                onClick={() => navigate('/user/about-homestr')}
                iconBg="bg-[#0B132B]/10"
                iconColor="text-[#0B132B]"
              />
            </div>
          </section>

          {/* LOGOUT BUTTON SECTION */}
          <section className="pt-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-extrabold text-xs uppercase tracking-wider rounded-2xl transition-colors active:scale-98 shadow-2xs"
            >
              <FiLogOut className="w-4 h-4" />
              <span>Log Out of Zippto Account</span>
            </button>
          </section>

          {/* FOOTER APP VERSION */}
          <div className="text-center pt-2 pb-6">
            <p className="text-[11px] font-bold text-slate-400 tracking-wide">
              ZIPPTO APP v2.4.0 • BUILT FOR SPEED & TRUST
            </p>
          </div>

        </main>
      </div>
    </div>
  );
};

export default Account;
