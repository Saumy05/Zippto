const crypto = require('crypto');
const User = require('../models/User');
const Referral = require('../models/Referral');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');

const REFERRAL_REWARD_AMOUNT = parseInt(process.env.REFERRAL_REWARD_AMOUNT || '50', 10);

/**
 * Generate a unique, human-friendly referral code
 * Format: ZIP-XXXXX (e.g. ZIP-7K9A2)
 */
const generateUniqueReferralCode = async (name = '') => {
  let prefix = 'ZIP';
  if (name && name.trim().length >= 3) {
    prefix = name.trim().slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'ZIP');
    if (prefix.length < 3) prefix = 'ZIP';
  }

  let code;
  let exists = true;
  let attempts = 0;

  while (exists && attempts < 10) {
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 5);
    code = `${prefix}-${randomHex}`;
    const user = await User.findOne({ referralCode: code });
    if (!user) {
      exists = false;
    }
    attempts++;
  }

  if (exists) {
    code = `ZIP-${Date.now().toString(36).toUpperCase().slice(-5)}`;
  }

  return code;
};

/**
 * Ensure user has a referral code generated
 */
const ensureUserReferralCode = async (user) => {
  if (user.referralCode) return user.referralCode;
  const newCode = await generateUniqueReferralCode(user.name);
  user.referralCode = newCode;
  await user.save();
  return newCode;
};

/**
 * Apply referral code for a new or existing user before first booking
 */
const applyReferralCode = async (userId, rawReferralCode) => {
  if (!rawReferralCode || typeof rawReferralCode !== 'string') {
    throw new Error('Please provide a valid referral code.');
  }

  const referralCode = rawReferralCode.trim().toUpperCase();

  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found.');
  }

  if (user.referredBy) {
    throw new Error('You have already applied a referral code.');
  }

  if (user.completedBookings > 0 || user.firstBookingCompleted) {
    throw new Error('Referral codes can only be applied by new users before completing their first booking.');
  }

  const referrer = await User.findOne({ referralCode });
  if (!referrer) {
    throw new Error('Invalid referral code. Please check and try again.');
  }

  if (referrer._id.toString() === user._id.toString()) {
    throw new Error('You cannot refer yourself.');
  }

  // Prevent circular referral
  if (referrer.referredBy && referrer.referredBy.toString() === user._id.toString()) {
    throw new Error('Invalid referral operation.');
  }

  // Link referral
  user.referredBy = referrer._id;
  await user.save();

  // Create or update referral record
  await Referral.findOneAndUpdate(
    { refereeId: user._id },
    {
      referrerId: referrer._id,
      refereeId: user._id,
      referralCode,
      status: 'registered',
      rewardAmount: REFERRAL_REWARD_AMOUNT
    },
    { upsert: true, new: true }
  );

  return {
    success: true,
    referrerName: referrer.name || 'Your friend',
    rewardAmount: REFERRAL_REWARD_AMOUNT,
    message: `Referral code applied successfully! You and ${referrer.name || 'your friend'} will each receive ₹${REFERRAL_REWARD_AMOUNT} in your wallet after your 1st completed booking.`
  };
};

/**
 * Triggered automatically when a booking is completed or paid successfully.
 * Credits ₹50 to referrer and ₹50 to referee on referee's first booking.
 */
