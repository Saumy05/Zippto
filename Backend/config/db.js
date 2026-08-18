const mongoose = require('mongoose');

/**
 * Connect to MongoDB
 */
const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI environment variable is missing!');
      return;
    }
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      family: 4 // Use IPv4 to avoid IPv6 DNS delay on Mac
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    // Seed default CMS policies & FAQs if empty
    require('../services/cmsService').seedDefaultsIfEmpty();
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
};

module.exports = connectDB;

