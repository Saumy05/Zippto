const mongoose = require('mongoose');
const crypto = require('crypto');
const dotenv = require('dotenv');
const path = require('path');

// Load env
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = require('../config/db');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Admin = require('../models/Admin');
const Token = require('../models/Token');
const { VENDOR_STATUS } = require('../utils/constants');

const hashOTP = (otp) => {
  return crypto.createHash('sha256').update(otp).digest('hex');
};

const seedLogin = async () => {
  const PHONE = '7389279971';
  const OTP = '123456';
  const PASSWORD = '123456';

  try {
    console.log('🔌 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    // 1. Seed User
    let user = await User.findOne({ phone: PHONE });
    if (user) {
      user.name = 'Test User';
      user.password = PASSWORD;
      user.isPhoneVerified = true;
      user.isEmailVerified = true;
      user.isActive = true;
      await user.save();
      console.log(`✅ Updated existing User for phone ${PHONE}`);
    } else {
      user = await User.create({
        name: 'Test User',
        phone: PHONE,
        email: `user_${PHONE}@zippto.com`,
        password: PASSWORD,
        isPhoneVerified: true,
        isEmailVerified: true,
        isActive: true,
        role: 'user',
        addresses: [
          {
            type: 'home',
            addressLine1: '123 Test Street',
            addressLine2: 'Vijay Nagar',
            city: 'Indore',
            state: 'Madhya Pradesh',
            pincode: '452010',
            landmark: 'Near City Center',
            isDefault: true
          }
        ]
      });
      console.log(`✅ Created new User for phone ${PHONE}`);
    }

    // 2. Seed Vendor
    let vendor = await Vendor.findOne({ phone: PHONE });
    if (vendor) {
      vendor.name = 'Test Vendor';
      vendor.password = PASSWORD;
      vendor.approvalStatus = VENDOR_STATUS.APPROVED || 'approved';
      vendor.isPhoneVerified = true;
      vendor.isEmailVerified = true;
      vendor.isActive = true;
      await vendor.save();
      console.log(`✅ Updated existing Vendor for phone ${PHONE}`);
    } else {
      vendor = await Vendor.create({
        name: 'Test Vendor',
        phone: PHONE,
        email: `vendor_${PHONE}@zippto.com`,
        password: PASSWORD,
        businessName: 'Zippto Test Services',
        service: ['Electricity', 'AC'],
        categories: ['Electricity', 'AC'],
        approvalStatus: VENDOR_STATUS.APPROVED || 'approved',
        isPhoneVerified: true,
        isEmailVerified: true,
        isActive: true,
        role: 'vendor',
        aadhar: {
          number: '123456789012',
          document: 'https://res.cloudinary.com/shubhamcloudinary/image/upload/v1766039523/docs/aadhar_front.png',
          backDocument: 'https://res.cloudinary.com/shubhamcloudinary/image/upload/v1766039523/docs/aadhar_back.png'
        },
        pan: {
          number: 'ABCDE1234F',
          document: 'https://res.cloudinary.com/shubhamcloudinary/image/upload/v1766039523/docs/pan.png'
        },
        address: {
          fullAddress: '456 Commercial Hub, Indore',
          addressLine1: '456 Commercial Hub',
          city: 'Indore',
          state: 'Madhya Pradesh',
          pincode: '452010'
        }
      });
      console.log(`✅ Created new Vendor for phone ${PHONE}`);
    }

    // 4. Seed Admin
    let admin = await Admin.findOne({ $or: [{ phone: PHONE }, { email: 'admin@zippto.com' }, { email: 'admin@admin.com' }] });
    if (admin) {
      admin.name = 'Test Super Admin';
      admin.phone = PHONE;
      admin.email = 'admin@zippto.com';
      admin.password = PASSWORD;
      admin.role = 'super_admin';
      admin.isActive = true;
      await admin.save();
      console.log(`✅ Updated existing Admin for phone ${PHONE}`);
    } else {
      admin = await Admin.create({
        name: 'Test Super Admin',
        phone: PHONE,
        email: 'admin@zippto.com',
        password: PASSWORD,
        role: 'super_admin',
        isActive: true
      });
      console.log(`✅ Created new Admin for phone ${PHONE}`);
    }

    // 5. Seed persistent OTP Token
    const otpHash = hashOTP(OTP);
    await Token.deleteMany({ phone: PHONE, type: 'PHONE_VERIFICATION' });
    await Token.create({
      phone: PHONE,
      type: 'PHONE_VERIFICATION',
      token: otpHash,
      otp: otpHash,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year expiry for test seed
      attempts: 0,
      isUsed: false
    });
    console.log(`✅ Pre-seeded OTP token (${OTP}) in MongoDB for phone ${PHONE}\n`);

    console.log('🎉 Seeding completed successfully!');
    console.log('-------------------------------------------');
    console.log(`Phone:    ${PHONE}`);
    console.log(`OTP:      ${OTP}`);
    console.log(`Password: ${PASSWORD}`);
    console.log('Roles Created/Updated: User, Vendor, Admin');
    console.log('-------------------------------------------\n');

  } catch (error) {
    console.error('❌ Error seeding login:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Connection closed');
    process.exit(0);
  }
};

seedLogin();
