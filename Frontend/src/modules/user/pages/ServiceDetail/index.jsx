import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FiArrowLeft,
  FiShare2,
  FiShoppingCart,
  FiStar,
  FiCheck,
  FiPlus,
  FiMinus,
  FiShield,
  FiClock,
  FiTool,
  FiZap,
  FiChevronDown,
  FiChevronUp,
  FiCheckCircle,
  FiAlertCircle
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useCart } from '../../../../context/CartContext';
import { publicCatalogService } from '../../../../services/catalogService';

// Fallback image resolver
const resolveServiceImage = (title = '', categorySlug = '', fallbackUrl = '') => {
  const t = (title || '').toLowerCase();
  const c = (categorySlug || '').toLowerCase();

  if (fallbackUrl && typeof fallbackUrl === 'string' && (fallbackUrl.startsWith('http') || fallbackUrl.startsWith('/'))) {
    const isGeneric = fallbackUrl.includes('placeholder') || fallbackUrl.includes('default') || fallbackUrl.endsWith('.svg');
    if (!isGeneric) return fallbackUrl;
  }

  // Electrician
  if (t.includes('fan')) return '/drill_wall_decor.png';
  if (t.includes('switch') || t.includes('socket') || t.includes('board')) return '/switchboard_repair.png';
  if (t.includes('mcb') || t.includes('wire') || t.includes('wiring') || t.includes('circuit')) return '/cat_images/electrician.jpg';
  if (t.includes('light') || t.includes('lamp') || t.includes('fitting')) return '/drill_wall_decor.png';

  // Plumber
  if (t.includes('tap') || t.includes('faucet') || t.includes('sink') || t.includes('basin')) return '/tap_plumbing_repair.png';
  if (t.includes('drain') || t.includes('block') || t.includes('clog')) return '/tap_plumbing_repair.png';
  if (t.includes('shower') || t.includes('pipe') || t.includes('leak') || t.includes('tank')) return '/cat_images/plumber.jpg';

  // Carpenter
  if (t.includes('drill') || t.includes('hang') || t.includes('mirror') || t.includes('clock')) return '/drill_wall_decor.png';
  if (t.includes('door') || t.includes('lock') || t.includes('handle') || t.includes('hinge') || t.includes('furniture')) return '/cat_images/carpenter.jpg';

  // Cleaning
  if (t.includes('bath') || t.includes('toilet') || t.includes('washroom')) return '/intense_bathroom_cleaning.png';
  if (t.includes('sofa') || t.includes('couch') || t.includes('carpet') || t.includes('mattress')) return '/mattress_cleaning.png';

  // AC & Appliance
  if (t.includes('foam') || t.includes('jet') || t.includes('filter')) return '/ac_foam_jet_service.png';
  if (t.includes('ac') || t.includes('repair') || t.includes('appliance')) return '/ac_repair_wall.png';

  // Salon
  if (t.includes('facial') || t.includes('tan') || t.includes('wax') || t.includes('salon') || t.includes('glow')) return '/cat_images/salon_women.jpg';

  // Category fallback
  if (c.includes('electr')) return '/cat_images/electrician.jpg';
  if (c.includes('plumb')) return '/tap_plumbing_repair.png';
  if (c.includes('carpent')) return '/cat_images/carpenter.jpg';
  if (c.includes('clean')) return '/intense_bathroom_cleaning.png';
  if (c.includes('ac') || c.includes('appliance')) return '/ac_foam_jet_service.png';
  if (c.includes('salon') || c.includes('women')) return '/cat_images/salon_women.jpg';

  return '/cat_images/electrician.jpg';
};

const ServiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { cartItems, addToCart, removeItem, updateItem, cartCount } = useCart();

  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openFaq, setOpenFaq] = useState(null);

  // Fetch service details by ID
  useEffect(() => {
    let isMounted = true;

    const fetchServiceData = async () => {
      if (!id) {
        setError('No service specified');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const res = await publicCatalogService.getServiceById(id);

        if (!isMounted) return;

        if (res.success && res.service) {
          setService(res.service);
        } else {
          setError(res.message || 'Service not found');
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Failed to load service detail:', err);
        setError('Unable to load service details. Please check your connection.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchServiceData();

    return () => {
      isMounted = false;
    };
  }, [id]);

  // Find if current service is in cart
  const cartItem = useMemo(() => {
    if (!service) return null;
    return cartItems.find(
      (ci) => (ci.serviceId && ci.serviceId === service.id) ||
              ci.serviceId === service._id ||
              ci._id === service.id ||
              ci.id === service.id ||
              ci.title === service.title
    );
  }, [cartItems, service]);

  const isAdded = !!cartItem;
  const quantity = cartItem?.serviceCount || 1;

  // Add to cart handler
  const handleAddToCart = async () => {
    if (!service) return;
    try {
      const numPrice = Number(service.basePrice) || 99;
      await addToCart({
        serviceId: service.id && service.id.length === 24 ? service.id : null,
        title: service.title,
        category: service.categoryName || 'Home Services',
        price: numPrice,
        unitPrice: numPrice,
        serviceCount: 1,
        icon: resolveServiceImage(service.title, service.categorySlug, service.imageUrl || service.iconUrl),
        description: service.description || 'Verified doorstep service with 30-day warranty.'
      });
      toast.success(`${service.title} added to cart!`);
    } catch (err) {
      toast.error('Failed to add service to cart');
    }
  };

  // Quantity stepper handler
  const handleQuantityChange = async (delta) => {
    if (!cartItem) return;
    try {
      const newCount = quantity + delta;
      if (newCount <= 0) {
        await removeItem(cartItem._id || cartItem.id);
        toast.success(`${service?.title} removed from cart`);
      } else {
        await updateItem(cartItem._id || cartItem.id, newCount);
      }
    } catch (err) {
      toast.error('Failed to update quantity');
    }
  };

  // Share service handler
  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: service?.title || 'Zippto Service',
        text: `Book ${service?.title || 'this service'} on Zippto at ₹${service?.basePrice || ''}`,
        url
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Service link copied to clipboard!');
    }
  };

  // Static FAQ items for assurance
  const faqs = [
    {
      q: 'Does this service include replacement spare parts?',
      a: 'The price covers labor, equipment, and standard consumables. Any specialized spare parts required will be procured transparently with a genuine receipt and customer approval.'
    },
    {
      q: 'Is there a warranty or guarantee on this service?',
      a: 'Yes! Every job is backed by Zippto’s 30-Day Doorstep Guarantee. If any problem arises from the service completed, our partner will revisit and resolve it free of charge.'
    },
    {
      q: 'What if I need to reschedule or cancel my booking?',
      a: 'You can reschedule or cancel anytime up to 2 hours before the scheduled slot with zero cancellation fees directly from the My Bookings section.'
    },
    {
      q: 'How are Zippto service professionals verified?',
      a: 'All partners undergo mandatory government ID verification, background checks, practical skill assessments, and standard hygiene training before taking customer jobs.'
    }
  ];

  // Inclusions checklist
  const inclusions = [
    'Comprehensive pre-service inspection & diagnosis',
    'Certified technician with standardized industry toolkits',
    'High-grade genuine cleaning/repair materials included',
    'Post-service quality check & cleanup of work area',
    '30-Day Zippto rework guarantee & digital GST invoice'
  ];

  // 1. LOADING STATE
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 pb-28">
        {/* Sticky Header Skeleton */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />
          <div className="w-32 h-4 rounded bg-slate-200 animate-pulse" />
          <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />
        </header>

        <div className="max-w-xl mx-auto p-4 space-y-4">
          <div className="w-full aspect-[16/10] bg-slate-200 rounded-2xl animate-pulse" />
          <div className="space-y-2">
            <div className="w-3/4 h-6 bg-slate-200 rounded-md animate-pulse" />
            <div className="w-1/3 h-4 bg-slate-200 rounded-md animate-pulse" />
          </div>
          <div className="h-24 bg-white rounded-2xl p-4 border border-slate-200 space-y-2">
            <div className="w-1/2 h-5 bg-slate-200 rounded animate-pulse" />
            <div className="w-full h-3 bg-slate-100 rounded animate-pulse" />
            <div className="w-2/3 h-3 bg-slate-100 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // 2. ERROR / NOT FOUND STATE
  if (error || !service) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
        <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700"
          >
            <FiArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-base font-bold text-slate-800">Service Not Available</h1>
        </header>

        <main className="max-w-md mx-auto p-6 text-center space-y-4 my-auto">
          <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 mx-auto flex items-center justify-center">
            <FiAlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">Service Not Found</h2>
          <p className="text-sm text-slate-600">
            {error || 'The requested service may have been updated or is temporarily unavailable in your area.'}
          </p>
          <div className="pt-4 flex flex-col gap-2.5">
            <button
              onClick={() => navigate('/user/services')}
              className="w-full py-3 px-4 rounded-xl font-bold text-white bg-[#B33A35] hover:bg-[#9E2E2A] active:scale-98 transition-all shadow-md shadow-red-500/20"
            >
              Browse All Services
            </button>
            <button
              onClick={() => navigate('/user')}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Go to Home Dashboard
            </button>
          </div>
        </main>
        <div />
      </div>
    );
  }

  const imageUrl = resolveServiceImage(service.title, service.categorySlug, service.imageUrl || service.iconUrl);
  const originalPrice = service.basePrice ? Math.round(service.basePrice * 1.25) : 199;
  const discountPercent = service.basePrice ? Math.round(((originalPrice - service.basePrice) / originalPrice) * 100) : 20;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32">
      {/* =============================================================
          1. STICKY TOP APP HEADER
         ============================================================= */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-all">
        <div className="max-w-2xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => {
                if (window.history.length > 2) {
                  navigate(-1);
                } else {
                  navigate('/user/services');
                }
              }}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-transform active:scale-95 cursor-pointer shrink-0"
              title="Go Back"
            >
              <FiArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm font-extrabold text-slate-900 truncate">
                {service.title}
              </h1>
              {service.categoryName && (
                <p className="text-[10.5px] text-slate-500 font-medium truncate">
                  {service.categoryName} {service.brandName ? `• ${service.brandName}` : ''}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleShare}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-all active:scale-95 cursor-pointer"
              title="Share service"
            >
              <FiShare2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/cart')}
              className="relative w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-all active:scale-95 cursor-pointer"
              title="View Cart"
            >
              <FiShoppingCart className="w-3.5 h-3.5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9.5px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* =============================================================
          2. MAIN CONTENT CONTAINER
         ============================================================= */}
      <main className="max-w-2xl mx-auto px-4 py-3 space-y-4">
        {/* Category Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
          <Link to="/user" className="hover:text-slate-800 transition-colors">Home</Link>
          <span>/</span>
          <Link to="/user/services" className="hover:text-slate-800 transition-colors">Services</Link>
          {service.categorySlug && (
            <>
              <span>/</span>
              <Link to={`/user/category/${service.categorySlug}`} className="hover:text-slate-800 transition-colors capitalize">
                {service.categoryName || service.categorySlug}
              </Link>
            </>
          )}
        </nav>

        {/* Hero Photo Card */}
        <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/90 shadow-sm">
          <img
            src={imageUrl}
            alt={service.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/cat_images/electrician.jpg';
            }}
          />

          {/* Badges Overlay */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-xs uppercase tracking-tight">
              {discountPercent}% OFF
            </span>
            <span className="bg-slate-900/85 backdrop-blur-xs text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
              <FiZap className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
              60-Min Arrival
            </span>
          </div>

          <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-slate-200/80 shadow-xs flex items-center gap-1 text-[11px] font-bold text-slate-800">
            <FiShield className="w-3.5 h-3.5 text-emerald-600" />
            <span>30-Day Free Rework Guarantee</span>
          </div>
        </div>

        {/* Primary Information Card */}
        <section className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 flex-1">
              {service.brandName && (
                <span className="inline-block text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  {service.brandName}
                </span>
              )}
              <h2 className="text-lg sm:text-xl font-extrabold font-heading text-slate-900 leading-tight">
                {service.title}
              </h2>
            </div>

            {/* Dynamic Rating Badge */}
            <div className="flex flex-col items-end shrink-0">
              {service.rating ? (
                <div className="flex items-center gap-1 bg-amber-50 border border-amber-200/80 px-2 py-1 rounded-lg text-slate-900 font-extrabold text-xs">
                  <FiStar className="w-3 h-3 fill-amber-400 text-amber-500" />
                  <span>{service.rating}</span>
                  {service.reviews && (
                    <span className="text-[10px] text-slate-400 font-normal">({service.reviews})</span>
                  )}
                </div>
              ) : (
                <span className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-tight">
                  Verified • New
                </span>
              )}
              <span className="text-[9.5px] text-slate-400 font-medium mt-0.5">Doorstep Pro</span>
            </div>
          </div>

          {/* Pricing Row */}
          <div className="pt-1 border-t border-slate-100 flex items-baseline gap-2">
            <span className="text-2xl font-black font-heading text-slate-900">
              ₹{service.basePrice}
            </span>
            <span className="text-sm font-semibold text-slate-400 line-through">
              ₹{originalPrice}
            </span>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              Save ₹{originalPrice - service.basePrice}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">
            Inclusive of GST & standard doorstep visiting charges
          </p>

          {/* Service Description */}
          {service.description && (
            <div className="pt-2 text-xs sm:text-[13px] text-slate-600 leading-relaxed border-t border-slate-100">
              {service.description}
            </div>
          )}
        </section>

        {/* Feature Highlights Grid */}
        <section className="grid grid-cols-2 gap-2 sm:gap-3">
          <div className="bg-white rounded-xl border border-slate-200/70 p-3 flex items-start gap-2.5 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <FiClock className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">45-60 Mins</h4>
              <p className="text-[10.5px] text-slate-500">Fast arrival & completion</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/70 p-3 flex items-start gap-2.5 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <FiShield className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">30-Day Cover</h4>
              <p className="text-[10.5px] text-slate-500">Zero-cost rework guarantee</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/70 p-3 flex items-start gap-2.5 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <FiTool className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Equipped Pros</h4>
              <p className="text-[10.5px] text-slate-500">Standardized toolkit carry</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/70 p-3 flex items-start gap-2.5 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <FiCheckCircle className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Background Checked</h4>
              <p className="text-[10.5px] text-slate-500">100% verified technicians</p>
            </div>
          </div>
        </section>

        {/* What's Included */}
        <section className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-3">
          <h3 className="text-sm font-extrabold font-heading text-slate-900 flex items-center gap-1.5">
            <FiCheckCircle className="w-4 h-4 text-emerald-600" />
            What's Included in This Service
          </h3>
          <ul className="space-y-2">
            {inclusions.map((inc, i) => (
              <li key={i} className="flex items-start gap-2.5 text-xs text-slate-600">
                <FiCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>{inc}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* How It Works */}
        <section className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-3">
          <h3 className="text-sm font-extrabold font-heading text-slate-900">
            How It Works
          </h3>
          <div className="grid grid-cols-3 gap-2 text-center pt-1">
            <div className="p-2 space-y-1">
              <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-800 font-extrabold text-xs flex items-center justify-center mx-auto">
                1
              </div>
              <h4 className="text-[11.5px] font-bold text-slate-800">Add & Pick Slot</h4>
              <p className="text-[10px] text-slate-500">Choose convenient arrival time</p>
            </div>
            <div className="p-2 space-y-1">
              <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-800 font-extrabold text-xs flex items-center justify-center mx-auto">
                2
              </div>
              <h4 className="text-[11.5px] font-bold text-slate-800">Expert Visits</h4>
              <p className="text-[10px] text-slate-500">Inspection & job completion</p>
            </div>
            <div className="p-2 space-y-1">
              <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-800 font-extrabold text-xs flex items-center justify-center mx-auto">
                3
              </div>
              <h4 className="text-[11.5px] font-bold text-slate-800">Pay & Relax</h4>
              <p className="text-[10px] text-slate-500">Pay after satisfied + 30d warranty</p>
            </div>
          </div>
        </section>

        {/* Frequently Asked Questions */}
        <section className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-3">
          <h3 className="text-sm font-extrabold font-heading text-slate-900">
            Frequently Asked Questions
          </h3>
          <div className="space-y-2 divide-y divide-slate-100">
            {faqs.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div key={i} className="pt-2 first:pt-0">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="w-full flex items-center justify-between text-left py-1 gap-2 text-xs sm:text-[13px] font-bold text-slate-800 hover:text-slate-900"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <FiChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                    ) : (
                      <FiChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <p className="text-xs text-slate-500 leading-relaxed pt-1 pb-2">
                      {faq.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Customer Reviews Section */}
        {Array.isArray(service.reviewsList) && service.reviewsList.length > 0 && (
          <section className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-extrabold font-heading text-slate-900 flex items-center justify-between">
              <span>Customer Reviews</span>
              <span className="text-xs text-slate-400 font-medium">({service.reviewsList.length})</span>
            </h3>
            <div className="space-y-3 divide-y divide-slate-100">
              {service.reviewsList.map((rev) => (
                <div key={rev.id} className="pt-3 first:pt-0 space-y-1">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-slate-800">{rev.userName}</h5>
                    <div className="flex items-center gap-0.5 text-amber-500 text-xs font-bold">
                      <FiStar className="w-3 h-3 fill-amber-400" />
                      <span>{rev.rating || 5}</span>
                    </div>
                  </div>
                  {rev.comment && (
                    <p className="text-xs text-slate-600 leading-relaxed">{rev.comment}</p>
                  )}
                  {rev.createdAt && (
                    <span className="text-[10px] text-slate-400 block">
                      {new Date(rev.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* =============================================================
          3. STICKY BOTTOM ACTION BAR (Zepto / Blinkit style)
         ============================================================= */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-2xl p-3 sm:py-3.5">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black font-heading text-slate-900">
                ₹{service.basePrice}
              </span>
              <span className="text-xs text-slate-400 line-through">
                ₹{originalPrice}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium">
              Doorstep Visiting & Taxes Included
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isAdded ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-white border-2 border-emerald-500 rounded-xl overflow-hidden shadow-xs">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(-1)}
                    className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-emerald-700 hover:bg-emerald-50 active:scale-90 font-extrabold text-base transition-colors cursor-pointer"
                    title="Decrease quantity"
                  >
                    <FiMinus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-sm font-black text-emerald-800 px-3 min-w-[28px] text-center">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(1)}
                    className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-emerald-700 hover:bg-emerald-50 active:scale-90 font-extrabold text-base transition-colors cursor-pointer"
                    title="Increase quantity"
                  >
                    <FiPlus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/cart')}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <FiShoppingCart className="w-3.5 h-3.5" />
                  <span>Cart ({cartCount})</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleAddToCart}
                className="px-6 sm:px-8 py-3 rounded-xl bg-[#B33A35] hover:bg-[#9E2E2A] text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-red-500/25 active:scale-95 transition-all flex items-center gap-2 cursor-pointer uppercase tracking-wider"
              >
                <FiPlus className="w-4 h-4" />
                <span>Add to Cart</span>
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ServiceDetail;