const processFirstBookingReferralReward = async (bookingId) => {
  try {
    const Booking = require('../models/Booking');
    const booking = await Booking.findById(bookingId);
    if (!booking || !booking.userId) return null;

    const referee = await User.findById(booking.userId);
    if (!referee || !referee.referredBy || referee.referralRewardClaimed) {
      // Not referred or already rewarded
      return null;
    }

    const referrer = await User.findById(referee.referredBy);
    if (!referrer) return null;

    const rewardAmount = REFERRAL_REWARD_AMOUNT;

    // 1. Credit Referrer Wallet
    const referrerBalanceBefore = referrer.wallet?.balance || 0;
    const referrerBalanceAfter = referrerBalanceBefore + rewardAmount;
    referrer.wallet = referrer.wallet || {};
    referrer.wallet.balance = referrerBalanceAfter;
    referrer.referralRewards = referrer.referralRewards || { totalEarned: 0, successfulReferralsCount: 0 };
    referrer.referralRewards.totalEarned = (referrer.referralRewards.totalEarned || 0) + rewardAmount;
    referrer.referralRewards.successfulReferralsCount = (referrer.referralRewards.successfulReferralsCount || 0) + 1;
    await referrer.save();

    // Create Referrer Transaction
    await Transaction.create({
      userId: referrer._id,
      bookingId: booking._id,
      type: 'referral_bonus',
      amount: rewardAmount,
      status: 'completed',
      paymentMethod: 'wallet',
      balanceBefore: referrerBalanceBefore,
      balanceAfter: referrerBalanceAfter,
      description: `Referral reward for inviting ${referee.name || 'a friend'}`
    });

    // 2. Credit Referee Wallet (Welcome reward)
    const refereeBalanceBefore = referee.wallet?.balance || 0;
    const refereeBalanceAfter = refereeBalanceBefore + rewardAmount;
    referee.wallet = referee.wallet || {};
    referee.wallet.balance = refereeBalanceAfter;
    referee.referralRewardClaimed = true;
    referee.firstBookingCompleted = true;
    await referee.save();

    // Create Referee Transaction
    await Transaction.create({
      userId: referee._id,
      bookingId: booking._id,
      type: 'referral_bonus',
      amount: rewardAmount,
      status: 'completed',
      paymentMethod: 'wallet',
      balanceBefore: refereeBalanceBefore,
      balanceAfter: refereeBalanceAfter,
      description: `Welcome bonus for completing your first service with ${referrer.name || 'friend'}'s invite`
    });

    // 3. Update Referral Record
    await Referral.findOneAndUpdate(
      { refereeId: referee._id },
      {
        status: 'rewarded',
        firstBookingId: booking._id,
        rewardAmount,
        rewardedAt: new Date()
      },
      { upsert: true }
    );

    // 4. Create App Notifications
    await Notification.create([
      {
        userId: referrer._id,
        title: '🎉 Referral Bonus Received!',
        message: `₹${rewardAmount} credited to your wallet! ${referee.name || 'Your friend'} just completed their 1st booking.`,
        type: 'referral_reward',
        data: { rewardAmount, refereeName: referee.name }
      },
      {
        userId: referee._id,
        title: '🎁 Welcome Bonus Credited!',
        message: `₹${rewardAmount} welcome bonus has been added to your wallet for completing your 1st service.`,
        type: 'referral_reward',
        data: { rewardAmount, referrerName: referrer.name }
      }
    ]);

    // 5. Send FCM Push Notifications
    try {
      const { sendPushNotification } = require('./firebaseAdmin');
      if (referrer.fcmTokens && referrer.fcmTokens.length > 0) {
        await sendPushNotification(referrer.fcmTokens, {
          title: '🎉 Referral Bonus Credited!',
          body: `₹${rewardAmount} added to your wallet! ${referee.name || 'Your friend'} completed their first service.`,
          data: { type: 'referral_reward', amount: rewardAmount }
        });
      }
      if (referee.fcmTokens && referee.fcmTokens.length > 0) {
        await sendPushNotification(referee.fcmTokens, {
          title: '🎁 Welcome Bonus Credited!',
          body: `₹${rewardAmount} welcome bonus has been added to your Zippto wallet.`,
          data: { type: 'referral_reward', amount: rewardAmount }
        });
      }
    } catch (pushErr) {
      console.warn('[Referral] Push notification warning:', pushErr.message);
    }

    console.log(`[Referral Engine] Successfully rewarded ₹${rewardAmount} to Referrer (${referrer._id}) and Referee (${referee._id})`);
    return { success: true, rewardAmount, referrerId: referrer._id, refereeId: referee._id };
  } catch (error) {
    console.error('[Referral Engine] Error processing referral reward:', error);
    return null;
  }
};

/**
 * Get Referral Hub details for logged-in user
 */
const getReferralDashboard = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const referralCode = await ensureUserReferralCode(user);

  const referrals = await Referral.find({ referrerId: userId })
    .populate('refereeId', 'name phone profilePhoto createdAt')
    .sort({ createdAt: -1 })
    .lean();

  const totalEarned = user.referralRewards?.totalEarned || 0;
  const successfulCount = referrals.filter(r => r.status === 'rewarded').length;
  const pendingCount = referrals.filter(r => r.status !== 'rewarded').length;

  const frontendBase = process.env.FRONTEND_URL || 'http://localhost:5173';
  const cleanBase = frontendBase.startsWith('http') ? frontendBase : `https://${frontendBase}`;
  const referralLink = `${cleanBase}/signup?ref=${referralCode}`;

  const friendsList = referrals.map(r => ({
    id: r._id,
    friendName: r.refereeId?.name || 'Friend',
    phoneMasked: r.refereeId?.phone ? `${r.refereeId.phone.slice(0, 3)}****${r.refereeId.phone.slice(-3)}` : 'Invited Friend',
    status: r.status,
    rewardAmount: r.rewardAmount || REFERRAL_REWARD_AMOUNT,
    joinedAt: r.createdAt,
    rewardedAt: r.rewardedAt
  }));

  return {
    referralCode,
    referralLink,
    rewardPerReferral: REFERRAL_REWARD_AMOUNT,
    totalEarned,
    successfulCount,
    pendingCount,
    hasAppliedReferral: !!user.referredBy,
    canApplyReferral: !user.referredBy && user.completedBookings === 0 && !user.firstBookingCompleted,
    friendsList
  };
};

module.exports = {
  generateUniqueReferralCode,
  ensureUserReferralCode,
  applyReferralCode,
  processFirstBookingReferralReward,
  getReferralDashboard
};
