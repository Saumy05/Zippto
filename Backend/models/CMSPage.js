const mongoose = require('mongoose');

/**
 * CMSPage Model
 * Manages dynamic legal policies and static informational pages.
 */
const cmsPageSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Page title is required'],
    trim: true
  },
  slug: {
    type: String,
    required: [true, 'Slug is required'],
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  content: {
    type: String,
    required: [true, 'Content is required']
  },
  section: {
    type: String,
    enum: ['policy', 'company', 'help', 'custom'],
    default: 'policy',
    index: true
  },
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'published',
    index: true
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
  lastUpdatedBy: {
    type: String,
    default: 'Admin'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('CMSPage', cmsPageSchema);
