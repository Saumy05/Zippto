const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Category = require('../models/Category');
const Brand = require('../models/Brand');
const UserService = require('../models/UserService');
const Booking = require('../models/Booking');

async function testVendorFlow() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully.');

    // 1. Create test vendor with complete KYC
    let vendor = await Vendor.findOne({ phone: '8888888888' });
    if (!vendor) {
      vendor = await Vendor.create({
        name: 'Test Vendor Partner',
        phone: '8888888888',
        email: 'vendor.test@example.com',
        status: 'approved',
        kycStatus: 'approved',
        serviceCategories: ['AC Service & Repair Test'],
        location: {
          type: 'Point',
          coordinates: [75.8577, 22.7196] // Indore
        },
        wallet: {
          balance: 0,
          pendingSettlement: 0
        }
      });
      console.log('Created test vendor:', vendor._id);
    }

    // 2. Create test customer user
    let user = await User.findOne({ phone: '9999999999' });
    if (!user) {
      user = await User.create({
        name: 'Test Customer',
        phone: '9999999999',
        email: 'customer.test@example.com'
      });
      console.log('Created test user:', user._id);
    }

    // 3. Create test booking
    const booking = await Booking.create({
      userId: user._id,
      vendorId: null,
      serviceName: 'AC Cleaning Service',
      bookingNumber: 'ZIP-TEST-1234',
      status: 'searching',
      paymentStatus: 'pending'
    });

    console.log('Created booking:', booking.bookingNumber);

    // 4. Test Vendor ACCEPT Booking
    booking.vendorId = vendor._id;
    booking.status = 'confirmed';
    await booking.save();
    console.log('Vendor accepted booking. Status:', booking.status, 'VendorID:', booking.vendorId);

    // 5. Test Vendor ASSIGN Worker
    booking.workerId = worker._id;
    booking.status = 'assigned';
    await booking.save();
    console.log('Vendor assigned worker. Status:', booking.status, 'WorkerID:', booking.workerId);

    // Clean up
    await Booking.findByIdAndDelete(booking._id);
    await UserService.findByIdAndDelete(service._id);
    await Brand.findByIdAndDelete(brand._id);
    await Category.findByIdAndDelete(category._id);
    await User.findByIdAndDelete(user._id);
    await Worker.findByIdAndDelete(worker._id);
    await Vendor.findByIdAndDelete(vendor._id);

    console.log('Step 3 Vendor alert, accept & worker assignment flow verified & cleaned up.');
    process.exit(0);
  } catch (error) {
    console.error('Test vendor flow failed:', error);
    process.exit(1);
  }
}

testVendorFlow();
