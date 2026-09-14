import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FiArrowLeft,
  FiSearch,
  FiX,
  FiShoppingCart,
  FiStar,
  FiCheck,
  FiPackage,
  FiChevronRight,
  FiChevronLeft,
  FiMapPin,
  FiFilter,
  FiZap,
  FiGrid,
  FiChevronDown,
  FiPlus,
  FiMinus
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useCart } from '../../../../context/CartContext';
import { useCity } from '../../../../context/CityContext';
import { publicCatalogService } from '../../../../services/catalogService';

const toAssetUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  if (url.includes('/uploads/')) {
    const uploadPath = url.substring(url.indexOf('/uploads/'));
    const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001').replace(/\/api\/?$/, '');
    return `${base}${uploadPath}`;
  }
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return url;
};

// Authentic catalog fallback with photorealistic lifestyle commercial assets & discount structures
const PRESET_CATALOG_DATA = {
  electrician: {
    bannerTitle: 'ELECTRICAL SERVICES',
    title: 'Electrician',
    rating: '4.85',
    reviews: '12.4k',
    desc: 'Expert electricians for wiring, switchboards, fan installations, appliance setups, and emergency repairs.',
    sections: [
      {
        sectionTitle: 'Electrical Repairs & Installation',
        items: [
          { id: 'elec-switch-1', title: 'Switch & Socket Replacement', rating: '4.80', reviews: '3.2k', price: '₹149', originalPrice: '₹199', discount: '25% OFF', isInstant: true, desc: 'Installation & repair of modular switches & sockets.', image: '/switchboard_repair.png' },
          { id: 'elec-fan-1', title: 'Ceiling Fan Repair & Mounting', rating: '4.80', reviews: '4.5k', price: '₹199', originalPrice: '₹249', discount: '20% OFF', isInstant: true, desc: 'Precision ceiling fan mounting, balancing & wiring test.', image: '/drill_wall_decor.png' },
          { id: 'elec-wire-1', title: 'MCB & Distribution Board Repair', rating: '4.88', reviews: '2.1k', price: '₹299', originalPrice: '₹349', discount: '14% OFF', isInstant: true, desc: 'Short circuit troubleshooting & trip MCB replacement.', image: '/cat_images/electrician.jpg' },
          { id: 'elec-switch-2', title: 'Switchboard Installation', rating: '4.90', reviews: '1.8k', price: '₹199', originalPrice: '₹249', discount: '20% OFF', isInstant: false, desc: 'Complete multi-slot switchboard mounting & connection.', image: '/switchboard_repair.png' },
          { id: 'elec-light-1', title: 'Decorative & Spotlight Fitting', rating: '4.75', reviews: '980', price: '₹89', originalPrice: '₹119', discount: '25% OFF', isInstant: false, desc: 'Ceiling spotlight, strip LED, or hanging lamp installation.', image: '/cat_images/electrician.jpg' }
        ]
      }
    ]
  },
  plumber: {
    bannerTitle: 'PLUMBING SERVICES',
    title: 'Plumber',
    rating: '4.77',
    reviews: '9.8k',
    desc: 'Certified plumbers for tap repairs, pipe leaks, bathroom fixtures, drainage blocks, and water tanks.',
    sections: [
      {
        sectionTitle: 'Plumbing Repairs & Fittings',
        items: [
          { id: 'plumb-tap-1', title: 'Tap & Plumbing Repair', rating: '4.77', reviews: '2.6k', price: '₹49', originalPrice: '₹99', discount: '50% OFF', isInstant: true, desc: 'Fix dripping tap, nozzle change, or washer replacement.', image: '/tap_plumbing_repair.png' },
          { id: 'plumb-drain-1', title: 'Sink & Basin Blockage Removal', rating: '4.90', reviews: '3.4k', price: '₹149', originalPrice: '₹199', discount: '25% OFF', isInstant: true, desc: 'Deep pipe cleaning and clog removal with mechanical spring.', image: '/tap_plumbing_repair.png' },
          { id: 'plumb-shower-1', title: 'Overhead Shower Fitting', rating: '4.72', reviews: '1.2k', price: '₹129', originalPrice: '₹169', discount: '23% OFF', isInstant: false, desc: 'Shower arm & head installation or limescale deep cleaning.', image: '/cat_images/plumber.jpg' },
          { id: 'plumb-leak-1', title: 'Pipe Joint Leakage Fix', rating: '4.82', reviews: '1.9k', price: '₹199', originalPrice: '₹249', discount: '20% OFF', isInstant: true, desc: 'CPVC/PVC pipe joint soldering and pressure sealing check.', image: '/cat_images/plumber.jpg' }
        ]
      }
    ]
  },
  carpenter: {
    bannerTitle: 'CARPENTRY SERVICES',
    title: 'Carpenter',
    rating: '4.82',
    reviews: '6.5k',
    desc: 'Skilled carpenters for furniture repair, hinges, locks, drill & hang work, and custom woodwork.',
    sections: [
      {
        sectionTitle: 'Woodwork & Fixtures',
        items: [
          { id: 'carp-drill-1', title: 'Wall Drill & Decor Hang', rating: '4.80', reviews: '2.1k', price: '₹99', originalPrice: '₹129', discount: '23% OFF', isInstant: true, desc: 'Photo frames, clocks, mirrors, paintings safely hung.', image: '/drill_wall_decor.png' },
          { id: 'carp-door-1', title: 'Door Lock & Handle Repair', rating: '4.90', reviews: '1.7k', price: '₹149', originalPrice: '₹199', discount: '25% OFF', isInstant: true, desc: 'Fix sticking lock, handle alignment, or latch replacement.', image: '/cat_images/carpenter.jpg' },
          { id: 'carp-curtain-1', title: 'Curtain Rod Installation', rating: '4.74', reviews: '1.4k', price: '₹129', originalPrice: '₹169', discount: '23% OFF', isInstant: false, desc: 'Precision wall drilling and bracket fixing for curtains.', image: '/cat_images/carpenter.jpg' },
          { id: 'carp-hinge-1', title: 'Cabinet Hinge Adjustment', rating: '4.80', reviews: '890', price: '₹89', originalPrice: '₹109', discount: '18% OFF', isInstant: false, desc: 'Hydraulic or regular hinge tightening and realigning.', image: '/cat_images/carpenter.jpg' }
        ]
      }
    ]
  },
  'cleaning-service': {
    bannerTitle: 'CLEANING SERVICES',
    title: 'Cleaning Service',
    rating: '4.84',
    reviews: '15.2k',
    desc: 'Deep cleaning for full homes, bathrooms, kitchens, sofas, and carpets using mechanized tools.',
    sections: [
      {
        sectionTitle: 'Cleaning Essentials',
        items: [
          { id: 'clean-bath-1', title: 'Intense Bathroom Cleaning', rating: '4.80', reviews: '5.1k', price: '₹872', originalPrice: '₹1,038', discount: '8% OFF', isInstant: true, desc: 'High-pressure mechanized scrubbing, de-scaling & sanitization.', image: '/intense_bathroom_cleaning.png' },
          { id: 'clean-mattress-1', title: 'Mattress & Sofa Wash', rating: '4.85', reviews: '3.9k', price: '₹599', originalPrice: '₹749', discount: '20% OFF', isInstant: false, desc: 'Fabric extraction shampooing and deep suction vacuuming.', image: '/mattress_cleaning.png' },
          { id: 'clean-home-1', title: 'Full Home Deep Clean', rating: '4.88', reviews: '2.8k', price: '₹1,499', originalPrice: '₹1,799', discount: '17% OFF', isInstant: false, desc: 'Complete multi-room floor scrubbing, balcony, and kitchen degreasing.', image: '/cat_cleaning.png' },
          { id: 'clean-tap-1', title: 'Sink & Tap Sanitation', rating: '4.77', reviews: '1.5k', price: '₹199', originalPrice: '₹249', discount: '20% OFF', isInstant: true, desc: 'Anti-bacterial chrome polish, basin scrub & drain flushing.', image: '/tap_plumbing_repair.png' }
        ]
      }
    ]
  },
  'ac-appliance-repair': {
    bannerTitle: 'AC & APPLIANCE REPAIR',
    title: 'AC & Appliance Repair',
    rating: '4.75',
    reviews: '8.4k',
    desc: 'Expert technicians for Split & Window AC service, gas recharge, geysers, and appliances.',
    sections: [
      {
        sectionTitle: 'AC Servicing & Appliances',
        items: [
          { id: 'ac-foam-1', title: 'Foam-jet AC Service', rating: '4.75', reviews: '4.8k', price: '₹649', originalPrice: '₹799', discount: '18% OFF', isInstant: true, desc: '2X deeper indoor & outdoor coil cleaning with pressure jet pump.', image: '/ac_foam_jet_service.png' },
          { id: 'ac-repair-1', title: 'AC Repair (Wall Mount)', rating: '4.73', reviews: '2.9k', price: '₹299', originalPrice: '₹399', discount: '25% OFF', isInstant: true, desc: 'Inspection, PCB troubleshooting, cooling issue fix & water leak repair.', image: '/ac_repair_wall.png' },
          { id: 'ac-geyser-1', title: 'Geyser Check-up & Repair', rating: '4.72', reviews: '1.8k', price: '₹249', originalPrice: '₹299', discount: '16% OFF', isInstant: false, desc: 'Thermostat testing, heating element de-scaling & safety valve check.', image: '/geyser_checkup.png' },
          { id: 'ac-purifier-1', title: 'Native RO Water Purifier', rating: '4.90', reviews: '3.1k', price: '₹4,999', originalPrice: '₹8,549', discount: 'Up to ₹3,550 OFF', isInstant: false, desc: 'Needs no service for 2 years. Multi-stage RO+UV+Copper technology.', image: '/native_water_purifier.png' }
        ]
      }
    ]
  },
  'salon-for-women': {
    bannerTitle: 'SALON FOR WOMEN',
    title: 'Salon for Women',
    rating: '4.90',
    reviews: '18.1k',
    desc: 'Hygienic salon treatments at home: waxing, facial, manicure, pedicure, and haircare.',
    sections: [
      {
        sectionTitle: 'Salon & Spa Services',
        items: [
          { id: 'salon-wax-1', title: 'Full Arms + Full Legs RICA Wax', rating: '4.90', reviews: '6.4k', price: '₹599', originalPrice: '₹699', discount: '14% OFF', isInstant: false, desc: 'Gentle Italian RICA wax for smooth skin without irritation.', image: '/cat_images/salon_women.jpg' },
          { id: 'salon-face-1', title: 'O3+ Bridal Glow Facial', rating: '4.92', reviews: '4.2k', price: '₹1,299', originalPrice: '₹1,599', discount: '18% OFF', isInstant: false, desc: 'High-frequency skin brightening and deep detox massage.', image: '/cat_images/salon_women.jpg' },
          { id: 'salon-thread-1', title: 'Eyebrow + Upper Lip Threading', rating: '4.80', reviews: '3.1k', price: '₹49', originalPrice: '₹69', discount: '28% OFF', isInstant: true, desc: 'Precise shape contouring with disposable sanitary thread.', image: '/cat_images/salon_women.jpg' },
          { id: 'salon-mani-1', title: 'Classic Pedicure & Foot Scrub', rating: '4.80', reviews: '2.7k', price: '₹449', originalPrice: '₹549', discount: '18% OFF', isInstant: false, desc: 'Exfoliation, cuticle care, foot massage, and nail paint.', image: '/cat_images/salon_women.jpg' }
        ]
      }
    ]
  },
  'pest-control': {
    bannerTitle: 'PEST CONTROL',
    title: 'Pest Control',
    rating: '4.80',
    reviews: '4.1k',
    desc: 'Odorless, government-approved pest treatment for cockroaches, termites, bed bugs, and ants.',
    sections: [
      {
        sectionTitle: 'Pest Control Treatments',
        items: [
          { id: 'pest-cock-1', title: '1 BHK Herbal Gel Pest Control', rating: '4.80', reviews: '1.9k', price: '₹599', originalPrice: '₹749', discount: '20% OFF', isInstant: false, desc: 'Odorless Bayer gel dots in all corners + drain spray.', image: '/cat_3d/pest_control.jpg' },
          { id: 'pest-cock-2', title: '2 BHK Herbal Gel Pest Control', rating: '4.90', reviews: '2.5k', price: '₹799', originalPrice: '₹999', discount: '20% OFF', isInstant: false, desc: 'Complete 2BHK coverage with 60-day service warranty.', image: '/cat_3d/pest_control.jpg' }
        ]
      }
    ]
  }
};

