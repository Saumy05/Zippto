const mongoose = require('mongoose');
const BlogPost = require('../models/BlogPost');
const CMSPage = require('../models/CMSPage');
const FAQ = require('../models/FAQ');

/**
 * Generate URL-friendly slug
 */
const generateSlug = (text) => {
  return (text || '')
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

/**
 * Compute reading time in minutes based on 200 words/min
 */
const calculateReadingTime = (content) => {
  if (!content) return 1;
  const wordCount = content.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200));
};

// ==========================================
// 📰 BLOG ARTICLES SERVICE
// ==========================================

const createBlogPost = async (data, adminUser) => {
  const { title, slug, excerpt, content, featuredImage, category, tags, status, isFeatured, metaTitle, metaDescription, metaKeywords, author } = data;

  let finalSlug = slug ? generateSlug(slug) : generateSlug(title);
  if (!finalSlug) finalSlug = `article-${Date.now()}`;

  // Ensure unique slug
  const existing = await BlogPost.findOne({ slug: finalSlug });
  if (existing) {
    finalSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
  }

  const readingTime = calculateReadingTime(content);
  const isPublished = status === 'published';

  const blog = await BlogPost.create({
    title,
    slug: finalSlug,
    excerpt: excerpt || content.slice(0, 250).replace(/<[^>]*>/g, '') + '...',
    content,
    featuredImage: featuredImage || null,
    category: category || 'Home Improvement',
    tags: Array.isArray(tags) ? tags.map(t => t.toLowerCase().trim()).filter(Boolean) : [],
    author: {
      name: author?.name || adminUser?.name || 'Zippto Editorial',
      role: author?.role || 'Senior Home Expert',
      avatar: author?.avatar || null
    },
    readingTime,
    metaTitle: metaTitle || title,
    metaDescription: metaDescription || excerpt || '',
    metaKeywords: Array.isArray(metaKeywords) ? metaKeywords : [],
    status: status || 'draft',
    isFeatured: Boolean(isFeatured),
    publishedAt: isPublished ? new Date() : null
  });

  return blog;
};

const updateBlogPost = async (id, data, adminUser) => {
  const blog = await BlogPost.findById(id);
  if (!blog) {
    const error = new Error('Blog article not found');
    error.status = 404;
    throw error;
  }

  const { title, slug, excerpt, content, featuredImage, category, tags, status, isFeatured, metaTitle, metaDescription, metaKeywords, author } = data;

  if (title) blog.title = title;
  if (slug && slug !== blog.slug) {
    let finalSlug = generateSlug(slug);
    const existing = await BlogPost.findOne({ slug: finalSlug, _id: { $ne: id } });
    if (existing) finalSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
    blog.slug = finalSlug;
  }
  if (content) {
    blog.content = content;
    blog.readingTime = calculateReadingTime(content);
  }
  if (excerpt !== undefined) blog.excerpt = excerpt;
  if (featuredImage !== undefined) blog.featuredImage = featuredImage;
  if (category) blog.category = category;
  if (tags !== undefined) blog.tags = Array.isArray(tags) ? tags.map(t => t.toLowerCase().trim()).filter(Boolean) : [];
  if (isFeatured !== undefined) blog.isFeatured = Boolean(isFeatured);
  if (metaTitle !== undefined) blog.metaTitle = metaTitle;
  if (metaDescription !== undefined) blog.metaDescription = metaDescription;
  if (metaKeywords !== undefined) blog.metaKeywords = Array.isArray(metaKeywords) ? metaKeywords : [];
  if (author) {
    blog.author = {
      name: author.name || blog.author.name,
      role: author.role || blog.author.role,
      avatar: author.avatar || blog.author.avatar
    };
  }

  if (status && status !== blog.status) {
    blog.status = status;
    if (status === 'published' && !blog.publishedAt) {
      blog.publishedAt = new Date();
    }
  }

  await blog.save();
  return blog;
};

const deleteBlogPost = async (id) => {
  const blog = await BlogPost.findByIdAndDelete(id);
  if (!blog) {
    const error = new Error('Blog article not found');
    error.status = 404;
    throw error;
  }
  return { success: true, message: 'Blog article deleted successfully' };
};

