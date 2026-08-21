import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  FiCopy, 
  FiCheck, 
  FiArrowLeft, 
  FiGift, 
  FiShare2, 
  FiUsers, 
  FiDollarSign, 
  FiClock, 
  FiChevronRight,
  FiCheckCircle,
  FiAlertCircle
} from 'react-icons/fi';
import { FaWhatsapp, FaFacebookMessenger } from 'react-icons/fa';
import { themeColors } from '../../../../theme';
import referralService from '../../../../services/referralService';
import { useSettings } from '../../../../context/SettingsContext';
import LogoLoader from '../../../../components/common/LogoLoader';

const Rewards = () => {
  const navigate = useNavigate();
  const { isReferralEnabled: globalReferralEnabled, referralRewardAmount: globalRewardAmount } = useSettings();
  const [loading, setLoading] = useState(true);
  const [referralData, setReferralData] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  
  // Apply code input state
  const [inputCode, setInputCode] = useState('');
  const [applying, setApplying] = useState(false);

  const fetchReferralDetails = async () => {
    try {
      setLoading(true);
      const res = await referralService.getReferralInfo();
      if (res.success) {
        setReferralData(res.data);
      }
    } catch (err) {
      console.error('Fetch referral details error:', err);
      toast.error('Failed to load referral details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferralDetails();
  }, []);

  const isProgramActive = (referralData?.isReferralEnabled !== undefined ? referralData.isReferralEnabled : globalReferralEnabled) !== false;
  const referralCode = referralData?.referralCode || 'ZIP-REWARDS';
  const referralLink = referralData?.referralLink || `${window.location.origin}/signup?ref=${referralCode}`;
  const rewardAmount = referralData?.rewardPerReferral || globalRewardAmount || 50;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode).then(() => {
      setCopiedCode(true);
      toast.success('Referral code copied to clipboard!');
      setTimeout(() => setCopiedCode(false), 2000);
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopiedLink(true);
      toast.success('Referral link copied to clipboard!');
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  const handleShareWhatsApp = () => {
    const text = `Hey! Use my referral code *${referralCode}* on Zippto to book trusted home and appliance services. You will get ₹${rewardAmount} in your wallet after your first booking!\n\nSign up here: ${referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Invite & Earn on Zippto',
          text: `Use my code ${referralCode} to get ₹${rewardAmount} bonus on your first Zippto service booking!`,
          url: referralLink
        });
      } catch (err) {
        // User cancelled share
      }
    } else {
      handleCopyLink();
    }
  };

  const handleApplyReferral = async (e) => {
    e.preventDefault();
    if (!inputCode.trim()) {
      toast.error('Please enter a referral code');
      return;
    }

    try {
      setApplying(true);
      const res = await referralService.applyReferralCode(inputCode.trim());
      if (res.success) {
        toast.success(res.data?.message || 'Referral code applied successfully!');
        setInputCode('');
        fetchReferralDetails();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to apply referral code');
    } finally {
      setApplying(false);
    }
  };

  if (loading) return <LogoLoader />;

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Top Header */}
      <div className="bg-white sticky top-0 z-40 border-b border-slate-100 px-4 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors active:scale-95"
            aria-label="Go Back"
          >
            <FiArrowLeft className="w-5 h-5 text-slate-800" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
              <FiGift className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-black text-slate-900 leading-tight">Refer & Earn</h1>
              <p className="text-[11px] font-medium text-slate-500">Invite friends, earn wallet cash</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate('/user/wallet')}
          className="text-xs font-bold text-teal-600 bg-teal-50 px-3 py-1.5 rounded-full hover:bg-teal-100 transition-colors flex items-center gap-1.5"
        >
          <FiDollarSign className="w-3.5 h-3.5" />
          Wallet
        </button>
      </div>

      <main className="max-w-xl mx-auto px-4 pt-4 space-y-4">
        {/* Paused Program Notice */}
        {!isProgramActive && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <FiAlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold text-amber-900">Referral Program is Temporarily Paused</h3>
              <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                New invites and referral applications are currently paused by administration. All previously earned wallet balances remain 100% active and usable on your bookings.
              </p>
            </div>
          </div>
        )}

        {/* Hero Banner Card */}
        <div 
          className="rounded-3xl p-6 text-white relative overflow-hidden shadow-xl"
          style={{
            background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 50%, #14b8a6 100%)'
          }}
        >
          {/* Decorative Glow */}
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-teal-400/20 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-[11px] font-bold text-teal-100 mb-3 border border-white/20">
              <span>🎁</span> Unlimited Rewards Program
            </div>
            <h2 className="text-2xl font-black tracking-tight leading-snug">
              Earn ₹{rewardAmount} for every friend you invite
            </h2>
            <p className="mt-2 text-xs text-teal-50/90 leading-relaxed max-w-sm">
              Your friend gets <span className="font-black text-yellow-300">₹{rewardAmount}</span> welcome bonus on their 1st booking, and you get <span className="font-black text-yellow-300">₹{rewardAmount}</span> instantly in your wallet!
            </p>

            {/* Metrics Ribbon */}
            <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-white/15">
              <div className="bg-black/15 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
                <span className="text-[10px] font-bold text-teal-200 uppercase tracking-wider block">Total Earned</span>
                <span className="text-xl font-black text-white mt-0.5 block">₹{referralData?.totalEarned || 0}</span>
              </div>
              <div className="bg-black/15 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
                <span className="text-[10px] font-bold text-teal-200 uppercase tracking-wider block">Friends Rewarded</span>
                <span className="text-xl font-black text-white mt-0.5 block">{referralData?.successfulCount || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Unique Referral Code Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider block mb-2">
            Your Exclusive Referral Code
          </label>
          
          <div className="flex items-center gap-2 bg-slate-50 rounded-2xl p-2 border border-slate-200/80">
            <div className="flex-1 px-3 py-1 font-mono text-lg font-black text-slate-800 tracking-wider">
              {referralCode}
            </div>
            <button
              onClick={handleCopyCode}
              className="px-4 py-2.5 bg-white text-teal-700 font-bold text-xs rounded-xl shadow-xs border border-slate-200 hover:bg-teal-50 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
            >
              {copiedCode ? <FiCheck className="w-4 h-4 text-green-600" /> : <FiCopy className="w-4 h-4" />}
              {copiedCode ? 'Copied' : 'Copy Code'}
            </button>
          </div>

          {/* Quick Share Actions */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <button
              onClick={handleShareWhatsApp}
              className="py-3 px-4 bg-[#25D366] text-white font-bold text-xs rounded-xl shadow-sm hover:bg-[#20bd5a] transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
            >
              <FaWhatsapp className="w-4 h-4" />
              Share on WhatsApp
            </button>
            <button
              onClick={handleNativeShare}
              className="py-3 px-4 bg-slate-900 text-white font-bold text-xs rounded-xl shadow-sm hover:bg-slate-800 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
            >
              <FiShare2 className="w-4 h-4" />
              Share Invite Link
            </button>
          </div>
        </div>

        {/* Apply Friend's Referral Code Card (If not yet applied) */}
        {referralData?.canApplyReferral && (
          <div className="bg-white rounded-2xl p-5 border border-amber-100 shadow-sm bg-gradient-to-br from-amber-50/40 to-orange-50/30">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <FiGift className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-black text-slate-900">Have a Friend's Referral Code?</h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Apply their code now to claim your ₹{rewardAmount} wallet bonus after your first service!
                </p>
                <form onSubmit={handleApplyReferral} className="mt-3 flex items-center gap-2">
                  <input
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    placeholder="e.g. ZIP-8K2A1"
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 uppercase focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="submit"
                    disabled={applying || !inputCode.trim()}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition-all disabled:opacity-50 active:scale-95 cursor-pointer"
                  >
                    {applying ? 'Applying...' : 'Apply'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* How It Works Step-by-Step */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <h3 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
            <span>⚡</span> How the Referral Reward Works
          </h3>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-teal-50 text-teal-700 font-black text-xs flex items-center justify-center shrink-0 border border-teal-100">
                1
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-bold text-slate-800">Share Your Invite Link</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Send your referral link or code to friends and family via WhatsApp or message.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-teal-50 text-teal-700 font-black text-xs flex items-center justify-center shrink-0 border border-teal-100">
                2
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-bold text-slate-800">Friend Books a Service</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Your friend signs up and books any service on Zippto.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-teal-50 text-teal-700 font-black text-xs flex items-center justify-center shrink-0 border border-teal-100">
                3
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-bold text-slate-800">Both Get ₹{rewardAmount} Instantly</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Once the service is completed, ₹{rewardAmount} is automatically deposited into both of your wallets!</p>
              </div>
            </div>
          </div>
        </div>

        {/* Invited Friends Activity History */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <FiUsers className="w-4 h-4 text-teal-600" />
              Invited Friends ({referralData?.friendsList?.length || 0})
            </h3>
            {referralData?.pendingCount > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                {referralData.pendingCount} Pending Booking
              </span>
            )}
          </div>

          {referralData?.friendsList && referralData.friendsList.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {referralData.friendsList.map((friend) => (
                <div key={friend.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-xs">
                      {friend.friendName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{friend.friendName}</h4>
                      <p className="text-[10px] text-slate-400">{friend.phoneMasked} • Joined {new Date(friend.joinedAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div>
                    {friend.status === 'rewarded' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        <FiCheckCircle className="w-3 h-3 text-emerald-600" />
                        +₹{friend.rewardAmount}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                        <FiClock className="w-3 h-3 text-amber-600" />
                        Pending 1st Job
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                <FiUsers className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-700">No referrals yet</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Share your link to invite your first friend and earn ₹{rewardAmount}!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Rewards;
