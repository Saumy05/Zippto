const cmsService = require('../services/cmsService');

// ==========================================
// 🌐 PUBLIC CMS CONTROLLERS
// ==========================================

const getPublicBlogs = async (req, res) => {
  try {
    const { category, tag, search, isFeatured, page, limit } = req.query;
    const result = await cmsService.getBlogPosts(
      { category, tag, search, isFeatured, page, limit },
      true
    );
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Get public blogs error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getPublicBlogBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const result = await cmsService.getBlogPostBySlug(slug, true);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Get public blog by slug error:', error);
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

const getPublicPageBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const page = await cmsService.getCMSPageBySlug(slug, true);
    res.status(200).json({ success: true, data: page });
  } catch (error) {
    console.error('Get public page by slug error:', error);
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

const getPublicFAQs = async (req, res) => {
  try {
    const { category, isPopular } = req.query;
    const result = await cmsService.getFAQs({ category, isPopular, isPublic: true });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Get public FAQs error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 🛡️ ADMIN CMS MANAGEMENT CONTROLLERS
// ==========================================

const getAdminBlogs = async (req, res) => {
  try {
    const { category, tag, search, status, isFeatured, page, limit } = req.query;
    const result = await cmsService.getBlogPosts(
      { category, tag, search, status, isFeatured, page, limit },
      false
    );
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Get admin blogs error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const createAdminBlog = async (req, res) => {
  try {
    const blog = await cmsService.createBlogPost(req.body, req.user);
    res.status(201).json({ success: true, message: 'Blog article created successfully', data: blog });
  } catch (error) {
    console.error('Create admin blog error:', error);
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

const updateAdminBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await cmsService.updateBlogPost(id, req.body, req.user);
    res.status(200).json({ success: true, message: 'Blog article updated successfully', data: blog });
  } catch (error) {
    console.error('Update admin blog error:', error);
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

const deleteAdminBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await cmsService.deleteBlogPost(id);
    res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    console.error('Delete admin blog error:', error);
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

const getAdminPages = async (req, res) => {
  try {
    const pages = await cmsService.getAllCMSPages(false);
    res.status(200).json({ success: true, data: pages });
  } catch (error) {
    console.error('Get admin pages error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const upsertAdminPage = async (req, res) => {
  try {
    const { slug } = req.params;
    const page = await cmsService.upsertCMSPage(slug, req.body, req.user);
    res.status(200).json({ success: true, message: 'Page saved successfully', data: page });
  } catch (error) {
    console.error('Upsert admin page error:', error);
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

const deleteAdminPage = async (req, res) => {
  try {
    const { slug } = req.params;
    const result = await cmsService.deleteCMSPage(slug);
    res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    console.error('Delete admin page error:', error);
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

const getAdminFAQs = async (req, res) => {
  try {
    const { category } = req.query;
    const result = await cmsService.getFAQs({ category, isPublic: false });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Get admin FAQs error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const upsertAdminFAQ = async (req, res) => {
  try {
    const faq = await cmsService.upsertFAQ(req.body);
    res.status(200).json({ success: true, message: 'FAQ saved successfully', data: faq });
  } catch (error) {
    console.error('Upsert admin FAQ error:', error);
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

const deleteAdminFAQ = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await cmsService.deleteFAQ(id);
    res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    console.error('Delete admin FAQ error:', error);
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getPublicBlogs,
  getPublicBlogBySlug,
  getPublicPageBySlug,
  getPublicFAQs,
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
};
