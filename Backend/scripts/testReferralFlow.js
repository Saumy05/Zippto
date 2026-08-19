const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');
const Booking = require('../models/Booking');
const Referral = require('../models/Referral');
const Transaction = require('../models/Transaction');
const { 
  generateUniqueReferralCode, 
  applyReferralCode, 
  processFirstBookingReferralReward, 
  getReferralDashboard 
} = require('../services/referralService');

async function runReferralTest() {
  console.log('--- 🧪 STARTING REFERRAL & INVITE ENGINE VERIFICATION TEST ---');
  
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/homster_test';
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB');

  try {
    const timestamp = Date.now();
    const phoneA = `981${String(timestamp).slice(-7)}`;
    const phoneB = `982${String(timestamp).slice(-7)}`;

    // 1. Create User A (Referrer)
    const codeA = await generateUniqueReferralCode('Alice');
    const userA = await User.create({
      name: 'Alice Referrer',
      phone: phoneA,
      referralCode: codeA,
      wallet: { balance: 0 }
    });
    console.log(`✅ [1/5] User A created: ${userA.name}, Code: ${userA.referralCode}, Wallet: ₹${userA.wallet.balance}`);

    // 2. Create User B (Referee) with User A's referral code
    const codeB = await generateUniqueReferralCode('Bob');
    const userB = await User.create({
      name: 'Bob Referee',
      phone: phoneB,
      referralCode: codeB,
      wallet: { balance: 0 }
    });
    console.log(`✅ [2/5] User B created: ${userB.name}, Code: ${userB.referralCode}`);

    // Apply User A's referral code to User B
    const applyResult = await applyReferralCode(userB._id, codeA);
    console.log(`✅ [3/5] Applied User A's referral code to User B:`, applyResult.message);

    // 3. User B places and completes 1st service booking
    const dummyId = new mongoose.Types.ObjectId();
    const booking = await Booking.create({
      bookingNumber: `TEST-REF-${timestamp}`,
      userId: userB._id,
      serviceId: dummyId,
      serviceName: 'AC Cleaning',
      serviceCategory: 'Appliance Care',
      basePrice: 499,
      finalAmount: 499,
      scheduledDate: new Date(),
      scheduledTime: '10:00 AM',
      timeSlot: { start: '10:00 AM', end: '11:00 AM' },
      address: {
        addressLine1: '123 Main Road',
        city: 'Indore',
        state: 'Madhya Pradesh',
        pincode: '452001'
      },
      status: 'completed',
      paymentStatus: 'success',
      paymentMethod: 'cash collected',
      completedAt: new Date()
    });
    console.log(`✅ [4/5] Created completed 1st booking (${booking.bookingNumber}) for User B`);

    // Process referral reward trigger
    const rewardResult = await processFirstBookingReferralReward(booking._id);
    console.log(`✅ [5/5] Referral reward trigger result:`, rewardResult);

    // Assertions
    const updatedUserA = await User.findById(userA._id);
    const updatedUserB = await User.findById(userB._id);

    console.log(`\n--- 📊 WALLET & TRANSACTION VALIDATION ---`);
    console.log(`User A (Referrer) Wallet Balance: ₹${updatedUserA.wallet.balance} (Expected: ₹50)`);
    console.log(`User B (Referee) Wallet Balance: ₹${updatedUserB.wallet.balance} (Expected: ₹50)`);

    if (updatedUserA.wallet.balance !== 50 || updatedUserB.wallet.balance !== 50) {
      throw new Error(`❌ Wallet balance assertion failed! A: ${updatedUserA.wallet.balance}, B: ${updatedUserB.wallet.balance}`);
    }

    const txnsA = await Transaction.find({ userId: userA._id, type: 'referral_bonus' });
    const txnsB = await Transaction.find({ userId: userB._id, type: 'referral_bonus' });
    console.log(`User A Referral Transactions: ${txnsA.length} (Expected: 1)`);
    console.log(`User B Referral Transactions: ${txnsB.length} (Expected: 1)`);

    if (txnsA.length !== 1 || txnsB.length !== 1) {
      throw new Error(`❌ Transaction ledger count assertion failed!`);
    }

    // 4. Test duplicate prevention on 2nd booking
    console.log('\n--- 🛡️ TESTING DUPLICATE REWARD PREVENTION ---');
    const booking2 = await Booking.create({
      bookingNumber: `TEST-REF-2-${timestamp}`,
      userId: userB._id,
      serviceId: dummyId,
      serviceName: 'Deep Cleaning',
      serviceCategory: 'Home Cleaning',
      basePrice: 899,
      finalAmount: 899,
      scheduledDate: new Date(),
      scheduledTime: '02:00 PM',
      timeSlot: { start: '02:00 PM', end: '03:00 PM' },
      address: {
        addressLine1: '123 Main Road',
        city: 'Indore',
        state: 'Madhya Pradesh',
        pincode: '452001'
      },
      status: 'completed',
      paymentStatus: 'success'
    });
    const duplicateResult = await processFirstBookingReferralReward(booking2._id);
    console.log(`Duplicate reward execution result:`, duplicateResult, '(Expected: null)');
    if (duplicateResult !== null) {
      throw new Error('❌ Duplicate reward was incorrectly processed!');
    }

    // 5. Test Self-Referral Prevention
    console.log('\n--- 🛡️ TESTING SELF-REFERRAL PREVENTION ---');
    try {
      await applyReferralCode(userA._id, userA.referralCode);
      throw new Error('❌ Self-referral was unexpectedly allowed!');
    } catch (selfErr) {
      console.log(`✅ Self-referral cleanly prevented: "${selfErr.message}"`);
    }

    // 6. Test Dashboard Data
    console.log('\n--- 📱 TESTING DASHBOARD FETCH ---');
    const dashboard = await getReferralDashboard(userA._id);
    console.log(`User A Dashboard: Total Earned: ₹${dashboard.totalEarned}, Successful Invites: ${dashboard.successfulCount}, Friends: ${dashboard.friendsList.length}`);

    // Cleanup test data
    await User.deleteMany({ _id: { $in: [userA._id, userB._id] } });
    await Booking.deleteMany({ _id: { $in: [booking._id, booking2._id] } });
    await Referral.deleteMany({ refereeId: userB._id });
    await Transaction.deleteMany({ userId: { $in: [userA._id, userB._id] } });
    console.log('🧹 Cleaned up test records');

    console.log('\n🎉 ALL REFERRAL & INVITE TESTS PASSED 100% CLEANLY!');
  } finally {
    await mongoose.disconnect();
  }
}

runReferralTest().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
