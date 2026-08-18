import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiSearch, FiClock, FiCalendar, FiUser, FiArrowRight,
  FiTrendingUp, FiArrowLeft, FiTag, FiBookOpen
} from 'react-icons/fi';
import cmsService from '../../../services/cmsService';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function BlogList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'All');

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        setLoading(true);
        const res = await cmsService.getPublicBlogs({
          category: selectedCategory !== 'All' ? selectedCategory : undefined,
          search: searchTerm || undefined,
          limit: 20
        });
        if (res.success && res.data) {
          setPosts(res.data.posts || []);
          setCategories(res.data.categories || []);
        }
      } catch (err) {
        console.error('Error fetching blogs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBlogs();
  }, [selectedCategory, searchTerm]);

  const featuredPost = posts.find(p => p.isFeatured) || posts[0];
  const regularPosts = featuredPost ? posts.filter(p => p._id !== featuredPost._id) : posts;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        {/* Breadcrumb & Hero Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs font-bold text-teal-600 mb-2">
            <span className="cursor-pointer hover:underline" onClick={() => navigate('/')}>Home</span>
            <span>/</span>
            <span className="text-gray-400">Zippto Insights & Blog</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
                Home Care Insights & Guides
              </h1>
              <p className="text-sm text-gray-500 mt-1 max-w-xl">
                Expert tips, maintenance checklists, appliance care guides, and home improvement advice from verified professionals.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search articles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-xs focus:outline-none focus:border-teal-500 shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 no-scrollbar">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'All'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-slate-100'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.name}
              onClick={() => setSelectedCategory(cat.name)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat.name
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-slate-100'
              }`}
            >
              {cat.name} ({cat.count})
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-24 text-center text-xs text-gray-400 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
            <span>Loading articles...</span>
          </div>
        ) : posts.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-3xl p-8 border border-gray-100">
            <div className="w-12 h-12 bg-slate-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-3 text-lg">
              📰
            </div>
            <h3 className="font-bold text-gray-800 text-base">No articles found</h3>
            <p className="text-xs text-gray-500 mt-1">Try clearing your search query or selecting a different category.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Featured Hero Article */}
            {featuredPost && selectedCategory === 'All' && !searchTerm && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => navigate(`/blog/${featuredPost.slug}`)}
                className="bg-white rounded-3xl overflow-hidden shadow-md border border-gray-100 cursor-pointer group hover:shadow-xl transition-all grid grid-cols-1 lg:grid-cols-12 gap-0"
              >
                <div className="lg:col-span-7 h-64 sm:h-80 lg:h-full relative overflow-hidden bg-slate-100">
                  {featuredPost.featuredImage ? (
                    <img
                      src={featuredPost.featuredImage}
                      alt={featuredPost.title}
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-teal-50 text-teal-600 text-4xl font-black">
                      Zippto
                    </div>
                  )}
                  <div className="absolute top-4 left-4 bg-teal-600 text-white text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full shadow-md">
                    Featured
                  </div>
                </div>

                <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between">
                  <div className="space-y-3">
                    <span className="text-[11px] font-bold text-teal-600 uppercase tracking-wider">
                      {featuredPost.category}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-gray-900 leading-snug group-hover:text-teal-600 transition-colors">
                      {featuredPost.title}
                    </h2>
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">
                      {featuredPost.excerpt}
                    </p>
                  </div>

                  <div className="pt-6 border-t border-gray-100 flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium">
                      <span>{featuredPost.author?.name || 'Zippto Team'}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <FiClock className="w-3 h-3" />
                        {featuredPost.readingTime} min read
                      </span>
                    </div>

                    <span className="text-teal-600 font-bold text-xs flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Read Article →
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Articles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {regularPosts.map((post) => (
                <motion.div
                  key={post._id}
                  whileHover={{ y: -4 }}
                  onClick={() => navigate(`/blog/${post.slug}`)}
                  className="bg-white rounded-3xl overflow-hidden shadow-2xs border border-gray-100 hover:shadow-lg transition-all flex flex-col cursor-pointer group"
                >
                  <div className="h-48 relative overflow-hidden bg-slate-100">
                    {post.featuredImage ? (
                      <img
                        src={post.featuredImage}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-teal-50 text-teal-600 text-2xl font-bold">
                        Zippto
                      </div>
                    )}
                    <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs text-gray-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                      {post.category}
                    </span>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm leading-snug group-hover:text-teal-600 transition-colors line-clamp-2">
                        {post.title}
                      </h3>
                      <p className="text-xs text-gray-500 mt-2 line-clamp-2 leading-relaxed">
                        {post.excerpt}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                      <span className="flex items-center gap-1">
                        <FiClock className="w-3 h-3" />
                        {post.readingTime} min
                      </span>
                      <span>
                        {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : 'Recent'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
