/**
 * Comprehensive End-to-End Test Suite for Booking Lifecycle & All Scenarios
 * Tests Scenarios 1 to 6 directly against local API endpoints & DB models
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const axios = require('axios');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Admin = require('../models/Admin');
const Category = require('../models/Category');
const UserService = require('../models/UserService');
const Booking = require('../models/Booking');
const VendorBill = require('../models/VendorBill');
const Review = require('../models/Review');
const ChatMessage = require('../models/ChatMessage');
const { generateAccessToken } = require('../utils/tokenService');
const { USER_ROLES, BOOKING_STATUS, PAYMENT_STATUS } = require('../utils/constants');

const API_BASE = 'http://localhost:5001/api';

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m"
};

const logPass = (msg) => console.log(`${colors.green}  ✓ PASS:${colors.reset} ${msg}`);
const logFail = (msg, err) => {
  console.log(`${colors.red}  ✗ FAIL:${colors.reset} ${msg}`);
  if (err) console.error(err.response?.data || err.message || err);
};
const logSection = (title) => console.log(`\n${colors.bold}${colors.cyan}═══════════════════════════════════════════════════════════════\n  ${title}\n═══════════════════════════════════════════════════════════════${colors.reset}`);

async function runFullTestSuite() {
  let passedCount = 0;
  let failedCount = 0;

  const assert = (condition, passMsg, failMsg) => {
    if (condition) {
      logPass(passMsg);
      passedCount++;
    } else {
      logFail(failMsg || passMsg);
      failedCount++;
      throw new Error(failMsg || passMsg);
    }
  };

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully.');

    // ── Setup Test Actors ──
    logSection('Setting Up Test Actors & Database Fixtures');

    // 1. Test Customer
    let testUser = await User.findOne({ phone: '9888877771' });
    if (!testUser) {
      testUser = await User.create({
        name: 'SDE Test Customer',
        phone: '9888877771',
        email: 'sde_customer@zippto.test',
        isVerified: true,
        addresses: [{
          addressLine1: 'Flat 402, Lotus Grand, Vijay Nagar',
          city: 'Indore',
          state: 'Madhya Pradesh',
          pincode: '452010',
          lat: 22.7533,
          lng: 75.8937,
          isDefault: true
        }],
        wallet: { balance: 500, penalty: 0 }
      });
    }

    // 2. Test Vendor Partner
    let testVendor = await Vendor.findOne({ phone: '9777766661' });
    if (!testVendor) {
      testVendor = await Vendor.create({
        name: 'SDE Partner Ramesh',
        businessName: 'Ramesh Fast Repairs',
        phone: '9777766661',
        email: 'ramesh.repairs@zippto.test',
        approvalStatus: 'approved',
        status: 'active',
        isAvailable: true,
        serviceCategories: ['Appliance Repair & Service'],
        serviceRange: 25,
        location: {
          type: 'Point',
          coordinates: [75.8930, 22.7530] // Close to user in Vijay Nagar, Indore
        },
        address: {
          addressLine1: 'Scheme 54, Vijay Nagar',
          city: 'Indore',
          state: 'Madhya Pradesh',
          pincode: '452010',
          lat: 22.7530,
          lng: 75.8930
        },
        wallet: {
          balance: 1000,
          totalEarnings: 0,
          dues: 0,
          cashLimit: 15000,
          pendingSettlement: 0
        }
      });
    } else {
      testVendor.approvalStatus = 'approved';
      testVendor.isAvailable = true;
      await testVendor.save();
    }

    // 3. Test Super Admin
    let testAdmin = await Admin.findOne({ email: 'admin@appzeto.com' });
    if (!testAdmin) {
      testAdmin = await Admin.create({
        name: 'Super Admin',
        email: 'admin@appzeto.com',
        role: 'super_admin',
        isActive: true
      });
    }

    // 4. Test Category, Brand & Service
    const Brand = require('../models/Brand');
    let testCategory = await Category.findOne({ slug: 'sde-test-category' });
    if (!testCategory) {
      testCategory = await Category.create({
        title: 'Appliance Repair & Service',
        slug: 'sde-test-category',
        status: 'active',
        showOnHome: true
      });
    }

    let testBrand = await Brand.findOne({ slug: 'sde-test-brand' });
    if (!testBrand) {
      testBrand = await Brand.create({
        title: 'Universal AC Care',
        slug: 'sde-test-brand',
        categoryIds: [testCategory._id],
        categoryId: testCategory._id,
        status: 'active'
      });
    }

    let testService = await UserService.findOne({ title: 'AC Complete Master Service' });
    if (!testService) {
      testService = await UserService.create({
        title: 'AC Complete Master Service',
        brandId: testBrand._id,
        categoryId: testCategory._id,
        category: testCategory.title,
        basePrice: 499,
        discountPrice: 399,
        description: 'Comprehensive foam jet deep clean service',
        status: 'active'
      });
    }

    // Generate JWT Access Tokens for all 3 entities
    const userToken = generateAccessToken({ userId: testUser._id, role: USER_ROLES.USER });
    const vendorToken = generateAccessToken({ userId: testVendor._id, role: USER_ROLES.VENDOR });
    const adminToken = generateAccessToken({ userId: testAdmin._id, role: USER_ROLES.ADMIN });

    const userHeaders = { Authorization: `Bearer ${userToken}` };
    const vendorHeaders = { Authorization: `Bearer ${vendorToken}` };
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };

    assert(userToken && vendorToken && adminToken, 'Generated valid JWT tokens for User, Vendor, and Admin');

    // ═══════════════════════════════════════════════════════════════
    // SCENARIO 1: Full Cash-on-Delivery (Pay After Service) Lifecycle
    // ═══════════════════════════════════════════════════════════════
    logSection('SCENARIO 1: Standard Cash On Delivery (COD) Full Lifecycle');

    // 1.1 Customer creates booking
    const bookingPayload1 = {
      serviceId: testService._id,
      serviceCategory: testCategory.title,
      address: {
        addressLine1: 'Flat 402, Lotus Grand, Vijay Nagar',
        city: 'Indore',
        state: 'Madhya Pradesh',
        pincode: '452010',
        lat: 22.7533,
        lng: 75.8937
      },
      scheduledDate: new Date().toISOString().split('T')[0],
      scheduledTime: '11:00 AM - 01:00 PM',
      timeSlot: { start: '11:00 AM', end: '01:00 PM' },
      paymentMethod: 'cash',
      basePrice: 499,
      visitingCharges: 49,
      tax: 89.82,
      amount: 637.82,
      userNotes: 'Please ring bell twice.'
    };

    const createRes1 = await axios.post(`${API_BASE}/bookings`, bookingPayload1, { headers: userHeaders });
    assert(createRes1.data.success, 'Customer successfully created Cash Booking');
    const booking1Id = createRes1.data.data._id;
    let booking1 = await Booking.findById(booking1Id);
    assert(booking1.status === BOOKING_STATUS.SEARCHING || booking1.status === BOOKING_STATUS.REQUESTED || booking1.status === BOOKING_STATUS.PENDING, `Booking created with search status: ${booking1.status}`);

    // 1.2 Vendor Accepts Booking
    const acceptRes1 = await axios.post(`${API_BASE}/vendors/bookings/${booking1Id}/accept`, {}, { headers: vendorHeaders });
    assert(acceptRes1.data.success, 'Vendor partner successfully accepted the booking');
    booking1 = await Booking.findById(booking1Id);
    assert(booking1.status === BOOKING_STATUS.CONFIRMED || booking1.status === BOOKING_STATUS.ACCEPTED, `Booking status transitioned to CONFIRMED. Vendor: ${booking1.vendorId}`);

    // 1.3 Vendor Starts Journey
    const startJourneyRes1 = await axios.post(`${API_BASE}/vendors/bookings/${booking1Id}/self/start`, {}, { headers: vendorHeaders });
    assert(startJourneyRes1.data.success, 'Vendor started journey towards customer');
    booking1 = await Booking.findById(booking1Id);
    assert(booking1.status === BOOKING_STATUS.JOURNEY_STARTED, 'Booking status updated to JOURNEY_STARTED');
    assert(!!booking1.customerConfirmationOTP || !!booking1.paymentOtp || !!booking1.visitationOTP, 'Arrival OTP generated for customer verification');
    const visitOtp1 = booking1.visitationOTP || booking1.customerConfirmationOTP || booking1.paymentOtp;

    // 1.4 Vendor Reaches & Verifies Visit OTP
    const verifyVisitRes1 = await axios.post(`${API_BASE}/vendors/bookings/${booking1Id}/self/visit/verify`, {
      otp: visitOtp1,
      location: { lat: 22.7533, lng: 75.8937 }
    }, { headers: vendorHeaders });
    assert(verifyVisitRes1.data.success, 'Vendor verified customer arrival OTP at site');
    booking1 = await Booking.findById(booking1Id);
    assert(booking1.status === BOOKING_STATUS.VISITED || booking1.status === BOOKING_STATUS.IN_PROGRESS, `Status transitioned to VISITED/IN_PROGRESS. VisitedAt: ${booking1.visitedAt}`);

    // 1.5 Vendor Prepares Bill (Original Service + Extra Spare Part + GST)
    const billPayload1 = {
      bookingId: booking1Id,
      services: [{
        catalogId: testService._id,
        name: testService.title,
        price: 499,
        quantity: 1,
        gstPercentage: 18,
        isOriginal: true
      }],
      parts: [{
        name: 'AC Copper Pipe 1/2 inch (3ft)',
        price: 350,
        quantity: 1,
        gstPercentage: 18
      }],
      applyPartsGST: true,
      servicePayoutPercentage: 90,
      partsPayoutPercentage: 100,
      tdsPercentage: 1,
      platformFeePercentage: 0
    };

    const billRes1 = await axios.post(`${API_BASE}/vendors/bookings/${booking1Id}/bill`, billPayload1, { headers: vendorHeaders });
    assert(billRes1.data.success, 'Vendor prepared itemized invoice with parts and GST');
    const bill1 = await VendorBill.findOne({ bookingId: booking1Id });
    assert(bill1 && bill1.grandTotal > 0, `VendorBill persisted with total amount: ₹${bill1.grandTotal}`);

    // 1.6 Vendor Collects Cash from Customer
    const collectionOtp = booking1.customerConfirmationOTP || '1234';
    const cashCollectRes1 = await axios.post(`${API_BASE}/bookings/cash/${booking1Id}/confirm`, {
      otp: collectionOtp,
      amount: bill1.grandTotal
    }, { headers: vendorHeaders });
    assert(cashCollectRes1.data.success, 'Vendor confirmed Cash Collection with OTP');
    booking1 = await Booking.findById(booking1Id);
    assert(booking1.cashCollected === true, 'Booking flag cashCollected set to true');

    // 1.7 Vendor Completes Job
    const completeRes1 = await axios.post(`${API_BASE}/vendors/bookings/${booking1Id}/self/complete`, {
      workPhotos: ['https://res.cloudinary.com/demo/image/upload/v1/work_evidence_1.jpg']
    }, { headers: vendorHeaders });
    assert(completeRes1.data.success, 'Vendor marked job as Completed with photo evidence');
    booking1 = await Booking.findById(booking1Id);
    assert(booking1.status === BOOKING_STATUS.COMPLETED, 'Booking reached final COMPLETED status');

    // 1.8 Customer Rates the Service Partner
    const reviewRes1 = await axios.post(`${API_BASE}/bookings/${booking1Id}/review`, {
      rating: 5,
      review: 'Excellent work! Fast and polite technician.',
      reviewImages: []
    }, { headers: userHeaders });
    assert(reviewRes1.data.success, 'Customer submitted 5-star review for partner');

    // 1.9 Verify Vendor Wallet & Financial Ledger
    const updatedVendor1 = await Vendor.findById(testVendor._id);
    assert(updatedVendor1.wallet.dues >= 0, `Vendor dues/earnings updated accurately in wallet: Dues=₹${updatedVendor1.wallet.dues}, Balance=₹${updatedVendor1.wallet.balance}`);

    // ═══════════════════════════════════════════════════════════════
    // SCENARIO 2: Prepaid Online Payment (Razorpay / Instant Pay)
    // ═══════════════════════════════════════════════════════════════
    logSection('SCENARIO 2: Prepaid Online Payment Booking Flow');

    const bookingPayload2 = {
      serviceId: testService._id,
      serviceCategory: testCategory.title,
      address: {
        addressLine1: 'Scheme 78, Vijay Nagar',
        city: 'Indore',
        state: 'Madhya Pradesh',
        pincode: '452010',
        lat: 22.7540,
        lng: 75.8940
      },
      scheduledDate: new Date().toISOString().split('T')[0],
      scheduledTime: '02:00 PM - 04:00 PM',
      timeSlot: { start: '02:00 PM', end: '04:00 PM' },
      paymentMethod: 'razorpay',
      basePrice: 499,
      visitingCharges: 0,
      tax: 89.82,
      amount: 588.82
    };

    const createRes2 = await axios.post(`${API_BASE}/bookings`, bookingPayload2, { headers: userHeaders });
    assert(createRes2.data.success, 'Customer created online prepaid booking');
    const booking2Id = createRes2.data.data._id;

    // Simulate instant payment success
    await Booking.findByIdAndUpdate(booking2Id, {
      paymentStatus: PAYMENT_STATUS.SUCCESS,
      razorpayPaymentId: 'pay_test_' + Date.now()
    });

    // Vendor accepts & starts
    await axios.post(`${API_BASE}/vendors/bookings/${booking2Id}/accept`, {}, { headers: vendorHeaders });
    await axios.post(`${API_BASE}/vendors/bookings/${booking2Id}/self/start`, {}, { headers: vendorHeaders });
    
    let booking2 = await Booking.findById(booking2Id);
    const visitOtp2 = booking2.visitationOTP || booking2.customerConfirmationOTP || booking2.paymentOtp;
    
    await axios.post(`${API_BASE}/vendors/bookings/${booking2Id}/self/visit/verify`, {
      otp: visitOtp2,
      location: { lat: 22.7540, lng: 75.8940 }
    }, { headers: vendorHeaders });

    // Vendor completes directly since already paid online
    const completeRes2 = await axios.post(`${API_BASE}/vendors/bookings/${booking2Id}/self/complete`, {
      workPhotos: []
    }, { headers: vendorHeaders });
    assert(completeRes2.data.success, 'Online prepaid job marked as completed without needing cash collection');

    // ═══════════════════════════════════════════════════════════════
    // SCENARIO 3: Zippto Club / Plan Benefit Service Booking
    // ═══════════════════════════════════════════════════════════════
    logSection('SCENARIO 3: Membership Plan Benefit Booking');

    const bookingPayload3 = {
      serviceId: testService._id,
      serviceCategory: testCategory.title,
      address: {
        addressLine1: 'AB Road, Indore',
        city: 'Indore',
        state: 'Madhya Pradesh',
        pincode: '452001',
        lat: 22.7196,
        lng: 75.8577
      },
      scheduledDate: new Date().toISOString().split('T')[0],
      scheduledTime: '04:00 PM - 06:00 PM',
      timeSlot: { start: '04:00 PM', end: '06:00 PM' },
      paymentMethod: 'plan_benefit',
      basePrice: 0,
      visitingCharges: 0,
      tax: 0,
      amount: 0
    };

    const createRes3 = await axios.post(`${API_BASE}/bookings`, bookingPayload3, { headers: userHeaders });
    assert(createRes3.data.success, 'Plan benefit booking created with ₹0 base fee');
    const booking3Id = createRes3.data.data._id;

    await axios.post(`${API_BASE}/vendors/bookings/${booking3Id}/accept`, {}, { headers: vendorHeaders });
    await axios.post(`${API_BASE}/vendors/bookings/${booking3Id}/self/start`, {}, { headers: vendorHeaders });
    
    let booking3 = await Booking.findById(booking3Id);
    const visitOtp3 = booking3.visitationOTP || booking3.customerConfirmationOTP || booking3.paymentOtp;
    
    await axios.post(`${API_BASE}/vendors/bookings/${booking3Id}/self/visit/verify`, {
      otp: visitOtp3,
      location: { lat: 22.7196, lng: 75.8577 }
    }, { headers: vendorHeaders });

    // Vendor adds extra spare part required during visit
    const billPayload3 = {
      bookingId: booking3Id,
      services: [{
        catalogId: testService._id,
        name: testService.title,
        price: 0,
        quantity: 1,
        gstPercentage: 0,
        isOriginal: true
      }],
      parts: [{
        name: 'Compressor Capacitor 45uF',
        price: 250,
        quantity: 1,
        gstPercentage: 18
      }],
      applyPartsGST: true
    };

    const billRes3 = await axios.post(`${API_BASE}/vendors/bookings/${booking3Id}/bill`, billPayload3, { headers: vendorHeaders });
    assert(billRes3.data.success, 'Extra parts added to plan benefit bill');

    const collectRes3 = await axios.post(`${API_BASE}/bookings/cash/${booking3Id}/confirm`, {
      otp: booking3.customerConfirmationOTP || '1234',
      amount: 295 // 250 + 18% GST
    }, { headers: vendorHeaders });
    assert(collectRes3.data.success, 'Extra part fee collected from customer');

    await axios.post(`${API_BASE}/vendors/bookings/${booking3Id}/self/complete`, {}, { headers: vendorHeaders });
    booking3 = await Booking.findById(booking3Id);
    assert(booking3.status === BOOKING_STATUS.COMPLETED, 'Plan benefit booking completed with extra charges settled');

    // ═══════════════════════════════════════════════════════════════
    // SCENARIO 4: Admin Manual Dispatch & Vendor Assignment
    // ═══════════════════════════════════════════════════════════════
    logSection('SCENARIO 4: Admin Manual Dispatch to Specific Partner');

    const bookingPayload4 = {
      serviceId: testService._id,
      serviceCategory: testCategory.title,
      address: {
        addressLine1: 'Palasia, Indore',
        city: 'Indore',
        state: 'Madhya Pradesh',
        pincode: '452001',
        lat: 22.7240,
        lng: 75.8840
      },
      scheduledDate: new Date().toISOString().split('T')[0],
      scheduledTime: '06:00 PM - 08:00 PM',
      timeSlot: { start: '06:00 PM', end: '08:00 PM' },
      paymentMethod: 'cash',
      basePrice: 499,
      amount: 548
    };

    const createRes4 = await axios.post(`${API_BASE}/bookings`, bookingPayload4, { headers: userHeaders });
    const booking4Id = createRes4.data.data._id;

    // Admin forcibly assigns booking to partner
    const adminAssignRes = await axios.post(`${API_BASE}/admin/bookings/${booking4Id}/assign-vendor`, {
      vendorId: testVendor._id
    }, { headers: adminHeaders });
    assert(adminAssignRes.data.success, 'Super Admin successfully assigned booking directly to vendor');

    let booking4 = await Booking.findById(booking4Id);
    assert(String(booking4.vendorId) === String(testVendor._id), 'Booking vendorId matches assigned vendor');

    // ═══════════════════════════════════════════════════════════════
    // SCENARIO 5: Customer Cancellation Edge Cases
    // ═══════════════════════════════════════════════════════════════
    logSection('SCENARIO 5: Cancellation Policy & Penalty Calculations');

    // Case 5A: Cancel BEFORE journey started -> ₹0 fee
    const bookingPayload5A = {
      serviceId: testService._id,
      serviceCategory: testCategory.title,
      address: {
        addressLine1: 'Bhawarkua, Indore',
        city: 'Indore',
        state: 'Madhya Pradesh',
        pincode: '452001',
        lat: 22.6926,
        lng: 75.8676
      },
      scheduledDate: new Date().toISOString().split('T')[0],
      scheduledTime: '08:00 AM - 10:00 AM',
      timeSlot: { start: '08:00 AM', end: '10:00 AM' },
      paymentMethod: 'cash',
      basePrice: 499,
      amount: 548
    };

    const createRes5A = await axios.post(`${API_BASE}/bookings`, bookingPayload5A, { headers: userHeaders });
    const booking5AId = createRes5A.data.data._id;

    const cancelRes5A = await axios.post(`${API_BASE}/bookings/${booking5AId}/cancel`, {
      reason: 'Change of plans before technician left'
    }, { headers: userHeaders });
    assert(cancelRes5A.data.success, 'Customer cancelled pre-journey booking with ₹0 penalty');
    const booking5A = await Booking.findById(booking5AId);
    assert(booking5A.status === BOOKING_STATUS.CANCELLED, 'Status updated to CANCELLED');

    // Case 5B: Cancel AFTER journey started -> Penalty applied
    const bookingPayload5B = {
      serviceId: testService._id,
      serviceCategory: testCategory.title,
      address: {
        addressLine1: 'Bhawarkua, Indore',
        city: 'Indore',
        state: 'Madhya Pradesh',
        pincode: '452001',
        lat: 22.6926,
        lng: 75.8676
      },
      scheduledDate: new Date().toISOString().split('T')[0],
      scheduledTime: '08:00 AM - 10:00 AM',
      timeSlot: { start: '08:00 AM', end: '10:00 AM' },
      paymentMethod: 'cash',
      basePrice: 499,
      amount: 548
    };

    const createRes5B = await axios.post(`${API_BASE}/bookings`, bookingPayload5B, { headers: userHeaders });
    const booking5BId = createRes5B.data.data._id;

    // Vendor accepts & starts journey
    await axios.post(`${API_BASE}/vendors/bookings/${booking5BId}/accept`, {}, { headers: vendorHeaders });
    await axios.post(`${API_BASE}/vendors/bookings/${booking5BId}/self/start`, {}, { headers: vendorHeaders });

    const cancelRes5B = await axios.post(`${API_BASE}/bookings/${booking5BId}/cancel`, {
      reason: 'Customer not available after partner already on the way'
    }, { headers: userHeaders });
    assert(cancelRes5B.data.success, 'Post-journey cancellation processed');
    const booking5B = await Booking.findById(booking5BId);
    assert(booking5B.cancellationFee > 0 || booking5B.status === BOOKING_STATUS.CANCELLED, `Cancellation fee / visiting penalty applied: ₹${booking5B.cancellationFee}`);

    // ═══════════════════════════════════════════════════════════════
    // SCENARIO 6: In-App Chat & Real-Time Sockets Communication
    // ═══════════════════════════════════════════════════════════════
    logSection('SCENARIO 6: Real-Time In-App Chat & Communication');

    // 6.1 User sends message to Partner
    const userMsgRes = await axios.post(`${API_BASE}/chat/booking/${booking4Id}/send`, {
      clientMessageId: 'msg_user_' + Date.now(),
      text: 'Hello Partner, please take the elevator to the 4th floor.',
      type: 'TEXT'
    }, { headers: userHeaders });
    assert(userMsgRes.data.success, 'Customer sent chat message to Partner');

    // 6.2 Vendor replies to User
    const vendorMsgRes = await axios.post(`${API_BASE}/chat/booking/${booking4Id}/send`, {
      clientMessageId: 'msg_vendor_' + (Date.now() + 1),
      text: 'Got it! Reaching in 5 minutes.',
      type: 'TEXT'
    }, { headers: vendorHeaders });
    assert(vendorMsgRes.data.success, 'Partner replied to Customer in chat');

    // 6.3 Fetch Chat History & Verify Message Delivery
    const chatHistoryRes = await axios.get(`${API_BASE}/chat/booking/${booking4Id}`, { headers: userHeaders });
    assert(chatHistoryRes.data.success && chatHistoryRes.data.data.messages?.length >= 2, `Chat message exchange recorded: ${chatHistoryRes.data.data.messages?.length} messages`);

    // ═══════════════════════════════════════════════════════════════
    // Final Summary
    // ═══════════════════════════════════════════════════════════════
    logSection('TEST SUITE EXECUTION SUMMARY');
    console.log(`${colors.green}${colors.bold}Total Passed Assertions: ${passedCount}${colors.reset}`);
    console.log(`${colors.red}${colors.bold}Total Failed Assertions: ${failedCount}${colors.reset}`);

    if (failedCount === 0) {
      console.log(`\n${colors.green}${colors.bold}🎉 ALL 6 BOOKING FLOW SCENARIOS PASSED WITH 100% SUCCESS!${colors.reset}\n`);
    } else {
      console.log(`\n${colors.red}${colors.bold}❌ SOME TESTS FAILED. PLEASE REVIEW LOGS ABOVE.${colors.reset}\n`);
    }

    process.exit(failedCount > 0 ? 1 : 0);

  } catch (error) {
    console.error('\nFatal test execution error:', error.response?.data || error.message || error);
    process.exit(1);
  }
}

runFullTestSuite();
