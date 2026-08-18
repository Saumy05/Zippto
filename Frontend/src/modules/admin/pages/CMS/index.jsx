import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiFileText, FiPlus, FiEdit2, FiTrash2, FiSearch, FiEye,
  FiCheck, FiX, FiImage, FiHelpCircle, FiLayers, FiGlobe,
  FiExternalLink, FiClock, FiTag, FiTrendingUp, FiSave
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { adminTheme as themeColors } from '../../../../theme';
import AdminHeader from '../../components/layout/AdminHeader';
import cmsService from '../../../../services/cmsService';

const BLOG_CATEGORIES = [
  'Home Cleaning',
  'Appliance Care',
  'Electrical Safety',
  'Plumbing & Water',
  'Salon & Beauty',
  'Pest Control',
  'Interior & Painting',
  'Company News'
];

const FAQ_CATEGORIES = [
  'Bookings & Scheduling',
  'Pricing & Payments',
  'Service Guarantee',
  'Safety & Security',
  'Vendor & Partner FAQ',
  'General'
];

export default function CMSManagement() {
  const [activeTab, setActiveTab] = useState('blogs'); // 'blogs' | 'pages' | 'faqs'

  // Blogs State
  const [blogs, setBlogs] = useState([]);
  const [blogPagination, setBlogPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [blogSearch, setBlogSearch] = useState('');
  const [blogCategoryFilter, setBlogCategoryFilter] = useState('all');
  const [loadingBlogs, setLoadingBlogs] = useState(true);
  const [isBlogModalOpen, setIsBlogModalOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState(null);
  const [blogFormData, setBlogFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    featuredImage: '',
    category: 'Home Cleaning',
    tags: '',
    status: 'draft',
    isFeatured: false,
    metaTitle: '',
    metaDescription: '',
    authorName: 'Zippto Team',
    authorRole: 'Home Care Specialist'
  });
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverProgress, setCoverProgress] = useState(0);

  // Pages State
  const [pages, setPages] = useState([]);
  const [loadingPages, setLoadingPages] = useState(true);
  const [isPageModalOpen, setIsPageModalOpen] = useState(false);
  const [editingPage, setEditingPage] = useState(null);
  const [pageFormData, setPageFormData] = useState({
    title: '',
    slug: '',
    section: 'policy',
    content: '',
    metaTitle: '',
    metaDescription: '',
    status: 'published'
  });

  // FAQs State
  const [faqs, setFaqs] = useState([]);
  const [loadingFaqs, setLoadingFaqs] = useState(true);
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);
  const [faqFormData, setFaqFormData] = useState({
    question: '',
    answer: '',
    category: 'Bookings & Scheduling',
    order: 0,
    isPopular: false,
    status: 'active'
  });

  const fileInputRef = useRef(null);

  // Load Blogs
  const loadBlogs = useCallback(async () => {
    try {
      setLoadingBlogs(true);
      const res = await cmsService.getAdminBlogs({
        search: blogSearch,
        category: blogCategoryFilter !== 'all' ? blogCategoryFilter : undefined,
        page: blogPagination.page,
        limit: 10
      });
      if (res.success && res.data) {
        setBlogs(res.data.posts || []);
        setBlogPagination(res.data.pagination || { page: 1, total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error('Error loading blogs:', err);
      toast.error('Failed to load blogs');
    } finally {
      setLoadingBlogs(false);
    }
  }, [blogSearch, blogCategoryFilter, blogPagination.page]);

  // Load Pages
  const loadPages = async () => {
    try {
      setLoadingPages(true);
      const res = await cmsService.getAdminPages();
      if (res.success && res.data) {
        setPages(res.data || []);
      }
    } catch (err) {
      console.error('Error loading pages:', err);
      toast.error('Failed to load pages');
    } finally {
      setLoadingPages(false);
    }
  };

  // Load FAQs
  const loadFaqs = async () => {
    try {
      setLoadingFaqs(true);
      const res = await cmsService.getAdminFAQs();
      if (res.success && res.data) {
        setFaqs(res.data.faqs || []);
      }
    } catch (err) {
      console.error('Error loading FAQs:', err);
      toast.error('Failed to load FAQs');
    } finally {
      setLoadingFaqs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'blogs') loadBlogs();
    if (activeTab === 'pages') loadPages();
    if (activeTab === 'faqs') loadFaqs();
  }, [activeTab, loadBlogs]);

  // Handle Cover Upload
  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingCover(true);
      setCoverProgress(15);
      const url = await cmsService.uploadBlogCover(file, (p) => setCoverProgress(p));
      setBlogFormData(prev => ({ ...prev, featuredImage: url }));
      toast.success('Cover image uploaded!');
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Failed to upload cover image');
    } finally {
      setUploadingCover(false);
      setCoverProgress(0);
    }
  };

  // Open Blog Modal for Create / Edit
  const handleOpenBlogModal = (blog = null) => {
    if (blog) {
      setEditingBlog(blog);
      setBlogFormData({
        title: blog.title,
        slug: blog.slug,
        excerpt: blog.excerpt || '',
        content: blog.content || '',
        featuredImage: blog.featuredImage || '',
        category: blog.category || 'Home Cleaning',
        tags: (blog.tags || []).join(', '),
        status: blog.status || 'draft',
        isFeatured: Boolean(blog.isFeatured),
        metaTitle: blog.metaTitle || '',
        metaDescription: blog.metaDescription || '',
        authorName: blog.author?.name || 'Zippto Team',
        authorRole: blog.author?.role || 'Home Care Specialist'
      });
    } else {
      setEditingBlog(null);
      setBlogFormData({
        title: '',
        slug: '',
        excerpt: '',
        content: '',
        featuredImage: '',
        category: 'Home Cleaning',
        tags: '',
        status: 'published',
        isFeatured: false,
        metaTitle: '',
        metaDescription: '',
        authorName: 'Zippto Team',
        authorRole: 'Home Care Specialist'
      });
    }
    setIsBlogModalOpen(true);
  };

  // Save Blog Article
  const handleSaveBlog = async (e) => {
    e.preventDefault();
    if (!blogFormData.title.trim() || !blogFormData.content.trim()) {
      toast.error('Title and Content are required');
      return;
    }

    try {
      const payload = {
        ...blogFormData,
        tags: blogFormData.tags.split(',').map(t => t.trim()).filter(Boolean),
        author: {
          name: blogFormData.authorName,
          role: blogFormData.authorRole
        }
      };

      if (editingBlog) {
        await cmsService.updateAdminBlog(editingBlog._id, payload);
        toast.success('Blog article updated!');
      } else {
        await cmsService.createAdminBlog(payload);
        toast.success('Blog article created!');
      }

      setIsBlogModalOpen(false);
      loadBlogs();
    } catch (err) {
      console.error('Save blog error:', err);
      toast.error(err.message || 'Failed to save blog article');
    }
  };

  // Delete Blog Article
  const handleDeleteBlog = async (id) => {
    if (!window.confirm('Are you sure you want to delete this article?')) return;
    try {
      await cmsService.deleteAdminBlog(id);
      toast.success('Article deleted');
      loadBlogs();
    } catch (err) {
      toast.error('Failed to delete article');
    }
  };

  // Open Page Modal
  const handleOpenPageModal = (page = null) => {
    if (page) {
      setEditingPage(page);
      setPageFormData({
        title: page.title,
        slug: page.slug,
        section: page.section || 'policy',
        content: page.content || '',
        metaTitle: page.metaTitle || '',
        metaDescription: page.metaDescription || '',
        status: page.status || 'published'
      });
    } else {
      setEditingPage(null);
      setPageFormData({
        title: '',
        slug: '',
        section: 'policy',
        content: '',
        metaTitle: '',
        metaDescription: '',
        status: 'published'
      });
    }
    setIsPageModalOpen(true);
  };

  // Save Page
  const handleSavePage = async (e) => {
    e.preventDefault();
    if (!pageFormData.title.trim() || !pageFormData.content.trim()) {
      toast.error('Title and Content are required');
      return;
    }

    try {
      await cmsService.upsertAdminPage(pageFormData.slug || pageFormData.title, pageFormData);
      toast.success('Page saved successfully!');
      setIsPageModalOpen(false);
      loadPages();
    } catch (err) {
      console.error('Save page error:', err);
      toast.error(err.message || 'Failed to save page');
    }
  };

  // Open FAQ Modal
  const handleOpenFaqModal = (faq = null) => {
    if (faq) {
      setEditingFaq(faq);
      setFaqFormData({
        question: faq.question,
        answer: faq.answer,
        category: faq.category || 'Bookings & Scheduling',
        order: faq.order || 0,
        isPopular: Boolean(faq.isPopular),
        status: faq.status || 'active'
      });
    } else {
      setEditingFaq(null);
      setFaqFormData({
        question: '',
        answer: '',
        category: 'Bookings & Scheduling',
        order: faqs.length + 1,
        isPopular: false,
        status: 'active'
      });
    }
    setIsFaqModalOpen(true);
  };

  // Save FAQ
  const handleSaveFaq = async (e) => {
    e.preventDefault();
    if (!faqFormData.question.trim() || !faqFormData.answer.trim()) {
      toast.error('Question and Answer are required');
      return;
    }

    try {
      const payload = {
        ...faqFormData,
        _id: editingFaq?._id
      };
      await cmsService.upsertAdminFAQ(payload);
      toast.success('FAQ saved successfully!');
      setIsFaqModalOpen(false);
      loadFaqs();
    } catch (err) {
      console.error('Save FAQ error:', err);
      toast.error(err.message || 'Failed to save FAQ');
    }
  };

  // Delete FAQ
  const handleDeleteFaq = async (id) => {
    if (!window.confirm('Delete this FAQ?')) return;
    try {
      await cmsService.deleteAdminFAQ(id);
      toast.success('FAQ deleted');
      loadFaqs();
    } catch (err) {
      toast.error('Failed to delete FAQ');
    }
  };

  // Auto slug generation helper
  const handleTitleChange = (val) => {
    setBlogFormData(prev => ({
      ...prev,
      title: val,
      slug: !editingBlog ? val.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '') : prev.slug
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <AdminHeader title="CMS & Content Studio" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-white p-2 rounded-2xl shadow-2xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('blogs')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'blogs'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <FiFileText className="w-4 h-4" />
              <span>Blog Articles ({blogPagination.total})</span>
            </button>

            <button
              onClick={() => setActiveTab('pages')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'pages'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <FiLayers className="w-4 h-4" />
              <span>Policy & Custom Pages ({pages.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('faqs')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'faqs'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <FiHelpCircle className="w-4 h-4" />
              <span>FAQs & Knowledge Base ({faqs.length})</span>
            </button>
          </div>

          <div>
            {activeTab === 'blogs' && (
              <button
                onClick={() => handleOpenBlogModal()}
                className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <FiPlus className="w-4 h-4" />
                <span>New Article</span>
              </button>
            )}

            {activeTab === 'pages' && (
              <button
                onClick={() => handleOpenPageModal()}
                className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <FiPlus className="w-4 h-4" />
                <span>New Page</span>
              </button>
            )}

            {activeTab === 'faqs' && (
              <button
                onClick={() => handleOpenFaqModal()}
                className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <FiPlus className="w-4 h-4" />
                <span>New FAQ</span>
              </button>
            )}
          </div>
        </div>

        {/* ========================================== */}
        {/* TAB 1: 📰 BLOG ARTICLES TAB */}
        {/* ========================================== */}
        {activeTab === 'blogs' && (
          <div className="space-y-4">
            {/* Filter & Search Bar */}
            <div className="bg-white p-4 rounded-2xl shadow-2xs border border-gray-100 flex flex-wrap items-center justify-between gap-4">
              <div className="relative flex-1 min-w-[240px]">
                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search articles by title, keyword or tag..."
                  value={blogSearch}
                  onChange={(e) => setBlogSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-teal-500 transition-all"
                />
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={blogCategoryFilter}
                  onChange={(e) => setBlogCategoryFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none"
                >
                  <option value="all">All Categories</option>
                  {BLOG_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                <a
                  href="/blog"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <span>Public View</span>
                  <FiExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Articles Table */}
            <div className="bg-white rounded-2xl shadow-2xs border border-gray-100 overflow-hidden">
              {loadingBlogs ? (
                <div className="p-12 text-center text-xs text-gray-400">Loading blog articles...</div>
              ) : blogs.length === 0 ? (
                <div className="p-12 text-center text-gray-400 text-xs">
                  No articles found. Click "New Article" to write your first post.
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                      <th className="px-6 py-3">Article</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Views</th>
                      <th className="px-4 py-3">Published</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {blogs.map((b) => (
                      <tr key={b._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-slate-100 shrink-0 overflow-hidden border border-gray-200">
                              {b.featuredImage ? (
                                <img src={b.featuredImage} alt={b.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">📰</div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h4 className="font-bold text-gray-900 truncate">{b.title}</h4>
                                {b.isFeatured && (
                                  <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[9px] font-extrabold uppercase">
                                    Featured
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-400 text-[11px] truncate">/{b.slug} • {b.readingTime} min read</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold text-[11px]">
                            {b.category}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            b.status === 'published'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 font-semibold text-gray-700">
                          {b.viewsCount || 0}
                        </td>
                        <td className="px-4 py-4 text-gray-500 text-[11px]">
                          {b.publishedAt ? new Date(b.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Draft'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <a
                              href={`/blog/${b.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                              title="Preview Article"
                            >
                              <FiEye className="w-4 h-4" />
                            </a>
                            <button
                              onClick={() => handleOpenBlogModal(b)}
                              className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Edit Article"
                            >
                              <FiEdit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteBlog(b._id)}
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Article"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 2: 📄 DYNAMIC PAGES & POLICIES TAB */}
        {/* ========================================== */}
        {activeTab === 'pages' && (
          <div className="bg-white rounded-2xl shadow-2xs border border-gray-100 overflow-hidden">
            {loadingPages ? (
              <div className="p-12 text-center text-xs text-gray-400">Loading custom pages...</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    <th className="px-6 py-3">Page Title</th>
                    <th className="px-4 py-3">Slug</th>
                    <th className="px-4 py-3">Section</th>
                    <th className="px-4 py-3">Last Updated</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {pages.map((page) => (
                    <tr key={page.slug} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-900">
                        {page.title}
                      </td>
                      <td className="px-4 py-4 text-teal-600 font-mono text-[11px]">
                        /page/{page.slug}
                      </td>
                      <td className="px-4 py-4">
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold text-[11px] uppercase">
                          {page.section}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-gray-500 text-[11px]">
                        {new Date(page.updatedAt || page.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={`/page/${page.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                            title="View Page"
                          >
                            <FiExternalLink className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => handleOpenPageModal(page)}
                            className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit Page"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 3: ❓ FAQS & KNOWLEDGE BASE TAB */}
        {/* ========================================== */}
        {activeTab === 'faqs' && (
          <div className="bg-white rounded-2xl shadow-2xs border border-gray-100 overflow-hidden">
            {loadingFaqs ? (
              <div className="p-12 text-center text-xs text-gray-400">Loading FAQs...</div>
            ) : faqs.length === 0 ? (
              <div className="p-12 text-center text-gray-400 text-xs">No FAQs found.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {faqs.map((faq) => (
                  <div key={faq._id} className="p-5 flex items-start justify-between gap-4 hover:bg-slate-50/70 transition-colors">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 text-[10px] font-bold">
                          {faq.category}
                        </span>
                        {faq.isPopular && (
                          <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[9px] font-extrabold uppercase">
                            Popular
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-gray-900 text-sm">{faq.question}</h4>
                      <p className="text-xs text-gray-600 leading-relaxed">{faq.answer}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleOpenFaqModal(faq)}
                        className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <FiEdit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteFaq(faq._id)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ========================================== */}
      {/* 📰 CREATE / EDIT BLOG MODAL */}
      {/* ========================================== */}
      <AnimatePresence>
        {isBlogModalOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBlogModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-10 w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
                <h3 className="font-extrabold text-gray-900 text-base">
                  {editingBlog ? 'Edit Blog Article' : 'Write New Blog Article'}
                </h3>
                <button onClick={() => setIsBlogModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600">
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveBlog} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
                {/* Title & Slug */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Article Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 10 Essential AC Maintenance Tips"
                      value={blogFormData.title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-teal-500 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">URL Slug</label>
                    <input
                      type="text"
                      placeholder="10-essential-ac-maintenance-tips"
                      value={blogFormData.slug}
                      onChange={(e) => setBlogFormData(prev => ({ ...prev, slug: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl font-mono text-teal-700"
                    />
                  </div>
                </div>

                {/* Category & Tags */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Category *</label>
                    <select
                      value={blogFormData.category}
                      onChange={(e) => setBlogFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl font-semibold"
                    >
                      {BLOG_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Tags (Comma Separated)</label>
                    <input
                      type="text"
                      placeholder="ac repair, summer, energy saving"
                      value={blogFormData.tags}
                      onChange={(e) => setBlogFormData(prev => ({ ...prev, tags: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl"
                    />
                  </div>
                </div>

                {/* Cover Image Upload */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Cover / Featured Image</label>
                  <div className="flex items-center gap-4">
                    {blogFormData.featuredImage && (
                      <img src={blogFormData.featuredImage} alt="Cover" className="w-24 h-16 rounded-xl object-cover border border-gray-200" />
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingCover}
                      className="px-4 py-2.5 rounded-xl border border-dashed border-gray-300 hover:border-teal-500 bg-slate-50 text-gray-600 flex items-center gap-2 cursor-pointer"
                    >
                      <FiImage className="w-4 h-4 text-teal-600" />
                      <span>{uploadingCover ? `Uploading (${coverProgress}%)...` : 'Upload Cover Image'}</span>
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
                  </div>
                </div>

                {/* Excerpt */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Excerpt / Brief Summary</label>
                  <textarea
                    rows={2}
                    placeholder="Short engaging summary for blog listing cards..."
                    value={blogFormData.excerpt}
                    onChange={(e) => setBlogFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl resize-none"
                  />
                </div>

                {/* Content (Markdown/HTML) */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Article Content (Markdown Supported) *</label>
                  <textarea
                    rows={10}
                    required
                    placeholder="Write your article in Markdown (### Headings, **bold**, - lists, etc.)..."
                    value={blogFormData.content}
                    onChange={(e) => setBlogFormData(prev => ({ ...prev, content: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl font-mono text-xs leading-relaxed"
                  />
                </div>

                {/* Publishing Controls */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-gray-200 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700">
                      <input
                        type="checkbox"
                        checked={blogFormData.status === 'published'}
                        onChange={(e) => setBlogFormData(prev => ({ ...prev, status: e.target.checked ? 'published' : 'draft' }))}
                        className="w-4 h-4 text-teal-600 rounded"
                      />
                      <span>Publish Immediately</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700">
                      <input
                        type="checkbox"
                        checked={blogFormData.isFeatured}
                        onChange={(e) => setBlogFormData(prev => ({ ...prev, isFeatured: e.target.checked }))}
                        className="w-4 h-4 text-teal-600 rounded"
                      />
                      <span>Featured on Hero</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsBlogModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <FiSave className="w-4 h-4" />
                      <span>{editingBlog ? 'Update Article' : 'Publish Article'}</span>
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================== */}
      {/* 📄 PAGE EDITOR MODAL */}
      {/* ========================================== */}
      <AnimatePresence>
        {isPageModalOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPageModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-10 w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
                <h3 className="font-extrabold text-gray-900 text-base">
                  {editingPage ? `Edit Page: ${editingPage.title}` : 'Create Dynamic Page'}
                </h3>
                <button onClick={() => setIsPageModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600">
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSavePage} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Page Title *</label>
                    <input
                      type="text"
                      required
                      value={pageFormData.title}
                      onChange={(e) => setPageFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Slug *</label>
                    <input
                      type="text"
                      required
                      value={pageFormData.slug}
                      onChange={(e) => setPageFormData(prev => ({ ...prev, slug: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl font-mono text-teal-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Page Content (Markdown) *</label>
                  <textarea
                    rows={12}
                    required
                    value={pageFormData.content}
                    onChange={(e) => setPageFormData(prev => ({ ...prev, content: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl font-mono text-xs leading-relaxed"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsPageModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <FiSave className="w-4 h-4" />
                    <span>Save Page</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================== */}
      {/* ❓ FAQ EDITOR MODAL */}
      {/* ========================================== */}
      <AnimatePresence>
        {isFaqModalOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFaqModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-10 w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
                <h3 className="font-extrabold text-gray-900 text-base">
                  {editingFaq ? 'Edit FAQ' : 'Add FAQ'}
                </h3>
                <button onClick={() => setIsFaqModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600">
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveFaq} className="p-6 space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Category *</label>
                  <select
                    value={faqFormData.category}
                    onChange={(e) => setFaqFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl font-semibold"
                  >
                    {FAQ_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Question *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. How does the 30-day warranty work?"
                    value={faqFormData.question}
                    onChange={(e) => setFaqFormData(prev => ({ ...prev, question: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Answer *</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Detailed helpful answer..."
                    value={faqFormData.answer}
                    onChange={(e) => setFaqFormData(prev => ({ ...prev, answer: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl leading-relaxed"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 font-bold text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={faqFormData.isPopular}
                      onChange={(e) => setFaqFormData(prev => ({ ...prev, isPopular: e.target.checked }))}
                      className="w-4 h-4 text-teal-600 rounded"
                    />
                    <span>Highlight as Popular FAQ</span>
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsFaqModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <FiSave className="w-4 h-4" />
                    <span>Save FAQ</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