/**
 * Single Row Carousel with Left & Right Arrow Buttons
 */
const SectionRowCarousel = ({
  sec,
  cat,
  cartItems,
  handleToggleAddService,
  handleUpdateQuantity,
  navigate
}) => {
  const containerRef = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const isScrollable = el.scrollWidth > el.clientWidth + 4;
    setCanLeft(isScrollable && el.scrollLeft > 6);
    setCanRight(isScrollable && el.scrollLeft < el.scrollWidth - el.clientWidth - 6);
  }, []);

  useEffect(() => {
    checkScroll();
    const timer = setTimeout(checkScroll, 100);
    window.addEventListener('resize', checkScroll);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll, sec.items]);

  const handleArrowClick = (direction) => {
    const el = containerRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth;
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
    setTimeout(checkScroll, 320);
  };

  return (
    <div className="space-y-1.5">
      {/* Section Header with Left and Right < > Buttons */}
      <div className="flex items-center justify-between border-b border-slate-200/70 pb-1 px-0.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <h3 className="text-xs sm:text-[13px] font-bold text-slate-900 truncate">
            {sec.sectionTitle}
          </h3>
          <span className="text-[9.5px] text-slate-400 font-bold shrink-0">
            ({sec.items.length})
          </span>
        </div>

        {/* < and > Navigation Arrows */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => handleArrowClick('left')}
            disabled={!canLeft}
            aria-label="Previous services"
            className={`w-5.5 h-5.5 sm:w-6 sm:h-6 rounded-full border border-slate-200 flex items-center justify-center transition-all ${
              canLeft
                ? 'bg-white text-slate-800 hover:bg-slate-100 shadow-2xs cursor-pointer active:scale-90'
                : 'bg-slate-50 text-slate-300 opacity-40 cursor-not-allowed'
            }`}
          >
            <FiChevronLeft className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => handleArrowClick('right')}
            disabled={!canRight}
            aria-label="Next services"
            className={`w-5.5 h-5.5 sm:w-6 sm:h-6 rounded-full border border-slate-200 flex items-center justify-center transition-all ${
              canRight
                ? 'bg-white text-slate-800 hover:bg-slate-100 shadow-2xs cursor-pointer active:scale-90'
                : 'bg-slate-50 text-slate-300 opacity-40 cursor-not-allowed'
            }`}
          >
            <FiChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Single Horizontal Row: Fits Exactly 3 Cards in the Space */}
      <div className="relative group/carousel">
        {/* Floating Left Arrow (Desktop) */}
        {canLeft && (
          <button
            type="button"
            onClick={() => handleArrowClick('left')}
            aria-label="Scroll left"
            className="hidden sm:flex absolute -left-2.5 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-white/95 hover:bg-white text-slate-800 shadow-md border border-slate-200 items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-90"
          >
            <FiChevronLeft className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Floating Right Arrow (Desktop) */}
        {canRight && (
          <button
            type="button"
            onClick={() => handleArrowClick('right')}
            aria-label="Scroll right"
            className="hidden sm:flex absolute -right-2.5 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-white/95 hover:bg-white text-slate-800 shadow-md border border-slate-200 items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-90"
          >
            <FiChevronRight className="w-3.5 h-3.5" />
          </button>
        )}

        <div
          ref={containerRef}
          onScroll={checkScroll}
          className="flex items-stretch gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1"
        >
          {sec.items.map((item) => {
            const isAdded = cartItems.some(
              (ci) => (ci.serviceId && ci.serviceId === item.id) || ci.title === item.title
            );

            return (
              <div
                key={item.id}
                className="w-[calc((100%-16px)/3)] min-w-[calc((100%-16px)/3)] max-w-[calc((100%-16px)/3)] shrink-0 bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all duration-200 flex flex-col group relative select-none"
              >
                {/* 1. Proportional Card Photo */}
                <div className="w-full aspect-[16/10] sm:aspect-[4/3] bg-slate-100 relative overflow-hidden shrink-0">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/cat_images/electrician.jpg';
                    }}
                  />
                  {item.discount && (
                    <span className="absolute top-1 left-1 bg-[#137547] text-white text-[7.5px] sm:text-[8px] font-extrabold px-1.5 py-0.2 rounded shadow-xs tracking-tight">
                      {item.discount}
                    </span>
                  )}
                </div>

                {/* 2. Petite Card Content Body */}
                <div className="p-1.5 sm:p-2 flex flex-col flex-1 justify-between gap-1">
                  <div className="space-y-0.5 sm:space-y-1">
                    <h4 className="text-[10px] sm:text-[11px] md:text-xs font-bold text-slate-900 leading-tight line-clamp-2 h-[26px] sm:h-[30px]">
                      {item.title}
                    </h4>

                    {/* Rating & Speed Badges */}
                    <div className="flex items-center gap-1 text-[8.5px] sm:text-[9.5px] font-medium text-slate-600">
                      <span className="flex items-center gap-0.5 font-bold text-slate-900">
                        <FiStar className="w-2 h-2 fill-amber-400 text-amber-400" />
                        {item.rating || '4.80'}
                      </span>
                      {item.isInstant && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="flex items-center gap-0.5 font-semibold text-emerald-600 text-[8px] sm:text-[9px]">
                            <FiZap className="w-1.5 h-1.5 fill-emerald-500 text-emerald-500" /> Instant
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 3. Price & Add Button */}
                  <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-100 mt-auto">
                    <div className="flex items-baseline gap-0.5 min-w-0">
                      <span className="text-[10.5px] sm:text-xs font-extrabold text-slate-900 truncate">
                        {item.price}
                      </span>
                      {item.originalPrice && (
                        <span className="text-[8px] sm:text-[9px] text-slate-400 line-through truncate">
                          {item.originalPrice}
                        </span>
                      )}
                    </div>

                    {isAdded ? (
                      <div className="flex items-center bg-white border border-emerald-500 rounded text-[9px] sm:text-[9.5px] font-bold overflow-hidden shadow-2xs">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateQuantity(item, -1, cat.title);
                          }}
                          className="w-5 h-5 flex items-center justify-center text-emerald-700 hover:bg-emerald-50 active:scale-90 font-extrabold transition-colors cursor-pointer"
                          title="Decrease quantity or remove"
                        >
                          <FiMinus className="w-2.5 h-2.5" />
                        </button>
                        <span className="text-[10px] font-extrabold text-emerald-800 px-1 min-w-[14px] text-center">
                          {cartItem?.serviceCount || 1}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateQuantity(item, 1, cat.title);
                          }}
                          className="w-5 h-5 flex items-center justify-center text-emerald-700 hover:bg-emerald-50 active:scale-90 font-extrabold transition-colors cursor-pointer"
                          title="Increase quantity"
                        >
                          <FiPlus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleAddService(item, cat.title);
                        }}
                        className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded text-[9px] sm:text-[9.5px] font-bold transition-all shadow-2xs flex items-center justify-center gap-0.5 cursor-pointer shrink-0 active:scale-95 bg-white text-red-600 border border-red-200 hover:bg-red-50"
                        title="Add to Cart"
                      >
                        Add +
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const AllServices = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentCity } = useCity();
  const { cartItems, addToCart, removeItem, updateItem, cartCount } = useCart();

  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Category filter state: 'all' displays everything, otherwise filters to the specific category
  const [selectedCategorySlug, setSelectedCategorySlug] = useState(
    searchParams.get('category') || 'all'
  );

  // Subcategory filter within a selected category
  const [selectedSubcategoryTitle, setSelectedSubcategoryTitle] = useState('all');

  // Reset subcategory filter whenever category changes
  useEffect(() => {
    setSelectedSubcategoryTitle('all');
  }, [selectedCategorySlug]);

  const contentTopRef = useRef(null);

  // 1. Fetch live categories & brands from MongoDB
  useEffect(() => {
    let isMounted = true;

    const loadCatalog = async () => {
      try {
        setLoading(true);
        publicCatalogService.invalidateCache();

        const [catRes, brandRes] = await Promise.allSettled([
          publicCatalogService.getCategories(currentCity?._id || currentCity?.id),
          publicCatalogService.getBrands({ cityId: currentCity?._id || currentCity?.id })
        ]);

        if (!isMounted) return;

        let liveCategories = [];
        if (catRes.status === 'fulfilled' && catRes.value?.success && Array.isArray(catRes.value.categories)) {
          liveCategories = catRes.value.categories.sort((a, b) => (a.homeOrder || 0) - (b.homeOrder || 0));
        }

        let liveBrands = [];
        if (brandRes.status === 'fulfilled' && brandRes.value?.success && Array.isArray(brandRes.value.brands)) {
          liveBrands = brandRes.value.brands;
        }

        // Merge categories: if backend has none, fallback to standard platform registry
        if (liveCategories.length === 0) {
          liveCategories = Object.keys(PRESET_CATALOG_DATA).map(key => ({
            id: key,
            slug: key,
            title: PRESET_CATALOG_DATA[key].title,
            homeIconUrl: PRESET_CATALOG_DATA[key].sections?.[0]?.items?.[0]?.image || '/cat_images/electrician.jpg',
            homeOrder: 0
          }));
        }

        setCategories(liveCategories);
        setBrands(liveBrands);
      } catch (err) {
        console.error('Failed to load catalog in AllServices:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadCatalog();
    return () => {
      isMounted = false;
    };
  }, [currentCity]);

  // Sync category state with query param if it changes
  useEffect(() => {
    const urlCat = searchParams.get('category') || 'all';
    if (urlCat !== selectedCategorySlug) {
      setSelectedCategorySlug(urlCat);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [searchParams]);

  // 2. Build full category-with-services model
  const catalogData = useMemo(() => {
    return categories.map((cat) => {
      const slug = (cat.slug || cat.id || '').toLowerCase();

      // Find matching live brands for this category
      const matchedBrands = brands.filter((b) =>
        (Array.isArray(b.categoryIds) && (b.categoryIds.includes(cat.id) || b.categoryIds.includes(cat._id))) ||
        b.categoryId === cat.id ||
        b.categoryId === cat._id ||
        (b.categorySlug && b.categorySlug === slug)
      );

      let sections = [];

      // If brands with sections exist in MongoDB
      if (matchedBrands.length > 0) {
        matchedBrands.forEach((b) => {
          if (Array.isArray(b.sections) && b.sections.length > 0) {
            b.sections.forEach((sec) => {
              sections.push({
                sectionTitle: sec.title || b.title,
                items: (sec.cards || []).map((card) => {
                  const numPrice = parseFloat(String(card.price || '99').replace(/[^0-9.]/g, '')) || 99;
                  const numBase = parseFloat(String(card.basePrice || '0').replace(/[^0-9.]/g, '')) || 0;
                  const discountStr = card.discount || (numBase > numPrice ? `${Math.round(((numBase - numPrice) / numBase) * 100)}% OFF` : null);
                  const origPriceStr = numBase > numPrice ? `₹${numBase}` : null;

                  return {
                    id: card.id || card._id || `svc-${Math.random()}`,
                    title: card.title,
                    rating: card.rating || '4.80',
                    reviews: card.reviews || null,
                    price: card.price ? `₹${card.price}` : `₹${numPrice}`,
                    originalPrice: origPriceStr,
                    discount: discountStr,
                    isInstant: Boolean(card.isInstant || card.instant || numPrice < 500),
                    desc: card.subtitle || card.features?.join(' • ') || card.description || 'Verified doorstep service with warranty.',
                    image: toAssetUrl(card.imageUrl || b.icon || '/cat_images/electrician.jpg')
                  };
                })
              });
            });
          }
        });
      }

      // If no live brand sections, check PRESET_CATALOG_DATA
      if (sections.length === 0) {
        let presetKey = Object.keys(PRESET_CATALOG_DATA).find(
          (k) => slug.includes(k) || k.includes(slug)
        );
        if (!presetKey) {
          if (slug.includes('electr')) presetKey = 'electrician';
          else if (slug.includes('plumb')) presetKey = 'plumber';
          else if (slug.includes('carpent')) presetKey = 'carpenter';
          else if (slug.includes('clean')) presetKey = 'cleaning-service';
          else if (slug.includes('salon') || slug.includes('women')) presetKey = 'salon-for-women';
          else if (slug.includes('ac') || slug.includes('appliance')) presetKey = 'ac-appliance-repair';
          else if (slug.includes('pest')) presetKey = 'pest-control';
        }

        if (presetKey && PRESET_CATALOG_DATA[presetKey]) {
          sections = PRESET_CATALOG_DATA[presetKey].sections;
        }
      }

      const totalServices = sections.reduce((acc, sec) => acc + (sec.items?.length || 0), 0);

      return {
        id: cat.id || cat._id || slug,
        slug: slug,
        title: cat.title,
        badge: cat.homeBadge || (cat.hasSaleBadge ? 'SALE' : null),
        icon: toAssetUrl(cat.homeIconUrl || cat.icon || '/cat_images/electrician.jpg'),
        totalServices,
        sections
      };
    });
  }, [categories, brands]);

  // Grand total services across all categories
  const grandTotalServices = useMemo(() => {
    return catalogData.reduce((acc, cat) => acc + (cat.totalServices || 0), 0);
  }, [catalogData]);

  // 3. Filter catalog: Search takes priority, otherwise respects selectedCategorySlug (all vs specific)
  const displayCatalog = useMemo(() => {
    let source = catalogData;

    // Filter by selected category (unless 'all' is selected or search is active)
    if (!searchQuery.trim() && selectedCategorySlug && selectedCategorySlug !== 'all') {
      source = catalogData.filter((c) => c.slug === selectedCategorySlug);
    }

    if (!searchQuery.trim()) {
      return source;
    }

    const query = searchQuery.toLowerCase().trim();

    return catalogData
      .map((cat) => {
        const catMatches = cat.title.toLowerCase().includes(query);

        const matchedSections = cat.sections
          .map((sec) => {
            const secMatches = sec.sectionTitle.toLowerCase().includes(query);
            const matchedItems = sec.items.filter(
              (it) =>
                it.title.toLowerCase().includes(query) ||
                (it.desc && it.desc.toLowerCase().includes(query)) ||
                secMatches ||
                catMatches
            );
            return {
              ...sec,
              items: matchedItems
            };
          })
          .filter((sec) => sec.items.length > 0);

        if (catMatches || matchedSections.length > 0) {
          return {
            ...cat,
            sections: matchedSections
          };
        }
        return null;
      })
      .filter(Boolean);
  }, [catalogData, searchQuery, selectedCategorySlug]);

  // 4. Cart Add / Remove handler
  const handleToggleAddService = useCallback(
    async (item, categoryTitle) => {
      try {
        const isAdded = cartItems.some(
          (ci) => (ci.serviceId && ci.serviceId === item.id) || ci.title === item.title
        );

        if (isAdded) {
          const found = cartItems.find(
            (ci) => (ci.serviceId && ci.serviceId === item.id) || ci.title === item.title
          );
          if (found && removeItem) {
            await removeItem(found._id || found.id);
            toast.success(`${item.title} removed from cart`);
          }
        } else {
          const rawPriceStr = String(item.price || '99');
          const numPrice = parseFloat(rawPriceStr.replace(/[^0-9.]/g, '')) || 99;

          if (addToCart) {
            await addToCart({
              serviceId: item.id && item.id.length === 24 ? item.id : null,
              title: item.title,
              category: categoryTitle || 'Home Services',
              price: numPrice,
              unitPrice: numPrice,
              serviceCount: 1,
              icon: item.image || '',
              description: item.desc || ''
            });
            toast.success(`${item.title} added to cart!`);
          }
        }
      } catch (err) {
        console.error('Error toggling cart in AllServices:', err);
        toast.error('Failed to update cart. Please try again.');
      }
    },
    [cartItems, addToCart, removeItem]
  );

  // 5. Quantity stepper handler directly from cards
  const handleUpdateQuantity = useCallback(
    async (item, change, categoryTitle) => {
      try {
        const found = cartItems.find(
          (ci) => (ci.serviceId && ci.serviceId === item.id) || ci.title === item.title
        );

        if (!found) {
          if (change > 0) {
            await handleToggleAddService(item, categoryTitle);
          }
          return;
        }

        const currentCount = found.serviceCount || 1;
        const newCount = currentCount + change;

        if (newCount <= 0) {
          if (removeItem) {
            await removeItem(found._id || found.id, item.title);
            toast.success(`${item.title} removed from cart`);
          }
        } else {
          if (updateItem) {
            await updateItem(found._id || found.id, newCount);
          }
        }
      } catch (err) {
        console.error('Error updating quantity in AllServices:', err);
        toast.error('Failed to update quantity.');
      }
    },
    [cartItems, removeItem, updateItem, handleToggleAddService]
  );

  // Cart total price computation
  const totalCartPrice = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + (item.price || 0), 0);
  }, [cartItems]);

  // 6. Select category handler (Only shows that category unless 'all' is clicked)
  const handleSelectCategory = (slug) => {
    setSelectedCategorySlug(slug);
    setSelectedSubcategoryTitle('all');
    if (slug === 'all') {
      setSearchParams({});
    } else {
      setSearchParams({ category: slug });
    }
    // Scroll to the very top so the sticky header does not occlude the category heading
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* =============================================================
          1. STICKY TOP APP HEADER
         ============================================================= */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/user')}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-transform active:scale-95 cursor-pointer"
              title="Back to Dashboard"
            >
              <FiArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-sm sm:text-base font-extrabold font-heading text-slate-900 leading-tight">
                All Services & Categories
              </h1>
              <div className="flex items-center gap-1.5 text-[10.5px] text-slate-500 font-medium">
                <FiMapPin className="w-2.5 h-2.5 text-red-500 shrink-0" />
                <span className="truncate max-w-[160px] sm:max-w-xs">
                  {currentCity?.name ? `Serving in ${currentCity.name}` : 'Transparent doorstep services'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
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

        {/* Live Search Bar */}
        <div className="max-w-7xl mx-auto px-4 pb-2.5">
          <div className="relative flex items-center">
            <FiSearch className="absolute left-3 text-slate-400 w-3.5 h-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search across all categories, repairs, and services..."
              className="w-full bg-slate-100/90 text-slate-900 text-xs rounded-xl pl-9 pr-8 py-2 border border-slate-200 focus:bg-white focus:border-slate-900 outline-none transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 text-slate-400 hover:text-slate-600"
              >
                <FiX className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile Sticky Horizontal Category Pills (Hidden on Desktop) */}
        {!searchQuery && (
          <div className="md:hidden border-t border-slate-100 px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
            {/* 'ALL' Tab Pill */}
            <button
              type="button"
              onClick={() => handleSelectCategory('all')}
              className={`shrink-0 px-3 py-1 rounded-full text-[11.5px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                selectedCategorySlug === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <FiGrid className="w-3 h-3" />
              <span>All</span>
              {grandTotalServices > 0 && (
                <span
                  className={`text-[8.5px] px-1.5 py-0.2 rounded-full font-extrabold ${
                    selectedCategorySlug === 'all' ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {grandTotalServices}
                </span>
              )}
            </button>

            {/* Category Pills */}
            {catalogData.map((cat) => {
              const isSelected = selectedCategorySlug === cat.slug;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelectCategory(cat.slug)}
                  className={`shrink-0 px-3 py-1 rounded-full text-[11.5px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span className="truncate max-w-[120px]">{cat.title}</span>
                  {cat.totalServices > 0 && (
                    <span
                      className={`text-[8.5px] px-1.5 py-0.2 rounded-full font-extrabold ${
                        isSelected ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {cat.totalServices}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* =============================================================
          2. MAIN RESPONSIVE BODY (2-Column on Web, Stacked on Mobile)
         ============================================================= */}
      <main ref={contentTopRef} className="max-w-7xl mx-auto px-3 sm:px-4 pt-3 pb-8 sm:pt-5 scroll-mt-40">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin mb-3" />
            <p className="text-xs font-semibold text-slate-500">Loading catalog services...</p>
          </div>
        ) : displayCatalog.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-md mx-auto my-6 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-2.5">
              <FiPackage className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">No services found</h3>
            <p className="text-xs text-slate-500 mb-3">
              {searchQuery
                ? `We couldn't find any services matching "${searchQuery}".`
                : 'No services available in this category yet.'}
            </p>
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer"
              >
                Clear Search
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSelectCategory('all')}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer"
              >
                View All Categories
              </button>
            )}
          </div>
        ) : (
          <div className="md:grid md:grid-cols-12 md:gap-6 items-start">
            {/* =========================================================
                DESKTOP LEFT CATEGORY SIDEBAR (Visible on md+)
               ========================================================= */}
            <aside className="hidden md:block md:col-span-4 lg:col-span-3 sticky top-32 space-y-1.5 bg-white rounded-2xl border border-slate-200/80 p-2.5 shadow-xs">
              <div className="px-2 py-1 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <span className="flex items-center gap-1">
                  <FiFilter className="w-3 h-3" /> Filter Category
                </span>
                <span>{catalogData.length}</span>
              </div>

              <div className="space-y-1 max-h-[calc(100vh-190px)] overflow-y-auto pr-1">
                {/* 'ALL' Tab in Sidebar */}
                <button
                  type="button"
                  onClick={() => handleSelectCategory('all')}
                  className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between group cursor-pointer ${
                    selectedCategorySlug === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        selectedCategorySlug === 'all' ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <FiGrid className="w-3.5 h-3.5" />
                    </div>
                    <span className="truncate">All Categories</span>
                  </div>
                  <span
                    className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full ${
                      selectedCategorySlug === 'all' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {grandTotalServices}
                  </span>
                </button>

                {/* Category Item Buttons in Sidebar */}
                {catalogData.map((cat) => {
                  const isSelected = selectedCategorySlug === cat.slug;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleSelectCategory(cat.slug)}
                      className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between group cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-white/10' : 'bg-slate-100'
                          }`}
                        >
                          <img
                            src={cat.icon}
                            alt={cat.title}
                            className="w-full h-full object-cover rounded-md"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = '/cat_images/electrician.jpg';
                            }}
                          />
                        </div>
                        <span className="truncate">{cat.title}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {cat.badge && (
                          <span
                            className={`text-[8.5px] font-bold px-1.5 py-0.2 rounded-full uppercase ${
                              isSelected
                                ? 'bg-amber-400 text-slate-900'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {cat.badge}
                          </span>
                        )}
                        <span
                          className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full ${
                            isSelected ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {cat.totalServices}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* =========================================================
                RIGHT SERVICE CONTENT AREA
               ========================================================= */}
            <div className="md:col-span-8 lg:col-span-9 space-y-6">
              {/* =======================================================
                  CASE A: "ALL" VIEW - Visual Marketplace Showcase Feed
                  Each category shows its title, Explore All button, and its
                  top row of 3 cards. It is vibrant, fast, and never dull!
                 ======================================================= */}
              {selectedCategorySlug === 'all' ? (
                <>
                  <div className="flex items-center justify-between px-0.5 pb-0.5 text-xs text-slate-500 font-medium">
                    <span className="text-[11px] text-slate-500 font-semibold">
                      Explore All Categories ({grandTotalServices} Services Available)
                    </span>
                  </div>

                  <div className="space-y-6">
                    {displayCatalog.map((cat) => {
                      const featuredSection = cat.sections[0];
                      const otherSections = cat.sections.slice(1);

                      return (
                        <section key={cat.id} className="space-y-2.5">
                          {/* Category Header */}
                          <div className="flex items-center justify-between py-1.5 px-0.5 border-b border-slate-200/80">
                            <div className="flex items-center gap-2 min-w-0">
                              <h2 className="text-sm sm:text-base font-extrabold font-heading text-slate-900 truncate">
                                {cat.title}
                              </h2>
                              {cat.badge && (
                                <span className="text-[8px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 uppercase shrink-0">
                                  {cat.badge}
                                </span>
                              )}
                              {cat.totalServices > 0 && (
                                <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 shrink-0">
                                  ({cat.totalServices} {cat.totalServices === 1 ? 'service' : 'services'})
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleSelectCategory(cat.slug)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50/80 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0"
                            >
                              <span>Explore all {cat.totalServices > 0 ? `(${cat.totalServices})` : ''}</span>
                              <FiChevronRight className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Featured Row of 3 Cards */}
                          {featuredSection ? (
                            <div className="space-y-1.5">
                              <SectionRowCarousel
                                sec={featuredSection}
                                cat={cat}
                                cartItems={cartItems}
                                handleToggleAddService={handleToggleAddService}
                                handleUpdateQuantity={handleUpdateQuantity}
                                navigate={navigate}
                              />

                              {otherSections.length > 0 && (
                                <div className="flex items-center justify-between text-[10.5px] text-slate-500 pt-0.5 px-0.5">
                                  <span className="truncate max-w-[220px] sm:max-w-md text-slate-400">
                                    More: {otherSections.map((s) => s.sectionTitle).join(', ')}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleSelectCategory(cat.slug)}
                                    className="font-bold text-blue-600 hover:underline shrink-0 cursor-pointer ml-2"
                                  >
                                    +{otherSections.length} more subcategories →
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="bg-white rounded-xl border border-dashed border-slate-200 p-3.5 text-center">
                              <p className="text-[11px] font-semibold text-slate-500">
                                Services coming soon for {cat.title}
                              </p>
                            </div>
                          )}
                        </section>
                      );
                    })}
                  </div>
                </>
              ) : (
                /* =======================================================
                   CASE B: CATEGORY VIEW (e.g. Electrician, Plumber)
                   Shows the Category Header, Subcategory Filter Pills Bar,
                   and all sections/carousels under this specific trade!
                   ======================================================= */
                displayCatalog.map((cat) => {
                  const visibleSections =
                    selectedSubcategoryTitle === 'all'
                      ? cat.sections
                      : cat.sections.filter((s) => s.sectionTitle === selectedSubcategoryTitle);

                  return (
                    <section key={cat.id} className="space-y-4">
                      {/* Category Header */}
                      <div className="flex items-center justify-between py-1 px-0.5 border-b border-slate-200/80">
                        <div className="flex items-center gap-2 min-w-0">
                          <h2 className="text-base sm:text-lg font-extrabold font-heading text-slate-900 truncate">
                            {cat.title}
                          </h2>
                          {cat.badge && (
                            <span className="text-[8px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 uppercase shrink-0">
                              {cat.badge}
                            </span>
                          )}
                          {cat.totalServices > 0 && (
                            <span className="text-[11px] font-bold text-slate-400 shrink-0">
                              ({cat.totalServices} services available)
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSelectCategory('all')}
                          className="text-[11px] font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                        >
                          View All Categories
                        </button>
                      </div>

                      {/* Subcategory Sticky/Scrollable Filter Pills Bar */}
                      {cat.sections.length > 1 && (
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                          <button
                            type="button"
                            onClick={() => setSelectedSubcategoryTitle('all')}
                            className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                              selectedSubcategoryTitle === 'all'
                                ? 'bg-slate-900 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            All ({cat.totalServices})
                          </button>
                          {cat.sections.map((sec, sIdx) => {
                            const isSecActive = selectedSubcategoryTitle === sec.sectionTitle;
                            return (
                              <button
                                key={sIdx}
                                type="button"
                                onClick={() => setSelectedSubcategoryTitle(sec.sectionTitle)}
                                className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                                  isSecActive
                                    ? 'bg-slate-900 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                <span>{sec.sectionTitle}</span>
                                <span
                                  className={`ml-1 text-[9px] font-extrabold ${
                                    isSecActive ? 'text-slate-300' : 'text-slate-400'
                                  }`}
                                >
                                  ({sec.items.length})
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Subcategory Carousels */}
                      {visibleSections.length > 0 ? (
                        <div className="space-y-5">
                          {visibleSections.map((sec, sIdx) => (
                            <SectionRowCarousel
                              key={sIdx}
                              sec={sec}
                              cat={cat}
                              cartItems={cartItems}
                              handleToggleAddService={handleToggleAddService}
                              handleUpdateQuantity={handleUpdateQuantity}
                              navigate={navigate}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="bg-white rounded-xl border border-dashed border-slate-200 p-4 text-center">
                          <p className="text-xs text-slate-500">No services found for this subcategory.</p>
                        </div>
                      )}
                    </section>
                  );
                })
              )}
            </div>
          </div>
        )}
      </main>

      {/* Floating Bottom Cart Bar for Seamless Quick Checkout */}
      {cartCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 z-40 max-w-sm ml-auto animate-in fade-in slide-in-from-bottom-3 duration-200">
          <button
            type="button"
            onClick={() => navigate('/cart')}
            className="w-full bg-slate-900 hover:bg-black text-white px-4 py-3 rounded-2xl shadow-xl flex items-center justify-between gap-3 cursor-pointer border border-slate-700/50 active:scale-98 transition-all"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-[#B33A35] flex items-center justify-center font-bold text-xs text-white shrink-0">
                <FiShoppingCart className="w-3.5 h-3.5" />
              </div>
              <div className="text-left leading-tight min-w-0">
                <p className="text-xs font-bold truncate">
                  {cartCount} {cartCount === 1 ? 'service' : 'services'} in cart
                </p>
                {totalCartPrice > 0 && (
                  <p className="text-[11px] text-emerald-400 font-extrabold">
                    ₹{totalCartPrice.toLocaleString('en-IN')}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 text-xs font-extrabold text-amber-300 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl shrink-0 transition-colors">
              <span>View Cart</span>
              <FiChevronRight className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

export default AllServices;
