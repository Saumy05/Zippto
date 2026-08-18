const mongoose = require('mongoose');

/**
 * BlogPost Model
 * Manages SEO-friendly, rich content blog articles and company announcements.
 */
const blogPostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Blog title is required'],
    trim: true,
    index: true
  },
  slug: {
    type: String,
    required: [true, 'Slug is required'],
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  excerpt: {
    type: String,
    trim: true,
    maxlength: [400, 'Excerpt cannot exceed 400 characters'],
    default: ''
  },
  content: {
    type: String,
    required: [true, 'Blog content is required']
  },
  featuredImage: {
    type: String,
    default: null
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
    index: true,
    default: 'General'
  },
  tags: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  author: {
    name: {
      type: String,
      default: 'Zippto Editorial Team'
    },
    role: {
      type: String,
      default: 'Home Care Specialist'
    },
    avatar: {
      type: String,
      default: null
    }
  },
  readingTime: {
    type: Number,
    default: 3 // in minutes
  },
  metaTitle: {
    type: String,
    trim: true,
    default: ''
  },
  metaDescription: {
    type: String,
    trim: true,
    default: ''
  },
  metaKeywords: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft',
    index: true
  },
  isFeatured: {
    type: Boolean,
    default: false,
    index: true
  },
  viewsCount: {
    type: Number,
    default: 0,
    min: 0
  },
  publishedAt: {
    type: Date,
    default: null,
    index: true
  }
}, {
  timestamps: true
});

// Full-text search index
blogPostSchema.index({
  title: 'text',
  excerpt: 'text',
  content: 'text',
  tags: 'text'
});

// Compound index for public listings
blogPostSchema.index({ status: 1, publishedAt: -1 });
blogPostSchema.index({ status: 1, category: 1, publishedAt: -1 });

module.exports = mongoose.model('BlogPost', blogPostSchema);
