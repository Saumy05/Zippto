import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiArrowLeft, FiClock, FiCalendar, FiShare2, FiCheck,
  FiEye, FiTag, FiBookOpen, FiExternalLink
} from 'react-icons/fi';
import { FaWhatsapp, FaTwitter, FaLinkedin, FaLink } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import cmsService from '../../../services/cmsService';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function BlogDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [blog, setBlog] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        setLoading(true);
        const res = await cmsService.getPublicBlogBySlug(slug);
        if (res.success && res.data) {
          setBlog(res.data.blog);
          setRelated(res.data.related || []);
        }
      } catch (err) {
        console.error('Error loading article:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
    window.scrollTo(0, 0);
  }, [slug]);

  // Social Share Handlers
  const currentUrl = window.location.href;
  const shareTitle = blog?.title || 'Zippto Home Care Insight';

  const handleShareWhatsApp = () => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareTitle} - ${currentUrl}`)}`, '_blank');
  };

  const handleShareTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(currentUrl)}`, '_blank');
  };

  const handleShareLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentUrl)}`, '_blank');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    toast.success('Article link copied to clipboard!');
    setTimeout(() => setCopied(false), 3000);
  };

  // Basic Markdown Content Renderer (Headings, Bold, Lists, Linebreaks)
  const renderFormattedContent = (content) => {
    if (!content) return null;

    const paragraphs = content.split('\n\n');
    return paragraphs.map((block, idx) => {
      const trimmed = block.trim();
      if (!trimmed) return null;

      // H3
      if (trimmed.startsWith('### ')) {
        return <h3 key={idx} className="text-xl font-extrabold text-gray-900 mt-6 mb-3">{trimmed.replace('### ', '')}</h3>;
      }
      // H4
      if (trimmed.startsWith('#### ')) {
        return <h4 key={idx} className="text-lg font-bold text-gray-900 mt-5 mb-2">{trimmed.replace('#### ', '')}</h4>;
      }
      // H2
      if (trimmed.startsWith('## ')) {
        return <h2 key={idx} className="text-2xl font-black text-gray-900 mt-8 mb-4">{trimmed.replace('## ', '')}</h2>;
      }
      // List
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const items = trimmed.split('\n').map(l => l.replace(/^[-*]\s+/, '').trim()).filter(Boolean);
        return (
          <ul key={idx} className="list-disc list-inside space-y-1.5 my-3 text-gray-700 text-sm leading-relaxed">
            {items.map((item, itemIdx) => (
              <li key={itemIdx} dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
            ))}
          </ul>
        );
      }

      // Paragraph
      return (
        <p
          key={idx}
          className="text-sm sm:text-base text-gray-700 leading-relaxed my-3"
          dangerouslySetInnerHTML={{ __html: formatInline(trimmed) }}
        />
      );
    });
  };

  const formatInline = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="bg-slate-100 px-1.5 py-0.5 rounded text-teal-700 font-mono text-xs">$1</code>');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center py-32 text-gray-400 text-xs gap-3">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading article...</span>
        </div>
        <Footer />
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <Header />
        <div className="flex-1 max-w-3xl mx-auto px-4 py-32 text-center">
          <h2 className="text-2xl font-black text-gray-800">Article not found</h2>
          <p className="text-sm text-gray-500 mt-2">The article you are looking for may have been moved or unpublished.</p>
          <button
            onClick={() => navigate('/blog')}
            className="mt-6 px-6 py-2.5 bg-teal-600 text-white rounded-xl text-xs font-bold"
          >
            ← Back to Blog Directory
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        {/* Back Link */}
        <button
          onClick={() => navigate('/blog')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-600 hover:text-teal-700 mb-6 group cursor-pointer"
        >
          <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" />
          <span>All Insights & Guides</span>
        </button>

        {/* Article Header */}
        <div className="space-y-4 mb-8">
          <span className="px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-extrabold uppercase tracking-wider border border-teal-100">
            {blog.category}
          </span>

          <h1 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight leading-tight">
            {blog.title}
          </h1>

          {/* Meta bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 text-xs text-gray-500 border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-xs">
                {blog.author?.name?.charAt(0) || 'Z'}
              </div>
              <div>
                <p className="font-bold text-gray-900">{blog.author?.name || 'Zippto Editorial'}</p>
                <p className="text-[11px] text-gray-400">{blog.author?.role || 'Home Expert'}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-[11px] text-gray-400">
              <span className="flex items-center gap-1">
                <FiClock className="w-3.5 h-3.5" />
                {blog.readingTime} min read
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <FiCalendar className="w-3.5 h-3.5" />
                {new Date(blog.publishedAt || blog.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <FiEye className="w-3.5 h-3.5" />
                {blog.viewsCount || 1} views
              </span>
            </div>
          </div>
        </div>

        {/* Featured Cover Image */}
        {blog.featuredImage && (
          <div className="mb-10 rounded-3xl overflow-hidden shadow-lg border border-gray-200 bg-slate-100 max-h-[460px]">
            <img src={blog.featuredImage} alt={blog.title} className="w-full h-full object-cover" />
          </div>
        )}

        {/* Main Article Content */}
        <article className="bg-white rounded-3xl p-6 sm:p-10 shadow-2xs border border-gray-100 mb-10 prose prose-teal max-w-none">
          {renderFormattedContent(blog.content)}

          {/* Tag Chips */}
          {blog.tags && blog.tags.length > 0 && (
            <div className="mt-8 pt-6 border-t border-gray-100 flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-gray-400 flex items-center gap-1">
                <FiTag className="w-3 h-3" /> Tags:
              </span>
              {blog.tags.map((tag, i) => (
                <span
                  key={i}
                  onClick={() => navigate(`/blog?q=${encodeURIComponent(tag)}`)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-gray-600 text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Social Sharing Bar */}
          <div className="mt-8 pt-6 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
            <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <FiShare2 className="w-4 h-4 text-teal-600" />
              <span>Share this guide:</span>
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={handleShareWhatsApp}
                className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-colors"
                title="Share on WhatsApp"
              >
                <FaWhatsapp className="w-4 h-4" />
              </button>
              <button
                onClick={handleShareTwitter}
                className="p-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-600 transition-colors"
                title="Share on X (Twitter)"
              >
                <FaTwitter className="w-4 h-4" />
              </button>
              <button
                onClick={handleShareLinkedIn}
                className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"
                title="Share on LinkedIn"
              >
                <FaLinkedin className="w-4 h-4" />
              </button>
              <button
                onClick={handleCopyLink}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-gray-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Copy Link"
              >
                {copied ? <FiCheck className="text-emerald-600 w-3.5 h-3.5" /> : <FaLink className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>
        </article>

        {/* CTA Banner */}
        <div className="bg-gradient-to-r from-teal-700 to-emerald-800 rounded-3xl p-8 text-white shadow-xl mb-12 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-extrabold">Need Professional Home Services?</h3>
            <p className="text-xs text-teal-100 mt-1 max-w-md">
              Book verified experts for AC repair, deep cleaning, electricians, plumbing and more with 30-day service warranty.
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-white text-teal-800 hover:bg-teal-50 font-black text-xs rounded-2xl shadow-md transition-all active:scale-95 shrink-0 cursor-pointer"
          >
            Book a Service →
          </button>
        </div>

        {/* Related Articles */}
        {related.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-black text-gray-900">Related Articles in {blog.category}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {related.map((rel) => (
                <div
                  key={rel._id}
                  onClick={() => navigate(`/blog/${rel.slug}`)}
                  className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs hover:shadow-md transition-all cursor-pointer group space-y-2"
                >
                  <span className="text-[10px] font-bold text-teal-600 uppercase">{rel.category}</span>
                  <h4 className="font-bold text-gray-900 text-xs group-hover:text-teal-600 transition-colors line-clamp-2">
                    {rel.title}
                  </h4>
                  <p className="text-[11px] text-gray-400 flex items-center gap-1">
                    <FiClock className="w-3 h-3" /> {rel.readingTime} min read
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
