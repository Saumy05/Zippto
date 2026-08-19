require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Admin = require('../models/Admin');
const Booking = require('../models/Booking');
const ChatMessage = require('../models/ChatMessage');
const chatService = require('../services/chatService');
const { generateAccessToken } = require('../utils/tokenService');

const runTest = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB.');

    // 1. Setup/Find Test Customer
    let user = await User.findOne({ phone: '9999999991' });
    if (!user) {
      user = await User.create({
        phone: '9999999991',
        name: 'Test Customer Rahul',
        email: 'rahul.test@zippto.com',
        isVerified: true
      });
    }
    const userToken = generateAccessToken({ userId: user._id, role: 'USER' });
    const userActor = { id: user._id.toString(), role: 'USER', name: user.name };

    // 2. Setup/Find Test Vendor
    let vendor = await Vendor.findOne({ phone: '9999999992' });
    if (!vendor) {
      vendor = await Vendor.create({
        phone: '9999999992',
        name: 'Test Partner Amit Sharma',
        businessName: 'Amit Electrical Solutions',
        email: 'amit.vendor@zippto.com',
        status: 'ACTIVE',
        isVerified: true,
        kycStatus: 'APPROVED'
      });
    }
    const vendorToken = generateAccessToken({ userId: vendor._id, role: 'VENDOR' });
    const vendorActor = { id: vendor._id.toString(), role: 'VENDOR', name: vendor.name };

    // 3. Setup/Find Test Admin
    let admin = await Admin.findOne({ email: 'admin@zippto.com' });
    if (!admin) {
      admin = await Admin.findOne();
    }
    const adminActor = { id: admin ? admin._id.toString() : new mongoose.Types.ObjectId().toString(), role: 'ADMIN', name: 'Super Admin' };

    console.log(`👤 Customer: ${user.name} (${user._id})`);
    console.log(`🏪 Vendor: ${vendor.name} (${vendor._id})`);
    console.log(`🛡️ Admin: ${adminActor.name} (${adminActor.id})`);

    // 4. Create an active Test Booking
    let service = await mongoose.model('UserService').findOne();
    if (!service) {
      service = await mongoose.model('Service').findOne();
    }
    const serviceId = service ? service._id : new mongoose.Types.ObjectId();

    const bookingNumber = `TEST-CHAT-${Date.now().toString().slice(-6)}`;
    const booking = await Booking.create({
      bookingNumber,
      userId: user._id,
      vendorId: vendor._id,
      serviceId,
      customerName: user.name,
      customerPhone: user.phone,
      serviceName: 'AC Deep Cleaning & Filter Service',
      serviceCategory: 'Appliance Repair',
      basePrice: 799,
      finalAmount: 799,
      status: 'in_progress',
      scheduledDate: new Date(),
      scheduledTime: '02:00 PM',
      timeSlot: {
        start: '14:00',
        end: '16:00'
      },
      address: {
        addressLine1: 'Flat 402, Lotus Pride Apartments',
        city: 'Indore',
        state: 'Madhya Pradesh',
        pincode: '452001'
      }
    });

    console.log(`\n📋 Created Test Booking #${booking.bookingNumber} (${booking._id}) in status '${booking.status}'`);

    // Clean previous test messages for this booking if any
    await ChatMessage.deleteMany({ bookingId: booking._id });

    // 5. Test Step 1: Customer sends a message
    console.log('\n--- Step 1: Customer sending message ---');
    const clientMsgId1 = `msg_${Date.now()}_1`;
    const userMsgResult = await chatService.createMessage({
      bookingId: booking._id.toString(),
      actor: userActor,
      clientMessageId: clientMsgId1,
      type: 'TEXT',
      text: 'Hello, please confirm if you have reached the main apartment gate?'
    });

    console.log('✅ Customer message created:', {
      id: userMsgResult.message._id,
      senderRole: userMsgResult.message.senderRole,
      senderName: userMsgResult.message.senderName,
      text: userMsgResult.message.text
    });

    // 6. Test Step 2: Vendor sends a reply with photo attachment
    console.log('\n--- Step 2: Vendor sending reply with photo ---');
    const clientMsgId2 = `msg_${Date.now()}_2`;
    const vendorMsgResult = await chatService.createMessage({
      bookingId: booking._id.toString(),
      actor: vendorActor,
      clientMessageId: clientMsgId2,
      type: 'IMAGE_WITH_TEXT',
      text: "Yes, I'm at Tower B entrance. Taking the lift to 4th floor now.",
      mediaUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg'
    });

    console.log('✅ Vendor reply created:', {
      id: vendorMsgResult.message._id,
      senderRole: vendorMsgResult.message.senderRole,
      senderName: vendorMsgResult.message.senderName,
      text: vendorMsgResult.message.text,
      mediaUrl: vendorMsgResult.message.mediaUrl
    });

    // 7. Test Step 3: Idempotency Check (Customer re-sends same clientMessageId)
    console.log('\n--- Step 3: Testing Idempotency & Duplicate Prevention ---');
    const duplicateCheck = await chatService.createMessage({
      bookingId: booking._id.toString(),
      actor: userActor,
      clientMessageId: clientMsgId1,
      type: 'TEXT',
      text: 'Hello, please confirm if you have reached the main apartment gate?'
    });

    console.log(`✅ Idempotency check result: isDuplicate = ${duplicateCheck.isDuplicate}`);
    if (!duplicateCheck.isDuplicate) {
      throw new Error('Duplicate message was not prevented by clientMessageId!');
    }

    // 8. Test Step 4: Mark Messages Read by Customer
    console.log('\n--- Step 4: Testing Read Receipts ---');
    const readResult = await chatService.markMessagesRead(
      booking._id.toString(),
      userActor,
      [vendorMsgResult.message._id.toString()]
    );
    console.log(`✅ Customer marked vendor message as read (Modified count: ${readResult.updatedCount})`);

    // 9. Test Step 5: Admin Audits / Views Full Chat History
    console.log('\n--- Step 5: Admin Live Chat Oversight & History Audit ---');
    const adminChatHistory = await chatService.getChatHistory(booking._id.toString(), adminActor);

    console.log(`✅ Admin retrieved chat history: ${adminChatHistory.messages.length} messages found`);
    adminChatHistory.messages.forEach((msg, idx) => {
      console.log(`   [${idx + 1}] [${msg.senderRole}] ${msg.senderName}: "${msg.text}" ${msg.mediaUrl ? '📷 ' + msg.mediaUrl : ''} (Read by ${msg.readBy?.length || 0} participants)`);
    });

    // 10. Test Step 6: Admin Intervenes / Sends Support Message
    console.log('\n--- Step 6: Admin Sending Support Intervention Message ---');
    const clientMsgId3 = `msg_${Date.now()}_3`;
    const adminMsgResult = await chatService.createMessage({
      bookingId: booking._id.toString(),
      actor: adminActor,
      clientMessageId: clientMsgId3,
      type: 'TEXT',
      text: '[Zippto Support] Live assistance active for Booking #' + booking.bookingNumber
    });
    console.log('✅ Admin support message created:', {
      id: adminMsgResult.message._id,
      senderRole: adminMsgResult.message.senderRole,
      senderName: adminMsgResult.message.senderName,
      text: adminMsgResult.message.text
    });

    // 11. Cleanup test booking
    await ChatMessage.deleteMany({ bookingId: booking._id });
    await Booking.findByIdAndDelete(booking._id);
    console.log('\n🧹 Cleaned up temporary test booking and messages.');

    console.log('\n🎉 ========================================================');
    console.log('🎉 ALL IN-APP REAL-TIME CHAT & ADMIN OVERSIGHT TESTS PASSED!');
    console.log('🎉 ========================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Chat Test Failed:', error);
    process.exit(1);
  }
};

runTest();