const getBlogPosts = async ({
  category,
  tag,
  search,
  status,
  isFeatured,
  page = 1,
  limit = 12
} = {}, isPublic = true) => {
  const query = {};

  if (isPublic) {
    query.status = 'published';
  } else if (status) {
    query.status = status;
  }

  if (category && category !== 'all' && category !== 'All') {
    query.category = { $regex: new RegExp(`^${category}$`, 'i') };
  }

  if (tag) {
    query.tags = tag.toLowerCase().trim();
  }

  if (isFeatured !== undefined) {
    query.isFeatured = String(isFeatured) === 'true';
  }

  if (search) {
    query.$text = { $search: search };
  }

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 12));
  const skip = (parsedPage - 1) * parsedLimit;

  const [posts, total] = await Promise.all([
    BlogPost.find(query)
      .sort(isPublic ? { isFeatured: -1, publishedAt: -1 } : { createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean(),
    BlogPost.countDocuments(query)
  ]);

  // Aggregate categories with count
  const categoryAgg = await BlogPost.aggregate([
    { $match: isPublic ? { status: 'published' } : {} },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  return {
    posts,
    categories: categoryAgg.map(c => ({ name: c._id, count: c.count })),
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total,
      totalPages: Math.ceil(total / parsedLimit)
    }
  };
};

const getBlogPostBySlug = async (slug, isPublic = true) => {
  const query = { slug: slug.toLowerCase().trim() };
  if (isPublic) {
    query.status = 'published';
  }

  const blog = await BlogPost.findOne(query);
  if (!blog) {
    const error = new Error('Blog article not found');
    error.status = 404;
    throw error;
  }

  // Increment view counter asynchronously if public read
  if (isPublic) {
    BlogPost.findByIdAndUpdate(blog._id, { $inc: { viewsCount: 1 } }).exec();
  }

  // Fetch 3 related articles from same category
  const related = await BlogPost.find({
    category: blog.category,
    _id: { $ne: blog._id },
    status: 'published'
  })
    .sort({ publishedAt: -1 })
    .limit(3)
    .select('title slug excerpt featuredImage category readingTime publishedAt')
    .lean();

  return {
    blog: blog.toObject(),
    related
  };
};

// ==========================================
// 📄 DYNAMIC CMS PAGES & POLICIES
// ==========================================

const upsertCMSPage = async (slug, data, adminUser) => {
  const finalSlug = generateSlug(slug || data.slug || data.title);
  const updateData = {
    title: data.title,
    slug: finalSlug,
    content: data.content,
    section: data.section || 'policy',
    status: data.status || 'published',
    metaTitle: data.metaTitle || data.title,
    metaDescription: data.metaDescription || '',
    lastUpdatedBy: adminUser?.name || 'Admin'
  };

  const page = await CMSPage.findOneAndUpdate(
    { slug: finalSlug },
    updateData,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return page;
};

const getCMSPageBySlug = async (slug, isPublic = true) => {
  const query = { slug: generateSlug(slug) };
  if (isPublic) {
    query.status = 'published';
  }

  const page = await CMSPage.findOne(query).lean();
  if (!page) {
    const error = new Error('Page not found');
    error.status = 404;
    throw error;
  }
  return page;
};

const getAllCMSPages = async (isPublic = false) => {
  const query = isPublic ? { status: 'published' } : {};
  return await CMSPage.find(query).sort({ section: 1, title: 1 }).lean();
};

const deleteCMSPage = async (slug) => {
  const page = await CMSPage.findOneAndDelete({ slug: generateSlug(slug) });
  if (!page) {
    const error = new Error('Page not found');
    error.status = 404;
    throw error;
  }
  return { success: true, message: 'Page deleted successfully' };
};

// ==========================================
// ❓ FAQ KNOWLEDGE BASE SERVICE
// ==========================================

const upsertFAQ = async (data) => {
  if (data._id && mongoose.Types.ObjectId.isValid(data._id)) {
    const faq = await FAQ.findByIdAndUpdate(data._id, data, { new: true });
    if (!faq) {
      const error = new Error('FAQ not found');
      error.status = 404;
      throw error;
    }
    return faq;
  }

  return await FAQ.create({
    question: data.question,
    answer: data.answer,
    category: data.category || 'General',
    order: data.order || 0,
    isPopular: Boolean(data.isPopular),
    status: data.status || 'active'
  });
};

const deleteFAQ = async (id) => {
  const faq = await FAQ.findByIdAndDelete(id);
  if (!faq) {
    const error = new Error('FAQ not found');
    error.status = 404;
    throw error;
  }
  return { success: true, message: 'FAQ deleted successfully' };
};

const getFAQs = async ({ category, isPublic = true, isPopular } = {}) => {
  const query = {};
  if (isPublic) query.status = 'active';
  if (category && category !== 'all' && category !== 'All') {
    query.category = { $regex: new RegExp(`^${category}$`, 'i') };
  }
  if (isPopular !== undefined) {
    query.isPopular = String(isPopular) === 'true';
  }

  const faqs = await FAQ.find(query).sort({ category: 1, order: 1, createdAt: -1 }).lean();

  const categories = await FAQ.distinct('category', isPublic ? { status: 'active' } : {});

  return {
    faqs,
    categories
  };
};

// ==========================================
// 🌱 INITIAL SEED FOR ZERO-CONFIG STARTUP
// ==========================================

const seedDefaultsIfEmpty = async () => {
  try {
    const pagesCount = await CMSPage.countDocuments();
    if (pagesCount === 0) {
      await CMSPage.create([
        {
          title: 'About Us',
          slug: 'about-us',
          section: 'company',
          content: '## Welcome to Zippto\n\nZippto is India\'s premier on-demand home and facility service marketplace. We connect verified, highly skilled service professionals with homeowners and businesses for reliable, fast, and transparent services.',
          metaTitle: 'About Zippto - On-Demand Home Services',
          status: 'published'
        },
        {
          title: 'Terms of Service',
          slug: 'terms-of-service',
          section: 'policy',
          content: '## Zippto Terms & Conditions\n\nBy accessing or using Zippto platforms, you agree to be bound by these terms. All bookings, service warranties, and payment collections are governed by platform security standards.',
          metaTitle: 'Terms of Service - Zippto',
          status: 'published'
        },
        {
          title: 'Privacy Policy',
          slug: 'privacy-policy',
          section: 'policy',
          content: '## Privacy Policy\n\nYour privacy is paramount. We safeguard personal data, geolocation, and transaction histories adhering to Indian data protection laws.',
          metaTitle: 'Privacy Policy - Zippto',
          status: 'published'
        },
        {
          title: 'Cancellation & Refund Policy',
          slug: 'cancellation-policy',
          section: 'policy',
          content: '## Cancellation & Refund Policy\n\nFree cancellations are available before vendor dispatch. Transparent refund workflows ensure instant credits to your wallet or original payment source.',
          metaTitle: 'Cancellation Policy - Zippto',
          status: 'published'
        }
      ]);
      console.log('✅ Seeded default CMS policy pages');
    }

    const faqsCount = await FAQ.countDocuments();
    if (faqsCount === 0) {
      await FAQ.create([
        {
          question: 'How do I book a verified service partner on Zippto?',
          answer: 'Select your desired service, choose your preferred date and time slot, and confirm your booking. We automatically dispatch the top-rated professional near your location.',
          category: 'Bookings & Scheduling',
          order: 1,
          isPopular: true
        },
        {
          question: 'What is the 4-stage OTP verification process?',
          answer: 'For 100% safety, you share a Visit OTP when the partner reaches your door, inspect photos upon job completion, and verify final settlement with a secure payment OTP.',
          category: 'Safety & Security',
          order: 2,
          isPopular: true
        },
        {
          question: 'What payment modes are supported?',
          answer: 'We support UPI, Credit/Debit Cards, Net Banking, Zippto Wallet, and Cash on Delivery (Pay at Home).',
          category: 'Pricing & Payments',
          order: 3,
          isPopular: true
        }
      ]);
      console.log('✅ Seeded default FAQs');
    }

    const blogsCount = await BlogPost.countDocuments();
    if (blogsCount === 0) {
      await BlogPost.create({
        title: '10 Essential AC Maintenance Tips Before the Peak Summer',
        slug: '10-essential-ac-maintenance-tips-before-summer',
        excerpt: 'Maximize cooling efficiency, lower your electricity bills, and prolong your air conditioner\'s lifespan with these professional maintenance checks.',
        content: `### Why Pre-Summer AC Servicing Is Non-Negotiable\n\nAs temperatures soar, your air conditioner works overtime. Dust accumulation on condenser coils and clogged air filters can reduce cooling efficiency by up to **30%** while spiking your power bills.\n\n#### 1. Clean or Replace Filters Monthly\nDirty filters restrict airflow, forcing the compressor to work harder.\n\n#### 2. Deep Jet Chemical Cleaning\nDeep jet foam cleaning cleans deep grime inside evaporator coils without damaging delicate fins.\n\n#### 3. Inspect Gas Pressure\nLow refrigerant levels cause icing on copper pipes and reduce cooling. Always get certified technicians to check PSI readings.\n\nBook certified AC technicians on Zippto for complete jet servicing and 30-day service warranty!`,
        category: 'Appliance Care',
        tags: ['ac service', 'summer tips', 'home maintenance', 'energy saving'],
        readingTime: 3,
        status: 'published',
        isFeatured: true,
        publishedAt: new Date(),
        author: {
          name: 'Zippto HVAC Team',
          role: 'Master Appliance Expert'
        }
      });
      console.log('✅ Seeded starter blog article');
    }
  } catch (err) {
    console.error('Error seeding CMS defaults:', err.message);
  }
};

module.exports = {
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  getBlogPosts,
  getBlogPostBySlug,
  upsertCMSPage,
  getCMSPageBySlug,
  getAllCMSPages,
  deleteCMSPage,
  upsertFAQ,
  deleteFAQ,
  getFAQs,
  seedDefaultsIfEmpty
};
