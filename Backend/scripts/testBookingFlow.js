const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const Category = require('../models/Category');
const Brand = require('../models/Brand');
const UserService = require('../models/UserService');
const Coupon = require('../models/Coupon');
const Booking = require('../models/Booking');

async function testBookingFlow() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully.');

    // 1. Create or find test user
    let user = await User.findOne({ phone: '9999999999' });
    if (!user) {
      user = await User.create({
        name: 'Test Customer',
        phone: '9999999999',
        isVerified: true
      });
      console.log('Created test user:', user._id);
    }

    // 2. Create or find test category
    let category = await Category.findOne({ slug: 'test-ac-service' });
    if (!category) {
      category = await Category.create({
        title: 'AC Service & Repair Test',
        slug: 'test-ac-service',
        status: 'active',
        showOnHome: true
      });
      console.log('Created test category:', category._id);
    }

    // 3. Create or find test brand
    let brand = await Brand.findOne({ slug: 'test-brand-lg' });
    if (!brand) {
      brand = await Brand.create({
        title: 'LG AC Test',
        slug: 'test-brand-lg',
        categoryIds: [category._id],
        status: 'active'
      });
      console.log('Created test brand:', brand._id);
    }

    // 4. Create or find test service
    let service = await UserService.findOne({ title: 'AC General Service Test' });
    if (!service) {
      service = await UserService.create({
        title: 'AC General Service Test',
        categoryId: category._id,
        brandId: brand._id,
        category: category.title,
        basePrice: 499,
        discountPrice: 399,
        description: 'Comprehensive AC servicing and cleaning',
        status: 'active'
      });
      console.log('Created test service:', service._id);
    }

    // 5. Create test coupon
    let coupon = await Coupon.findOne({ code: 'FLOWTEST50' });
    if (!coupon) {
      coupon = await Coupon.create({
        code: 'FLOWTEST50',
        description: 'Get ₹50 off on test booking',
        discountType: 'flat',
        discountValue: 50,
        minOrderValue: 200,
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'active'
      });
      console.log('Created test coupon:', coupon.code);
    }

    // 6. Create test booking
    const bookingNumber = `BKTEST${Date.now()}`;
    const booking = await Booking.create({
      bookingNumber,
      userId: user._id,
      serviceId: service._id,
      categoryId: category._id,
      serviceName: service.title,
      serviceCategory: category.title,
      bookingType: 'scheduled',
      basePrice: 499,
      discount: 50,
      tax: 80,
      visitingCharges: 49,
      finalAmount: 578,
      userPayableAmount: 578,
      address: {
        type: 'home',
        addressLine1: 'Flat 101, Test Residency',
        city: 'Indore',
        state: 'Madhya Pradesh',
        pincode: '452001',
        lat: 22.7196,
        lng: 75.8577
      },
      scheduledDate: new Date(),
      scheduledTime: '10:00 AM - 11:00 AM',
      timeSlot: { start: '10:00', end: '11:00' },
      paymentMethod: 'pay_at_home',
      status: 'searching',
      paymentStatus: 'pending'
    });

    console.log('Successfully created test booking:', booking.bookingNumber, 'ID:', booking._id);

    // Clean up test records
    await Booking.findByIdAndDelete(booking._id);
    await Coupon.findByIdAndDelete(coupon._id);
    await UserService.findByIdAndDelete(service._id);
    await Brand.findByIdAndDelete(brand._id);
    await Category.findByIdAndDelete(category._id);
    await User.findByIdAndDelete(user._id);

    console.log('Step 2 Booking flow verified & cleaned up cleanly.');

    process.exit(0);
  } catch (error) {
    console.error('Test booking flow failed:', error);
    process.exit(1);
  }
}

testBookingFlow();
