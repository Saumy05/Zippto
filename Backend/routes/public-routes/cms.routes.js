const express = require('express');
const router = express.Router();
const {
  getPublicBlogs,
  getPublicBlogBySlug,
  getPublicPageBySlug,
  getPublicFAQs
} = require('../../controllers/cmsController');

// Public CMS Endpoints
router.get('/blogs', getPublicBlogs);
router.get('/blogs/:slug', getPublicBlogBySlug);
router.get('/pages/:slug', getPublicPageBySlug);
router.get('/faqs', getPublicFAQs);

module.exports = router;
