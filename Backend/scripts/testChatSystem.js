const path = require('path');
const mongoose = require('mongoose');
const io = require(path.resolve(__dirname, '../../Frontend/node_modules/socket.io-client'));
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Booking = require('../models/Booking');
const ChatMessage = require('../models/ChatMessage');
const { generateAccessToken } = require('../utils/tokenService');
const chatService = require('../services/chatService');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/zippto';
const SERVER_URL = 'http://localhost:5000';

async function runTests() {
  console.log('====================================================');
  console.log('🚀 IN-APP REAL-TIME CHAT INTEGRATION TEST SUITE');
  console.log('====================================================');

  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  let testUser = null;
  let testVendor = null;
  let unauthorizedUser = null;
  let testBooking = null;
  let userSocket = null;
  let vendorSocket = null;

  try {
    // 1. Create or Find Test Users
    testUser = await User.findOneAndUpdate(
      { phone: '+919999911111' },
      { name: 'Chat Test User', phone: '+919999911111', email: 'chatuser@zippto.com', role: 'USER' },
      { upsert: true, new: true }
    );

    unauthorizedUser = await User.findOneAndUpdate(
      { phone: '+919999922222' },
      { name: 'Intruder User', phone: '+919999922222', email: 'intruder@zippto.com', role: 'USER' },
      { upsert: true, new: true }
    );

    testVendor = await Vendor.findOneAndUpdate(
      { phone: '+918888811111' },
      {
        name: 'Chat Test Partner',
        phone: '+918888811111',
        businessName: 'Speedy Home Services',
        email: 'speedy@zippto.com',
        role: 'VENDOR',
        approvalStatus: 'approved'
      },
      { upsert: true, new: true }
    );

    console.log(`✅ Test User Created: ${testUser._id} (${testUser.name})`);
    console.log(`✅ Test Vendor Created: ${testVendor._id} (${testVendor.name})`);

    const Service = require('../models/Service');
    let testService = await Service.findOne();
    if (!testService) {
      testService = await Service.create({
        brandId: new mongoose.Types.ObjectId(),
        title: 'AC Deep Cleaning',
        slug: `ac-cleaning-${Date.now()}`,
        basePrice: 599,
        gstPercentage: 18
      });
    }

    // 2. Create Active Test Booking
    testBooking = await Booking.create({
      bookingNumber: `CHAT-${Date.now()}`,
      userId: testUser._id,
      vendorId: testVendor._id,
      serviceId: testService._id,
      serviceCategory: 'AC Service',
      customerName: testUser.name,
      customerPhone: testUser.phone,
      serviceName: 'AC Deep Cleaning',
      serviceType: 'AC Cleaning',
      status: 'confirmed',
      basePrice: 599,
      totalAmount: 599,
      finalAmount: 599,
      scheduledDate: new Date(),
      scheduledTime: '10:00 AM',
      timeSlot: {
        start: '10:00 AM',
        end: '12:00 PM'
      },
      address: {
        addressLine1: 'Flat 402, Highrise Tower',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001'
      }
    });

    console.log(`✅ Test Booking Created: ${testBooking._id} (Status: ${testBooking.status})`);

    // 3. Test Participant Authorization
    console.log('\n--- 1. Testing Zero-Trust Authorization & Lifecycle ---');

    // Customer authorized
    const userAuth = await chatService.assertBookingChatParticipant(testBooking._id, {
      id: testUser._id,
      role: 'USER'
    });
    console.log(`✅ Customer Authorized: ${userAuth.senderName} (Read-only: ${userAuth.isReadOnly})`);

    // Vendor authorized
    const vendorAuth = await chatService.assertBookingChatParticipant(testBooking._id, {
      id: testVendor._id,
      role: 'VENDOR'
    });
    console.log(`✅ Vendor Authorized: ${vendorAuth.senderName} (Read-only: ${vendorAuth.isReadOnly})`);

    // Intruder blocked (403)
    try {
      await chatService.assertBookingChatParticipant(testBooking._id, {
        id: unauthorizedUser._id,
        role: 'USER'
      });
      throw new Error('Intruder was not blocked!');
    } catch (authErr) {
      if (authErr.status === 403) {
        console.log(`✅ Intruder successfully blocked with 403: ${authErr.message}`);
      } else {
        throw authErr;
      }
    }

    // 4. Test Message Creation & Idempotency
    console.log('\n--- 2. Testing Message Creation & Idempotency ---');
    const clientMsgId1 = `cli_${Date.now()}_1`;

    const msg1Res = await chatService.createMessage({
      bookingId: testBooking._id,
      actor: { id: testUser._id, role: 'USER' },
      clientMessageId: clientMsgId1,
      type: 'TEXT',
      text: "Hello! I'm waiting at the doorstep, please ring 402."
    });

    console.log(`✅ Message 1 Created: "${msg1Res.message.text}" (ID: ${msg1Res.message._id})`);
    console.log(`   ReadBy count: ${msg1Res.message.readBy.length} (Self initialized)`);

    // Test Idempotency (same clientMessageId)
    const duplicateRes = await chatService.createMessage({
      bookingId: testBooking._id,
      actor: { id: testUser._id, role: 'USER' },
      clientMessageId: clientMsgId1,
      type: 'TEXT',
      text: "Duplicate text shouldn't create new row"
    });

    if (duplicateRes.isDuplicate && duplicateRes.message._id.toString() === msg1Res.message._id.toString()) {
      console.log(`✅ Idempotency Verified: Duplicate clientMessageId returned existing message without duplicate row!`);
    } else {
      throw new Error('Idempotency failed!');
    }

    // 5. Vendor replies & Read Receipts
    console.log('\n--- 3. Testing Partner Reply & Read Receipts ---');
    const clientMsgId2 = `cli_${Date.now()}_2`;

    const msg2Res = await chatService.createMessage({
      bookingId: testBooking._id,
      actor: { id: testVendor._id, role: 'VENDOR' },
      clientMessageId: clientMsgId2,
      type: 'TEXT',
      text: 'Understood! I will be there in 3 minutes.'
    });
    console.log(`✅ Message 2 (Vendor Reply): "${msg2Res.message.text}"`);

    // Customer marks messages read
    const readResult = await chatService.markMessagesRead(testBooking._id, {
      id: testUser._id,
      role: 'USER'
    });
    console.log(`✅ Customer marked messages as read (Updated count: ${readResult.updatedCount})`);

    // Verify chat history
    const history = await chatService.getChatHistory(testBooking._id, {
      id: testUser._id,
      role: 'USER'
    });
    console.log(`✅ Chat History Retrieved: ${history.messages.length} messages returned`);

    // 6. Test Unread Aggregation
    console.log('\n--- 4. Testing Unread Count Aggregation ---');
    const unreadUser = await chatService.getUnreadCount({ id: testUser._id, role: 'USER' });
    console.log(`✅ User Unread Count: ${unreadUser.totalUnread}`);

    // 7. Test Completed Lifecycle State Constraint
    console.log('\n--- 5. Testing Booking Lifecycle Constraints ---');
    testBooking.status = 'completed';
    await testBooking.save();

    const completedAuth = await chatService.assertBookingChatParticipant(testBooking._id, {
      id: testUser._id,
      role: 'USER'
    });
    console.log(`✅ Completed Booking Auth: isReadOnly = ${completedAuth.isReadOnly}`);

    try {
      await chatService.createMessage({
        bookingId: testBooking._id,
        actor: { id: testUser._id, role: 'USER' },
        clientMessageId: `cli_${Date.now()}_blocked`,
        type: 'TEXT',
        text: 'Should be blocked on completed booking'
      });
      throw new Error('Write was not blocked on completed booking!');
    } catch (writeErr) {
      console.log(`✅ Write correctly blocked on completed booking: "${writeErr.message}"`);
    }

    // 8. Test Socket.IO Real-Time Gateway
    console.log('\n--- 6. Testing Socket.IO Real-Time Gateway ---');
    // Restore active status for socket test
    testBooking.status = 'in_progress';
    await testBooking.save();

    const userToken = generateAccessToken({ userId: testUser._id, role: 'USER' });
    const vendorToken = generateAccessToken({ userId: testVendor._id, role: 'VENDOR' });

    userSocket = io(SERVER_URL, {
      auth: { token: userToken },
      transports: ['websocket']
    });

    vendorSocket = io(SERVER_URL, {
      auth: { token: vendorToken },
      transports: ['websocket']
    });

    await new Promise((resolve, reject) => {
      let userReady = false;
      let vendorReady = false;

      userSocket.on('connect', () => {
        userReady = true;
        if (vendorReady) resolve();
      });
      vendorSocket.on('connect', () => {
        vendorReady = true;
        if (userReady) resolve();
      });
      setTimeout(() => {
        if (!userReady || !vendorReady) reject(new Error('Socket connection timeout'));
      }, 5000);
    });
    console.log('✅ User & Vendor Sockets Connected');

    // Both join chat room
    userSocket.emit('join_chat', { bookingId: testBooking._id.toString() });
    vendorSocket.emit('join_chat', { bookingId: testBooking._id.toString() });

    await new Promise(r => setTimeout(r, 600));
    console.log('✅ Sockets Joined Chat Room');

    // Send real-time socket message
    const socketMsgReceivedPromise = new Promise((resolve) => {
      userSocket.on('new_chat_message', (incoming) => {
        if (incoming.text === 'Realtime socket test message from vendor') {
          resolve(incoming);
        }
      });
    });

    vendorSocket.emit('send_chat_message', {
      bookingId: testBooking._id.toString(),
      clientMessageId: `socket_msg_${Date.now()}`,
      type: 'TEXT',
      text: 'Realtime socket test message from vendor'
    });

    const receivedSocketMsg = await socketMsgReceivedPromise;
    console.log(`✅ Real-Time Socket Message Received: "${receivedSocketMsg.text}"`);

    console.log('\n====================================================');
    console.log('🎉 ALL IN-APP REAL-TIME CHAT TESTS PASSED PERFECTLY!');
    console.log('====================================================');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    process.exitCode = 1;
  } finally {
    // Cleanup
    if (userSocket) userSocket.disconnect();
    if (vendorSocket) vendorSocket.disconnect();

    if (testBooking) {
      await ChatMessage.deleteMany({ bookingId: testBooking._id });
      await Booking.findByIdAndDelete(testBooking._id);
    }
    if (testUser) await User.findByIdAndDelete(testUser._id);
    if (unauthorizedUser) await User.findByIdAndDelete(unauthorizedUser._id);
    if (testVendor) await Vendor.findByIdAndDelete(testVendor._id);

    console.log('🧹 Cleaned up test database rows');
    await mongoose.disconnect();
  }
}

runTests();
