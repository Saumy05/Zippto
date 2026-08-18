const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/authMiddleware');
const {
  getAdminBlogs,
  createAdminBlog,
  updateAdminBlog,
  deleteAdminBlog,
  getAdminPages,
  upsertAdminPage,
  deleteAdminPage,
  getAdminFAQs,
  upsertAdminFAQ,
  deleteAdminFAQ
} = require('../../controllers/cmsController');

// All Admin CMS routes require admin authentication
router.use(authenticate);
router.use(authorize('admin', 'super_admin', 'ADMIN'));

// 📰 Blog Management
router.get('/blogs', getAdminBlogs);
router.post('/blogs', createAdminBlog);
router.put('/blogs/:id', updateAdminBlog);
router.delete('/blogs/:id', deleteAdminBlog);

// 📄 Dynamic Page / Policy Management
router.get('/pages', getAdminPages);
router.post('/pages', (req, res) => upsertAdminPage(req, res));
router.put('/pages/:slug', upsertAdminPage);
router.delete('/pages/:slug', deleteAdminPage);

// ❓ FAQ Management
router.get('/faqs', getAdminFAQs);
router.post('/faqs', upsertAdminFAQ);
router.put('/faqs/:id', (req, res) => {
  req.body._id = req.params.id;
  return upsertAdminFAQ(req, res);
});
router.delete('/faqs/:id', deleteAdminFAQ);

module.exports = router;
