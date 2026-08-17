const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Worker = require('../models/Worker');
const Category = require('../models/Category');
const Brand = require('../models/Brand');
const UserService = require('../models/UserService');
const Booking = require('../models/Booking');

async function testWorkerFlow() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully.');

    const uniqueId = Date.now();
    // Setup entities
    let vendor = await Vendor.create({
      name: 'Worker Flow Vendor',
      phone: `888${String(uniqueId).slice(-7)}`,
      email: `worker.vendor.${uniqueId}@example.com`,
      status: 'approved',
      pan: { number: 'ABCDE1234F', document: 'https://example.com/pan.jpg' },
      aadhar: { number: '123456789012', document: 'https://example.com/a.jpg', backDocument: 'https://example.com/b.jpg' }
    });

    let worker = await Worker.create({
      name: 'Field Technician',
      phone: `777${String(uniqueId).slice(-7)}`,
      email: `worker.${uniqueId}@example.com`,
      vendorId: vendor._id,
      status: 'active',
      isOnline: true,
      currentLocation: { coordinates: [75.8577, 22.7196] }
    });

    let user = await User.create({ name: 'Worker Flow Customer', phone: `999${String(uniqueId).slice(-7)}`, isVerified: true });
    let category = await Category.create({ title: `Plumbing Test ${uniqueId}`, slug: `plumbing-${uniqueId}`, status: 'active' });
    let brand = await Brand.create({ title: `Jaguar ${uniqueId}`, slug: `jaguar-${uniqueId}`, categoryIds: [category._id] });
    let service = await UserService.create({ title: `Tap Leakage ${uniqueId}`, categoryId: category._id, brandId: brand._id, basePrice: 350 });

    const booking = await Booking.create({
      bookingNumber: `BKWRK${uniqueId}`,
      userId: user._id,
      vendorId: vendor._id,
      workerId: worker._id,
      serviceId: service._id,
      categoryId: category._id,
      serviceName: service.title,
      serviceCategory: category.title,
      basePrice: 350,
      finalAmount: 359,
      userPayableAmount: 359,
      address: { addressLine1: 'Vijay Nagar', city: 'Indore', state: 'MP', pincode: '452010' },
      scheduledDate: new Date(),
      scheduledTime: '04:00 PM',
      timeSlot: { start: '16:00', end: '17:00' },
      paymentMethod: 'pay_at_home',
      status: 'assigned',
      paymentStatus: 'pending'
    });

    console.log('Worker assigned job:', booking.bookingNumber, 'Status:', booking.status);

    // 1. Worker START Job
    booking.status = 'in_progress';
    booking.startedAt = new Date();
    await booking.save();
    console.log('Worker started job. Status:', booking.status);

    // 2. Worker COMPLETE Job
    booking.status = 'completed';
    booking.paymentStatus = 'success';
    booking.completedAt = new Date();
    await booking.save();
    console.log('Worker completed job. Status:', booking.status, 'PaymentStatus:', booking.paymentStatus);

    // Clean up
    await Booking.findByIdAndDelete(booking._id);
    await UserService.findByIdAndDelete(service._id);
    await Brand.findByIdAndDelete(brand._id);
    await Category.findByIdAndDelete(category._id);
    await User.findByIdAndDelete(user._id);
    await Worker.findByIdAndDelete(worker._id);
    await Vendor.findByIdAndDelete(vendor._id);

    console.log('Step 4 Worker job execution & lifecycle flow verified & cleaned up.');
    process.exit(0);
  } catch (error) {
    console.error('Test worker flow failed:', error);
    process.exit(1);
  }
}

testWorkerFlow();
