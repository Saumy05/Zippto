const mongoose = require('mongoose');

/**
 * FAQ Model
 * Manages categorized FAQs dynamically rendered across the platform.
 */
const faqSchema = new mongoose.Schema({
  question: {
    type: String,
    required: [true, 'Question is required'],
    trim: true
  },
  answer: {
    type: String,
    required: [true, 'Answer is required'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
    index: true,
    default: 'General'
  },
  order: {
    type: Number,
    default: 0
  },
  isPopular: {
    type: Boolean,
    default: false,
    index: true
  },
  status: {
    type: String,
    enum: ['active', 'hidden'],
    default: 'active',
    index: true
  }
}, {
  timestamps: true
});

faqSchema.index({ category: 1, order: 1 });

module.exports = mongoose.model('FAQ', faqSchema);
