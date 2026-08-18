import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiShield, FiFileText } from 'react-icons/fi';
import cmsService from '../../../services/cmsService';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function DynamicPageView() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        setLoading(true);
        const res = await cmsService.getPublicPageBySlug(slug);
        if (res.success && res.data) {
          setPage(res.data);
        }
      } catch (err) {
        console.error('Error fetching page:', err);
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchPage();
    window.scrollTo(0, 0);
  }, [slug]);

  const renderContent = (content) => {
    if (!content) return null;
    const paragraphs = content.split('\n\n');
    return paragraphs.map((block, idx) => {
      const trimmed = block.trim();
      if (!trimmed) return null;
      if (trimmed.startsWith('### ')) {
        return <h3 key={idx} className="text-xl font-bold text-gray-900 mt-6 mb-2">{trimmed.replace('### ', '')}</h3>;
      }
      if (trimmed.startsWith('## ')) {
        return <h2 key={idx} className="text-2xl font-black text-gray-900 mt-8 mb-3">{trimmed.replace('## ', '')}</h2>;
      }
      if (trimmed.startsWith('# ')) {
        return <h1 key={idx} className="text-3xl font-black text-gray-900 mt-8 mb-4">{trimmed.replace('# ', '')}</h1>;
      }
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const items = trimmed.split('\n').map(l => l.replace(/^[-*]\s+/, '').trim()).filter(Boolean);
        return (
          <ul key={idx} className="list-disc list-inside space-y-1.5 my-3 text-gray-700 text-sm leading-relaxed">
            {items.map((item, itemIdx) => <li key={itemIdx}>{item}</li>)}
          </ul>
        );
      }
      return <p key={idx} className="text-sm text-gray-700 leading-relaxed my-3">{trimmed}</p>;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-600 hover:text-teal-700 mb-6 cursor-pointer"
        >
          <FiArrowLeft />
          <span>Go Back</span>
        </button>

        {loading ? (
          <div className="py-32 text-center text-gray-400 text-xs flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
            <span>Loading document...</span>
          </div>
        ) : !page ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-gray-100 shadow-2xs">
            <FiFileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-gray-800">Document not found</h2>
            <p className="text-xs text-gray-500 mt-1">This page may not be available yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-2xs border border-gray-100">
            <div className="border-b border-gray-100 pb-6 mb-8">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-teal-600">
                {page.section}
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">
                {page.title}
              </h1>
              <p className="text-[11px] text-gray-400 mt-2">
                Last revised: {new Date(page.updatedAt || page.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>

            <div className="prose prose-teal max-w-none">
              {renderContent(page.content)}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
