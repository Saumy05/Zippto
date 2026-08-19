import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowLeft,
  FiSearch,
  FiMessageCircle,
  FiMail,
  FiPhone,
  FiChevronRight,
  FiHelpCircle,
  FiBook,
  FiAlertCircle,
  FiClock,
  FiSend,
  FiX
} from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi';
import { FaWhatsapp } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import api from '../../../../services/api';
import cmsService from '../../../../services/cmsService';
import NotificationBell from '../../components/common/NotificationBell';

const HelpSupport = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [dynamicFaqs, setDynamicFaqs] = useState([]);
  const [supportInfo, setSupportInfo] = useState({
    email: 'Nexorahr@gmail.com',
    phone: '7879363299',
    whatsapp: '7879363299'
  });

  useEffect(() => {
    const fetchSettingsAndFaqs = async () => {
      try {
        const response = await api.get('/public/config');
        if (response.data?.success && response.data?.settings) {
          const { supportEmail, supportPhone, supportWhatsapp } = response.data.settings;
          setSupportInfo({
            email: supportEmail || 'Nexorahr@gmail.com',
            phone: supportPhone || '7879363299',
            whatsapp: supportWhatsapp || '7879363299'
          });
        }
      } catch (error) {
        console.warn('Failed to fetch support settings:', error);
      }

      try {
        const faqRes = await cmsService.getPublicFAQs();
        if (faqRes?.success && faqRes?.data?.faqs) {
          setDynamicFaqs(faqRes.data.faqs);
        }
      } catch (faqErr) {
        console.warn('Failed to fetch dynamic FAQs:', faqErr);
      }
    };
    fetchSettingsAndFaqs();
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  // FAQ Categories
  const categories = [
    {
      id: 'booking',
      title: 'Booking & Services',
      icon: FiBook,
      color: '#3B82F6',
      questions: [
        {
          q: 'How do I book a doorstep service on Zippto?',
          a: 'Select your required category on the home screen, pick your date & preferred time slot, enter your address, and confirm.'
        },
        {
          q: 'Can I cancel or reschedule my booking?',
          a: 'Yes! You can reschedule or cancel directly from the My Bookings page free of charge up to 2 hours before technician arrival.'
        },
        {
          q: 'What payment options are supported?',
          a: 'We accept 100% secure digital payments including UPI (Google Pay, PhonePe, Paytm), Credit/Debit cards, Net Banking, and Zippto Wallet.'
        },
      ]
    },
    {
      id: 'payment',
      title: 'Payments & Wallet',
      icon: FiClock,
      color: '#10B981',
      questions: [
        {
          q: 'How do I add money to Zippto Wallet?',
          a: 'Go to Account > Zippto Wallet, tap "Add Money", enter the amount, and complete instant UPI / Card payment.'
        },
        {
          q: 'Are my online payments secure?',
          a: 'Yes, all payments are processed through 256-bit SSL encrypted PCI-DSS compliant Razorpay payment gateways.'
        },
        {
          q: 'How long do refunds take?',
          a: 'Cancelled booking refunds are instantly credited to your Zippto Wallet or within 3-5 bank working days to original source.'
        },
      ]
    },
    {
      id: 'account',
      title: 'Account & Profile',
      icon: FiAlertCircle,
      color: '#F59E0B',
      questions: [
        {
          q: 'How do I update my saved addresses?',
          a: 'Navigate to Account > Manage Addresses to edit, remove, or set your primary doorstep delivery location.'
        },
        {
          q: 'What is Zippto Plus Membership?',
          a: 'Zippto Plus is a premium membership giving you up to 20% discount on all bookings and zero doorstep inspection charges.'
        },
      ]
    },
  ];

  const quickActions = [
    {
      id: 'chat',
      title: 'WhatsApp Chat',
      subtitle: 'Instant support on WhatsApp',
      icon: FaWhatsapp,
      iconColor: 'text-emerald-500',
      bgColor: 'bg-emerald-50 border-emerald-100',
      action: () => {
        if (supportInfo.whatsapp) {
          const cleanNumber = supportInfo.whatsapp.replace(/\D/g, '');
          window.location.href = `whatsapp://send?phone=${cleanNumber}`;
        } else {
          toast('WhatsApp support unavailable right now');
        }
      }
    },
    {
      id: 'email',
      title: 'Email Us',
      subtitle: supportInfo.email,
      icon: FiMail,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50 border-blue-100',
      action: () => {
        window.location.href = `mailto:${supportInfo.email}`;
      }
    },
    {
      id: 'call',
      title: 'Call Support',
      subtitle: supportInfo.phone || '7879363299',
      icon: FiPhone,
      iconColor: 'text-amber-600',
      bgColor: 'bg-amber-50 border-amber-100',
      action: () => {
        if (supportInfo.phone) {
          window.location.href = `tel:${supportInfo.phone.replace(/\D/g, '')}`;
        } else {
          toast('Phone support unavailable right now');
        }
      }
    },
  ];

  const handleContactSubmit = (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      toast.error('Please fill all required fields');
      return;
    }

    toast.success('Your support request has been submitted! Our team will reach out within 2 hours.');
    setShowContactForm(false);
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  const activeCategories = dynamicFaqs.length > 0 ? (
    Object.entries(
      dynamicFaqs.reduce((acc, faq) => {
        const cat = faq.category || 'General';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push({ q: faq.question, a: faq.answer });
        return acc;
      }, {})
    ).map(([catName, qList], idx) => {
      const colorList = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];
      const iconList = [FiBook, FiClock, FiAlertCircle, FiHelpCircle, HiSparkles];
      return {
        id: `dynamic-${idx}`,
        title: catName,
        icon: iconList[idx % iconList.length],
        color: colorList[idx % colorList.length],
        questions: qList
      };
    })
  ) : categories;

  const filteredQuestions = activeCategories.flatMap(cat =>
    cat.questions.filter(q =>
      searchQuery === '' ||
      q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.a.toLowerCase().includes(searchQuery.toLowerCase())
    ).map(q => ({ ...q, category: cat.title, color: cat.color }))
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827] font-sans antialiased pb-28">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -ml-20" />
      </div>

      <div className="relative z-10">
        {/* Sticky Top Header */}
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 py-3.5 shadow-2xs space-y-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 flex items-center justify-center transition-colors active:scale-95"
                aria-label="Go back"
              >
                <FiArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-base font-extrabold text-slate-900 tracking-tight leading-none">
                  Help & Support
                </h1>
                <span className="text-[10px] text-slate-500 font-semibold">24/7 Customer Service</span>
              </div>
            </div>
            <NotificationBell />
          </div>

          {/* Search Bar */}
          <div className="max-w-4xl mx-auto">
            <div className="relative">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search FAQs, payments, bookings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-100/90 border border-slate-200/80 focus:border-amber-400 focus:bg-white text-xs font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400"
              />
            </div>
          </div>
        </header>

        {/* Main Content Container */}
        <main className="max-w-4xl mx-auto px-4 pt-5 space-y-5">
          
          {/* HERO BANNER CARD */}
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0B132B] via-[#1C2541] to-[#0B132B] p-5 sm:p-6 text-white shadow-md border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-black uppercase tracking-wider">
              <HiSparkles className="w-4 h-4" />
              <span>We're Here to Help</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
              How Can We Assist You Today?
            </h2>

            <p className="text-xs text-slate-300 font-medium leading-relaxed max-w-xl">
              Connect directly with our resolution desk via WhatsApp, Phone, or submit a support ticket.
            </p>
          </section>

          {/* CONTACT US CHANNELS */}
          <section className="space-y-2.5">
            <h3 className="text-xs font-extrabold text-slate-900 tracking-tight px-1 uppercase text-slate-400">
              Direct Contact Channels
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {quickActions.map(action => {
                let href = null;
                if (action.id === 'chat' && supportInfo.whatsapp) {
                  href = `whatsapp://send?phone=${supportInfo.whatsapp.replace(/\D/g, '')}`;
                } else if (action.id === 'email' && supportInfo.email) {
                  href = `mailto:${supportInfo.email}`;
                } else if (action.id === 'call' && supportInfo.phone) {
                  href = `tel:${supportInfo.phone.replace(/\D/g, '')}`;
                }

                const Component = href ? 'a' : 'button';

                return (
                  <Component
                    key={action.id}
                    href={href}
                    onClick={!href ? action.action : undefined}
                    className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all flex items-center justify-between gap-3 group text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${action.bgColor}`}>
                        <action.icon className={`w-5 h-5 ${action.iconColor}`} />
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900">{action.title}</h4>
                        <p className="text-[11px] text-slate-500 font-semibold truncate max-w-[150px]">{action.subtitle}</p>
                      </div>
                    </div>
                    <FiChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </Component>
                );
              })}
            </div>
          </section>

          {/* SUBMIT REQUEST TICKET BUTTON */}
          <button
            onClick={() => setShowContactForm(true)}
            className="w-full bg-[#0B132B] hover:bg-slate-800 text-white rounded-2xl py-3.5 px-5 font-extrabold text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 border border-slate-800"
          >
            <FiSend className="w-4 h-4 text-amber-400" />
            <span>Submit a Support Request Ticket</span>
          </button>

          {/* FAQ CATEGORIES */}
          {searchQuery === '' && (
            <section className="space-y-2.5">
              <h3 className="text-xs font-extrabold text-slate-900 tracking-tight px-1 uppercase text-slate-400">
                Browse FAQs by Category
              </h3>

              <div className="space-y-3">
                {activeCategories.map(category => (
                  <div
                    key={category.id}
                    className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all"
                  >
                    <button
                      onClick={() => setSelectedCategory(category.id === selectedCategory ? null : category.id)}
                      className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${category.color}15` }}
                        >
                          <category.icon className="w-5 h-5" style={{ color: category.color }} />
                        </div>
                        <h4 className="text-sm font-extrabold text-slate-900">{category.title}</h4>
                      </div>
                      <FiChevronRight
                        className={`w-4 h-4 text-slate-400 transition-transform ${selectedCategory === category.id ? 'rotate-90' : ''}`}
                      />
                    </button>

                    {selectedCategory === category.id && (
                      <div className="px-5 pb-5 pt-1 space-y-4 border-t border-slate-100">
                        {category.questions.map((item, idx) => (
                          <div key={idx} className="space-y-1 text-left">
                            <div className="flex items-start gap-2">
                              <FiHelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                              <h5 className="text-xs font-extrabold text-slate-900">{item.q}</h5>
                            </div>
                            <p className="text-xs text-slate-600 font-medium pl-6 leading-relaxed">
                              {item.a}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* SEARCH RESULTS */}
          {searchQuery !== '' && (
            <section className="space-y-3">
              <h3 className="text-xs font-extrabold text-slate-900 tracking-tight px-1 uppercase text-slate-400">
                Search Results ({filteredQuestions.length})
              </h3>
              {filteredQuestions.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 text-center border border-slate-200/80 shadow-2xs space-y-2">
                  <FiAlertCircle className="w-10 h-10 text-slate-300 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-900">No matching FAQs found</h4>
                  <p className="text-xs text-slate-500 font-medium">Try different keywords or submit a request above.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredQuestions.map((item, idx) => (
                    <div key={idx} className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-2xs space-y-2">
                      <span className="inline-block text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {item.category}
                      </span>
                      <div className="flex items-start gap-2">
                        <FiHelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <h5 className="text-xs font-extrabold text-slate-900">{item.q}</h5>
                      </div>
                      <p className="text-xs text-slate-600 font-medium pl-6 leading-relaxed">{item.a}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

        </main>

        {/* SUBMIT TICKET MODAL */}
        {showContactForm && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
              <div className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-slate-100 px-6 py-4 rounded-t-3xl flex items-center justify-between z-10">
                <h3 className="text-base font-extrabold text-slate-900">Submit a Support Ticket</h3>
                <button
                  onClick={() => setShowContactForm(false)}
                  className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
                >
                  <FiX className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleContactSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Your Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:border-amber-400 focus:bg-white text-xs font-medium text-slate-900 outline-none"
                    placeholder="Enter full name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:border-amber-400 focus:bg-white text-xs font-medium text-slate-900 outline-none"
                    placeholder="name@example.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Subject</label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:border-amber-400 focus:bg-white text-xs font-medium text-slate-900 outline-none"
                    placeholder="e.g. Booking #ZPT-84920 issue"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Detailed Message</label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:border-amber-400 focus:bg-white text-xs font-medium text-slate-900 outline-none resize-none"
                    placeholder="Describe your issue or query..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#0B132B] hover:bg-slate-800 text-white rounded-2xl py-3.5 font-extrabold text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <FiSend className="w-4 h-4 text-amber-400" />
                  <span>Submit Ticket</span>
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default HelpSupport;
