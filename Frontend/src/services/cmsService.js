import api from './api';
import { uploadToCloudinary } from '../utils/cloudinaryUpload';

export const cmsService = {
  // ==========================================
  // 🌐 PUBLIC CMS ENDPOINTS
  // ==========================================

  getPublicBlogs: async (params = {}) => {
    const res = await api.get('/public/cms/blogs', { params });
    return res.data;
  },

  getPublicBlogBySlug: async (slug) => {
    const res = await api.get(`/public/cms/blogs/${slug}`);
    return res.data;
  },

  getPublicPageBySlug: async (slug) => {
    const res = await api.get(`/public/cms/pages/${slug}`);
    return res.data;
  },

  getPublicFAQs: async (params = {}) => {
    const res = await api.get('/public/cms/faqs', { params });
    return res.data;
  },

  // ==========================================
  // 🛡️ ADMIN CMS MANAGEMENT ENDPOINTS
  // ==========================================

  // Blogs
  getAdminBlogs: async (params = {}) => {
    const res = await api.get('/admin/cms/blogs', { params });
    return res.data;
  },

  createAdminBlog: async (payload) => {
    const res = await api.post('/admin/cms/blogs', payload);
    return res.data;
  },

  updateAdminBlog: async (id, payload) => {
    const res = await api.put(`/admin/cms/blogs/${id}`, payload);
    return res.data;
  },

  deleteAdminBlog: async (id) => {
    const res = await api.delete(`/admin/cms/blogs/${id}`);
    return res.data;
  },

  // Pages & Policies
  getAdminPages: async () => {
    const res = await api.get('/admin/cms/pages');
    return res.data;
  },

  upsertAdminPage: async (slug, payload) => {
    const res = await api.put(`/admin/cms/pages/${slug}`, payload);
    return res.data;
  },

  deleteAdminPage: async (slug) => {
    const res = await api.delete(`/admin/cms/pages/${slug}`);
    return res.data;
  },

  // FAQs
  getAdminFAQs: async (params = {}) => {
    const res = await api.get('/admin/cms/faqs', { params });
    return res.data;
  },

  upsertAdminFAQ: async (payload) => {
    const res = await api.post('/admin/cms/faqs', payload);
    return res.data;
  },

  deleteAdminFAQ: async (id) => {
    const res = await api.delete(`/admin/cms/faqs/${id}`);
    return res.data;
  },

  // Image Upload Utility for CMS
  uploadBlogCover: async (file, onProgress) => {
    return await uploadToCloudinary(file, 'zippto_blogs', onProgress);
  }
};

export default cmsService;
