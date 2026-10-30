const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Category = require('../models/Category');
const BlogPost = require('../models/BlogPost');
const CMSPage = require('../models/CMSPage');

dotenv.config();

/**
 * Generate Frontend/public/sitemap.xml from the database.
 *
 * Run again (and redeploy the frontend) whenever categories, blogs or CMS pages change:
 *   node scripts/generateSitemap.js
 *
 * Only public, indexable pages are listed. Login-protected pages (checkout, account, bookings...)
 * and the vendor/admin apps are intentionally left out (see Frontend/public/robots.txt).
 */
const SITE_URL = (process.env.SITE_URL || 'https://zippto.in').replace(/\/+$/, '');
const OUTPUT = path.join(__dirname, '../../Frontend/public/sitemap.xml');

// "/" redirects to "/user" client-side, so /user is the URL that actually renders the home page.
const STATIC_PAGES = [
  { path: '/user', changefreq: 'daily', priority: '1.0' },
  { path: '/user/services', changefreq: 'weekly', priority: '0.9' },
  { path: '/user/about-zippto', changefreq: 'monthly', priority: '0.5' },
  { path: '/user/help-support', changefreq: 'monthly', priority: '0.5' },
  { path: '/user/cancellation-policy', changefreq: 'monthly', priority: '0.4' },
  { path: '/blog', changefreq: 'weekly', priority: '0.6' }
];

const escapeXml = (value) =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const entry = ({ path: urlPath, lastmod, changefreq, priority }) => {
  const lines = [`    <loc>${escapeXml(SITE_URL + urlPath)}</loc>`];
  if (lastmod) lines.push(`    <lastmod>${new Date(lastmod).toISOString()}</lastmod>`);
  if (changefreq) lines.push(`    <changefreq>${changefreq}</changefreq>`);
  if (priority) lines.push(`    <priority>${priority}</priority>`);
  return `  <url>\n${lines.join('\n')}\n  </url>`;
};

const generateSitemap = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 30000, family: 4 });

    const [categories, blogs, pages] = await Promise.all([
      Category.find({ status: 'active' }).select('slug updatedAt').sort({ homeOrder: 1 }).lean(),
      BlogPost.find({ status: 'published' }).select('slug updatedAt').lean(),
      CMSPage.find({ status: 'published' }).select('slug updatedAt').lean()
    ]);

    const urls = [
      ...STATIC_PAGES,
      ...categories.map((c) => ({
        path: `/user/category/${encodeURIComponent(c.slug)}`,
        lastmod: c.updatedAt,
        changefreq: 'weekly',
        priority: '0.8'
      })),
      ...pages.map((p) => ({
        path: `/page/${encodeURIComponent(p.slug)}`,
        lastmod: p.updatedAt,
        changefreq: 'monthly',
        priority: '0.4'
      })),
      ...blogs.map((b) => ({
        path: `/blog/${encodeURIComponent(b.slug)}`,
        lastmod: b.updatedAt,
        changefreq: 'monthly',
        priority: '0.6'
      }))
    ];

    const xml =
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      urls.map(entry).join('\n') +
      '\n</urlset>\n';

    fs.writeFileSync(OUTPUT, xml);
    console.log(
      `✅ Wrote ${urls.length} URLs to ${path.relative(process.cwd(), OUTPUT)} ` +
      `(${STATIC_PAGES.length} static, ${categories.length} categories, ${pages.length} pages, ${blogs.length} blogs)`
    );
  } catch (error) {
    console.error('❌ Sitemap generation failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

if (require.main === module) {
  generateSitemap();
}

module.exports = { generateSitemap };
