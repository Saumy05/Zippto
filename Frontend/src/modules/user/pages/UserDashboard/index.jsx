import React, { useState, useMemo, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  FiSearch,
  FiUser,
  FiBell,
  FiShield,
  FiZap,
  FiCheckCircle,
  FiClock,
  FiArrowRight,
  FiArrowLeft,
  FiCreditCard,
  FiX,
  FiMenu,
  FiSmartphone,
  FiMapPin,
  FiChevronDown,
  FiStar,
  FiPlus,
  FiCheck
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useCart } from '../../../../context/CartContext';
import { publicCatalogService } from '../../../../services/catalogService';

const toAssetUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads/') || url.startsWith('uploads/')) {
    const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001').replace(/\/api\/?$/, '');
    return `${base}/${url.replace(/^\/+/, '')}`;
  }
  // Frontend public static assets
  return url;
};

const DEFAULT_CATEGORY_CONFIG = {
  electrician: {
    icon: '/cat_images/electrician.jpg',
    subCategories: [
      { id: 'switch-socket', name: 'Switch & Socket Replacement', icon: '🔌' },
      { id: 'fan-repair', name: 'Ceiling Fan Repair & Mounting', icon: '🌀' },
      { id: 'mcb-repair', name: 'MCB & Fuse Box Repair', icon: '⚡' },
      { id: 'tv-install', name: 'Tv Installation & Wiring', icon: '📺' },
    ]
  },
  plumber: {
    icon: '/cat_images/plumber.jpg',
    subCategories: [
      { id: 'tap-repair', name: 'Tap & Mixer Leakage Repair', icon: '🚰' },
      { id: 'drainage-clear', name: 'Blockage & Drainage Clearing', icon: '🧼' },
      { id: 'toilet-flush', name: 'Flush Tank & Toilet Repair', icon: '🚽' },
      { id: 'pipe-fitting', name: 'Water Pipe & Tank Fitting', icon: '🚿' },
    ]
  },
  carpenter: {
    icon: '/cat_images/carpenter.jpg',
    subCategories: [
      { id: 'door-lock', name: 'Door Hinge & Lock Repair', icon: '🚪' },
      { id: 'furniture-assemble', name: 'Furniture Assembly & Repair', icon: '🪑' },
      { id: 'sofa-repair', name: 'Sofa Repair & Upholstery', icon: '🛋️' },
      { id: 'hanger-decor', name: 'Hanger & Wall Decor Fitting', icon: '🖼️' },
    ]
  },
  'salon-for-women': {
    icon: '/cat_images/salon_women.jpg',
    subCategories: [
      { id: 'waxing', name: 'Waxing', image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=200' },
      { id: 'facial', name: 'Facial', image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=200' },
      { id: 'korean-glow', name: 'Korean Glow', image: 'https://images.unsplash.com/photo-1512290900673-700200877a56?w=200' },
      { id: 'mani-pedi', name: 'Mani-Pedi', image: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=200' },
      { id: 'hair', name: 'Hair', image: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=200' },
    ]
  },
  'ac-appliance-repair': {
    icon: '/ac_repair_wall.png',
    subCategories: [
      { id: 'ac-service', name: 'AC Service & Repair', icon: '❄️' },
      { id: 'refrigerator', name: 'Refrigerator Repair', icon: '🧊' },
      { id: 'washing-machine', name: 'Washing Machine Repair', icon: '🧺' },
      { id: 'geyser', name: 'Geyser & Water Heater', icon: '🚿' },
    ]
  },
  'cleaning-service': {
    icon: '/cat_cleaning.png',
    subCategories: [
      { id: 'deep-clean', name: 'Full Home Deep Cleaning', icon: '✨' },
      { id: 'bathroom-clean', name: 'Bathroom Cleaning', icon: '🧼' },
      { id: 'kitchen-clean', name: 'Kitchen Cleaning', icon: '🍳' },
      { id: 'sofa-cleaning', name: 'Sofa Cleaning', icon: '🛋️' },
    ]
  },
  'pest-control': {
    icon: '/intense_bathroom_cleaning.png',
    subCategories: [
      { id: 'cockroach-pest', name: 'Cockroach Control', icon: '🪲' },
      { id: 'termite-pest', name: 'Termite Treatment', icon: '🪵' },
      { id: 'bedbug-pest', name: 'Bed Bug Eradication', icon: '🛏️' },
    ]
  },
  'painting-service': {
    icon: '/drill_wall_decor.png',
    subCategories: [
      { id: 'interior-paint', name: 'Full Interior Paint', icon: '🎨' },
      { id: 'waterproofing', name: 'Waterproofing', icon: '💧' },
      { id: 'wall-texture', name: 'Wall Texture', icon: '🖼️' },
    ]
  },
  'construction-renovation': {
    icon: '/switchboard_repair.png',
    subCategories: [
      { id: 'civil-repair', name: 'Civil Repair Work', icon: '🧱' },
      { id: 'false-ceiling', name: 'False Ceiling & Gypsum', icon: '🏗️' },
      { id: 'tile-laying', name: 'Tile & Marble Laying', icon: '📐' },
    ]
  },
  'solar-service': {
    icon: '/native_water_purifier.png',
    subCategories: [
      { id: 'solar-inverter-wiring-repair', name: 'Solar Inverter & Wiring Repair', icon: '⚡' },
      { id: 'solar-panel-washing', name: 'Solar Panel Washing', icon: '🧼' },
      { id: 'rooftop-solar-installation', name: 'Rooftop Solar Installation', icon: '☀️' },
    ]
  }
};

const UserDashboard = () => {
  const { cartItems = [], cartCount = 0, addToCart, removeItem } = useCart() || {};
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [newsletterInput, setNewsletterInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Interactive Flow States
  const [activeCategoryModal, setActiveCategoryModal] = useState(null);
  const [activeDetailView, setActiveDetailView] = useState(null);

  // Cart Add / Remove Toggle Handler
  const handleToggleAddService = async (item, sectionTitle) => {
    try {
      const isAlreadyInCart = cartItems.some(
        ci => (ci.serviceId && ci.serviceId === item.id) || ci.title === item.title
      );

      if (isAlreadyInCart) {
        const foundItem = cartItems.find(
          ci => (ci.serviceId && ci.serviceId === item.id) || ci.title === item.title
        );
        if (foundItem && removeItem) {
          await removeItem(foundItem._id || foundItem.id);
          toast.success(`${item.title} removed from cart`);
        }
      } else {
        const rawPriceStr = String(item.price || '99');
        const numPrice = parseFloat(rawPriceStr.replace(/[^0-9.]/g, '')) || 99;

        if (addToCart) {
          await addToCart({
            serviceId: item.id && item.id.length === 24 ? item.id : null,
            title: item.title,
            category: activeDetailView?.title || 'Home Services',
            price: numPrice,
            unitPrice: numPrice,
            serviceCount: 1,
            icon: item.image || '',
            description: item.desc || ''
          });
          toast.success(`${item.title} added to cart!`);
        }
      }
    } catch (error) {
      console.error('Error toggling cart item:', error);
      toast.error('Failed to update cart. Please try again.');
    }
  };

  // Carousel Scroll Position Tracker State
  const [scrollState, setScrollState] = useState({});

  // Retrieve logged in user info if available
  const storedUser = useMemo(() => {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
      return null;
    }
  }, []);

  const userName = storedUser?.name || storedUser?.fullName || 'Alex Morgan';
  const userCity = storedUser?.city || 'Gondia, Maharashtra';

  // Smooth scroll handler for horizontal card carousels
  const scrollCarousel = (containerId, distance = 220) => {
    const el = document.getElementById(containerId);
    if (el) {
      el.scrollBy({ left: distance, behavior: 'smooth' });
    }
  };

  // Scroll Event Listener to dynamically show/hide Left and Right arrows
  const handleCarouselScroll = (containerId) => {
    const el = document.getElementById(containerId);
    if (el) {
      const isScrollable = el.scrollWidth > (el.clientWidth + 5);
      const canLeft = isScrollable && el.scrollLeft > 10;
      const canRight = isScrollable && (el.scrollLeft < (el.scrollWidth - el.clientWidth - 10));
      setScrollState((prev) => ({
        ...prev,
        [containerId]: { canLeft, canRight },
      }));
    }
  };

  // Prevent background scrolling ONLY when bottom sheet modal is open
  useEffect(() => {
    if (activeCategoryModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [activeCategoryModal]);

  useEffect(() => {
    const checkAllCarousels = () => {
      [
        'carousel-noteworthy',
        'carousel-most-booked',
        'carousel-cleaning',
        'carousel-appliance',
        'carousel-home-repair'
      ].forEach((id) => {
        handleCarouselScroll(id);
      });
    };
    checkAllCarousels();
    window.addEventListener('resize', checkAllCarousels);
    return () => window.removeEventListener('resize', checkAllCarousels);
  }, []);

  // Main Category Items State (Dynamic from DB with static fallback)
  const [mainCategories, setMainCategories] = useState([
    {
      id: 'electrician',
      slug: 'electrician',
      title: 'Electrician',
      image: '/cat_images/electrician.jpg',
      count: '4 services available',
      subCategories: [
        { id: 'switch-socket', name: 'Switch & Socket Replacement', icon: '🔌' },
        { id: 'fan-repair', name: 'Ceiling Fan Repair & Mounting', icon: '🌀' },
        { id: 'mcb-repair', name: 'MCB & Fuse Box Repair', icon: '⚡' },
        { id: 'tv-install', name: 'Tv Installation & Wiring', icon: '📺' },
      ],
    },
    {
      id: 'plumber',
      slug: 'plumber',
      title: 'Plumber',
      image: '/cat_images/plumber.jpg',
      count: '4 services available',
      subCategories: [
        { id: 'tap-repair', name: 'Tap & Mixer Leakage Repair', icon: '🚰' },
        { id: 'drainage-clear', name: 'Blockage & Drainage Clearing', icon: '🧼' },
        { id: 'toilet-flush', name: 'Flush Tank & Toilet Repair', icon: '🚽' },
        { id: 'pipe-fitting', name: 'Water Pipe & Tank Fitting', icon: 'Shower' },
      ],
    },
    {
      id: 'solar-service',
      slug: 'solar-service',
      title: 'Solar Service',
      image: '/native_water_purifier.png',
      count: '3 services available',
      subCategories: [
        { id: 'solar-inverter-wiring-repair', name: 'Solar Inverter & Wiring Repair', icon: '⚡' },
        { id: 'solar-panel-washing', name: 'Solar Panel Washing', icon: '🧼' },
        { id: 'rooftop-solar-installation', name: 'Rooftop Solar Installation', icon: '☀️' }
      ]
    }
  ]);

  // Fetch live categories dynamically from MongoDB API
  useEffect(() => {
    const fetchLiveCategories = async () => {
      try {
        const catRes = await publicCatalogService.getCategories();
        if (catRes.success && Array.isArray(catRes.categories) && catRes.categories.length > 0) {
          const liveCats = catRes.categories
            .filter(c => !c.title.toLowerCase().includes('test'))
            .map(c => {
              const config = DEFAULT_CATEGORY_CONFIG[c.slug] || DEFAULT_CATEGORY_CONFIG[c.id] || {};
              const iconPath = c.icon || c.homeIconUrl || config.icon || '/cat_images/electrician.jpg';
              const subCats = config.subCategories || [
                { id: c.slug, name: `${c.title} Services`, icon: '⚡' }
              ];

              return {
                id: c.slug || c.id,
                slug: c.slug || c.id,
                title: c.title,
                image: toAssetUrl(iconPath),
                count: `${subCats.length} services available`,
                subCategories: subCats
              };
            });

          if (liveCats.length > 0) {
            setMainCategories(liveCats);
          }
        }
      } catch (err) {
        console.error('Failed to fetch live categories:', err);
      }
    };
    fetchLiveCategories();
  }, []);

  // Detailed Services List for Sub-Category Detail View
  const electricianDetailData = {
    title: 'Electrician',
    rating: '4.5',
    reviews: '1.2k reviews',
    desc: 'Our electrician caters to everyone, providing a fun and comfortable atmosphere with premium, certified home expert styling and custom packages tailored for you.',
    subGrid: [
      { id: 'consultation', name: 'Book a consultation', image: '/cat_electrician_plumber.png' },
      { id: 'inverter', name: 'Inverter And Stabiliser', image: '/native_water_purifier.png' },
      { id: 'appliances', name: 'Appliances', image: '/ac_foam_jet_service.png' },
      { id: 'mcb', name: 'MCB/fuse', image: '/switchboard_repair.png' },
      { id: 'doorbell', name: 'Doorbell & security', image: '/drill_wall_decor.png' },
      { id: 'wiring', name: 'Wiring', image: '/switchboard_repair.png' },
      { id: 'light', name: 'Light', image: '/ac_repair_wall.png' },
      { id: 'fan', name: 'Fan', image: '/ac_repair_wall.png' },
      { id: 'switch-socket', name: 'Switch & socket', image: '/switchboard_repair.png' },
    ],
    detailedSections: [
      {
        sectionTitle: 'Book a consultation',
        items: [
          {
            id: 'book-consultant',
            title: 'Book consultant',
            rating: '4.8',
            reviews: '120 reviews',
            price: '₹0',
            desc: 'Book an electrical consultant for expert inspection, troubleshooting, safety advice, and exact cost estimation.',
            image: '/cat_electrician_plumber.png',
          },
        ],
      },
      {
        sectionTitle: 'Inverter And Stabiliser',
        items: [
          {
            id: 'inverter-install',
            title: 'Inverter installation',
            rating: '4.8',
            reviews: '120 reviews',
            price: 'Starting from ₹0',
            desc: 'Professional single inverter battery installation, replacement, and connection for seamless power backup.',
            image: '/native_water_purifier.png',
          },
          {
            id: 'inverter-stabilizer',
            title: 'Inverter and stabilizer repair',
            rating: '4.8',
            reviews: '120 reviews',
            price: 'Starting from ₹0',
            desc: 'Professional installation, repair, and replacement of inverters and stabilizers for optimal protection.',
            image: '/native_water_purifier.png',
          },
        ],
      },
      {
        sectionTitle: 'Appliances',
        items: [
          {
            id: 'home-theatre-install',
            title: 'Home theatre installation',
            rating: '4.8',
            reviews: '120 reviews',
            price: '₹0',
            desc: 'Professional home theatre installation with speaker setup, wiring, subwoofer tuning, and system check.',
            image: '/ac_foam_jet_service.png',
          },
        ],
      },
    ],
  };

  // Lower Sections Data
  const newNoteworthyServices = [
    { id: 'native-ro', title: 'Native Water Purifier', image: '/native_water_purifier.png', subtitle: 'Native RO', isGreenText: false },
    { id: 'bath-kitchen-clean', title: 'Bathroom & Kitchen Clean', image: '/intense_bathroom_cleaning.png', subtitle: 'Deep Clean', isGreenText: false },
    { id: 'ac-maintenance', title: 'AC Service & Repair', image: '/ac_repair_wall.png', subtitle: 'Certified Tech', isGreenText: false },
    { id: 'ac-foam-jet-quick', title: 'Foam-Jet AC Service', image: '/ac_foam_jet_service.png', subtitle: '⚡ In 44 mins', isGreenText: true },
    { id: 'plumbing-express', title: 'Tap & Plumbing Fix', image: '/tap_plumbing_repair.png', subtitle: '⚡ Instant Fix', isGreenText: true },
  ];

  const mostBookedServices = [
    { id: 'foam-jet-ac', title: 'Foam-jet AC service', image: '/ac_foam_jet_service.png', rating: '4.75', isInstant: true, price: '₹649', originalPrice: '', discountBadge: '' },
    { id: 'ac-repair', title: 'AC repair', image: '/ac_repair_wall.png', rating: '4.73', isInstant: true, price: '₹299', originalPrice: '', discountBadge: '' },
    { id: 'intense-clean-2', title: 'Intense cleaning (2 bath)', image: '/intense_bathroom_cleaning.png', rating: '4.80', isInstant: false, price: '₹872', originalPrice: '₹1,038', discountBadge: '8% OFF' },
    { id: 'tap-repair', title: 'Tap repair', image: '/tap_plumbing_repair.png', rating: '4.77', isInstant: false, price: '₹49', originalPrice: '', discountBadge: '' },
    { id: 'mattress-clean-mb', title: 'Mattress cleaning', image: '/mattress_cleaning.png', rating: '4.85', isInstant: false, price: '₹599', originalPrice: '', discountBadge: '' },
    { id: 'geyser-check-mb', title: 'Geyser check-up', image: '/geyser_checkup.png', rating: '4.72', isInstant: false, price: '₹249', originalPrice: '', discountBadge: '' },
  ];

  const cleaningEssentials = [
    { id: 'intense-clean-2b', title: 'Intense cleaning (2 bath)', image: '/intense_bathroom_cleaning.png', rating: '4.80', price: '₹872', originalPrice: '₹1,038', discountBadge: '8% OFF', isTextTile: false },
    { id: 'intense-clean-3b', title: 'Intense cleaning (3 bath)', image: '/intense_bathroom_cleaning.png', rating: '4.80', price: '₹1,225', originalPrice: '₹1,557', discountBadge: '11% OFF', isTextTile: false },
    { id: 'classic-clean-2b', title: 'Classic cleaning (2 bath)', image: '', rating: '4.81', price: '₹794', originalPrice: '₹858', discountBadge: '', isTextTile: true, tileText: '2 BATHROOMS' },
    { id: 'classic-clean-3b', title: 'Classic cleaning (3 bath)', image: '/intense_bathroom_cleaning.png', rating: '4.81', price: '₹1,159', originalPrice: '₹1,287', discountBadge: '', isTextTile: false },
    { id: 'mattress-clean-ce', title: 'Mattress cleaning', image: '/mattress_cleaning.png', rating: '4.84', price: '₹399', originalPrice: '', discountBadge: '', isTextTile: false },
    { id: 'tap-repair-ce', title: 'Sink & Tap Sanitation', image: '/tap_plumbing_repair.png', rating: '4.77', price: '₹199', originalPrice: '', discountBadge: '', isTextTile: false },
  ];

  const applianceRepairServices = [
    { id: 'foam-jet-ac-1', title: 'Foam-jet AC service', image: '/ac_foam_jet_service.png', rating: '4.75', isInstant: true, price: '₹649', originalPrice: '' },
    { id: 'ac-repair-1', title: 'AC repair', image: '/ac_repair_wall.png', rating: '4.73', isInstant: true, price: '₹299', originalPrice: '' },
    { id: 'foam-jet-2acs', title: 'Foam-jet service (2 ACs)', image: '/ac_foam_jet_service.png', rating: '4.75', isInstant: true, price: '₹1,198', originalPrice: '₹1,298' },
    { id: 'ac-uninstall', title: 'AC uninstallation', image: '/ac_repair_wall.png', rating: '4.79', isInstant: true, price: '₹649', originalPrice: '' },
    { id: 'geyser-check', title: 'Geyser check-up', image: '/geyser_checkup.png', rating: '4.72', isInstant: false, price: '₹249', originalPrice: '' },
    { id: 'native-ro-service', title: 'RO Purifier Service', image: '/native_water_purifier.png', rating: '4.88', isInstant: false, price: '₹399', originalPrice: '' },
  ];

  const homeRepairServices = [
    { id: 'tap-repair-hr', title: 'Tap repair', image: '/tap_plumbing_repair.png', rating: '4.77', isInstant: false, price: '₹49' },
    { id: 'drill-hang-decor', title: 'Drill & hang decor', image: '/drill_wall_decor.png', rating: '4.83', isInstant: true, price: '₹49' },
    { id: 'fan-repair', title: 'Fan repair (wall/ceiling)', image: '/ac_repair_wall.png', rating: '4.79', isInstant: false, price: '₹49' },
    { id: 'switchboard-repair', title: 'Switchboard repair', image: '/switchboard_repair.png', rating: '4.83', isInstant: false, price: '₹79' },
    { id: 'switch-socket-replace', title: 'Switch replacement', image: '/switchboard_repair.png', rating: '4.83', isInstant: false, price: '₹49' },
    { id: 'door-lock-fix', title: 'Door handle & lock', image: '/drill_wall_decor.png', rating: '4.80', isInstant: true, price: '₹99' },
  ];

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!newsletterInput.trim()) {
      toast.error('Please enter a valid mobile number or email');
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success('App link sent successfully!');
      setNewsletterInput('');
    }, 500);
  };

  return (
    <div className={`min-h-screen bg-[#F8FAFC] text-[#111827] font-sans antialiased pb-24 lg:pb-12 selection:bg-slate-900 selection:text-white transition-[padding] duration-200 ${mobileSearchOpen ? 'pt-[108px]' : 'pt-15'}`}>
      {/* -------------------------------------------------------------
          TOP NAVBAR HEADER (Fixed Top Navbar - Never Hides on Scroll!)
         ------------------------------------------------------------- */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 h-15 flex items-center justify-between gap-1.5 sm:gap-3">
          
          {/* LEFT: Zippto Speed Logo Icon & Brand Name */}
          <Link to="/user" className="flex items-center gap-1.5 shrink-0 focus:outline-none group">
            <img
              src="/zippto_logo.png"
              alt="ZIPPTO"
              className="w-8 h-8 xs:w-9 xs:h-9 sm:w-10 sm:h-10 rounded-xl object-contain shadow-xs transition-transform group-hover:scale-105"
            />
            <div className="flex flex-col text-left shrink-0">
              <span className="text-xs xs:text-sm sm:text-base font-black tracking-tight text-[#0B132B] leading-none">
                ZIPPTO
              </span>
              <span className="text-[7.5px] xs:text-[8px] sm:text-[9px] font-extrabold tracking-wider text-amber-500 uppercase leading-none mt-0.5 whitespace-nowrap">
                HOME SERVICES
              </span>
            </div>
          </Link>

          {/* MIDDLE: Location Selector Pill */}
          <div className="flex items-center gap-1 cursor-pointer group shrink min-w-0 px-1">
            <FiMapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <div className="flex items-center gap-0.5 text-[10px] xs:text-[11px] sm:text-xs font-bold text-slate-900 leading-none truncate max-w-[90px] xs:max-w-[120px] sm:max-w-none">
              <span className="truncate">{userCity}</span>
              <FiChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-700 shrink-0 transition-colors" />
            </div>
          </div>

          {/* DESKTOP/TABLET NAVIGATION LINKS */}
          <nav className="hidden md:flex items-center gap-1 xl:gap-1.5 shrink-0">
            <NavLink
              to="/user"
              end
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-full text-xs transition-all whitespace-nowrap ${
                  isActive
                    ? 'font-extrabold text-[#0B132B] bg-slate-100 border border-slate-200/80 shadow-2xs'
                    : 'font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`
              }
            >
              Home
            </NavLink>
            <NavLink
              to="/user/my-bookings"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-full text-xs transition-all whitespace-nowrap ${
                  isActive
                    ? 'font-extrabold text-[#0B132B] bg-slate-100 border border-slate-200/80 shadow-2xs'
                    : 'font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`
              }
            >
              Bookings
            </NavLink>
            <NavLink
              to="/user/scrap"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-full text-xs transition-all whitespace-nowrap ${
                  isActive
                    ? 'font-extrabold text-[#0B132B] bg-slate-100 border border-slate-200/80 shadow-2xs'
                    : 'font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`
              }
            >
              Scrap & Sell
            </NavLink>
            <NavLink
              to="/user/my-plan"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-full text-xs transition-all whitespace-nowrap ${
                  isActive
                    ? 'font-extrabold text-[#0B132B] bg-slate-100 border border-slate-200/80 shadow-2xs'
                    : 'font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`
              }
            >
              My Plan
            </NavLink>
            <NavLink
              to="/user/cart"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-full text-xs transition-all whitespace-nowrap flex items-center gap-1 ${
                  isActive
                    ? 'font-extrabold text-[#0B132B] bg-slate-100 border border-slate-200/80 shadow-2xs'
                    : 'font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`
              }
            >
              Cart
              {cartCount > 0 && (
                <span className="bg-red-500 text-white font-black text-[9px] px-1.5 py-0.2 rounded-full">
                  {cartCount}
                </span>
              )}
            </NavLink>
          </nav>

          {/* CENTER: Integrated Search Bar (Desktop / Tablet) */}
          <div className="hidden md:flex flex-1 max-w-xs xl:max-w-sm items-center mx-1">
            <div className="relative w-full flex items-center">
              <FiSearch className="absolute left-3 text-slate-400 w-4 h-4 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search electrician, plumber, AC repair, cleaning..."
                className="w-full bg-slate-50 text-slate-900 text-xs font-medium rounded-full pl-9 pr-8 py-2 border border-slate-200 focus:bg-white focus:border-slate-900 outline-none transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 text-slate-400 hover:text-slate-600"
                >
                  <FiX className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* RIGHT: Action Icons (Search, Bell Notification 9+, Profile Avatar) */}
          <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-2.5 shrink-0">
            <button
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className="md:hidden w-7.5 h-7.5 xs:w-8 xs:h-8 rounded-full bg-slate-100/80 hover:bg-slate-100 flex items-center justify-center text-slate-700 transition-colors"
              aria-label="Search"
            >
              <FiSearch className="w-3.5 h-3.5" />
            </button>

            <Link
              to="/user/wallet"
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200/80 text-xs font-bold text-slate-800 transition-colors"
            >
              <FiCreditCard className="w-3.5 h-3.5 text-slate-600" />
              <span>₹1,250</span>
            </Link>

            <Link
              to="/user/notifications"
              className="relative w-7.5 h-7.5 xs:w-8 xs:h-8 sm:w-8.5 sm:h-8.5 rounded-full bg-slate-100/80 hover:bg-slate-100 flex items-center justify-center text-slate-700 transition-colors shrink-0"
              aria-label="Notifications"
            >
              <FiBell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white font-black text-[7.5px] xs:text-[8px] px-1 py-0.2 rounded-full ring-2 ring-white shadow-2xs">
                9+
              </span>
            </Link>

            <Link
              to="/user/account"
              className="w-7.5 h-7.5 xs:w-8 xs:h-8 sm:w-8.5 sm:h-8.5 rounded-full bg-[#0B132B] text-white flex items-center justify-center text-xs font-black shrink-0 ring-2 ring-slate-100 hover:ring-slate-300 transition-all"
            >
              {userName.charAt(0).toUpperCase()}
            </Link>
          </div>
        </div>

        {/* Mobile Expandable Search Bar — rendered inside fixed header, part of sticky stack */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-200 ease-in-out bg-white/95 border-t border-slate-100 ${
            mobileSearchOpen ? 'max-h-16 opacity-100 py-2 px-4' : 'max-h-0 opacity-0 py-0 px-4'
          }`}
        >
          <div className="relative flex items-center">
            <FiSearch className="absolute left-3 text-slate-400 w-4 h-4 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search electrician, plumber, AC service..."
              className="w-full bg-slate-50 text-slate-900 text-xs rounded-full pl-9 pr-8 py-2 border border-slate-200 focus:bg-white focus:border-slate-900 outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 text-slate-400 hover:text-slate-600"
              >
                <FiX className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* -------------------------------------------------------------
          SERVICE DETAIL VIEW
         ------------------------------------------------------------- */}
      {activeDetailView ? (
        <main className="max-w-4xl mx-auto px-4 py-4 space-y-5">
          <div className="bg-[#0A1A2F] text-white rounded-2xl p-5 relative overflow-hidden shadow-md">
            <button
              onClick={() => setActiveDetailView(null)}
              className="mb-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-all backdrop-blur-xs"
            >
              <FiArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Categories</span>
            </button>

            <div className="space-y-1">
              <span className="text-[10px] font-bold tracking-widest text-amber-400 uppercase">
                SAFE • RELIABLE • PROFESSIONAL
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                ELECTRICAL SERVICES
              </h1>
            </div>
          </div>

          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">{activeDetailView.title}</h2>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1 font-bold text-amber-500">
                <FiStar className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                {activeDetailView.rating}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500 font-semibold">{activeDetailView.reviews}</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed pt-1">
              {activeDetailView.desc}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {activeDetailView.subGrid.map((sg) => (
              <div
                key={sg.id}
                onClick={() => {
                  const targetEl = document.getElementById(`section-${sg.id}`);
                  if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth' });
                }}
                className="flex flex-col items-center text-center cursor-pointer group"
              >
                <div className="w-full aspect-square rounded-2xl bg-white border border-slate-200/90 shadow-2xs overflow-hidden flex items-center justify-center p-2 group-hover:border-slate-400 group-hover:shadow-md transition-all">
                  <img src={sg.image} alt={sg.name} className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform" />
                </div>
                <span className="mt-1.5 text-[10.5px] sm:text-xs font-bold text-slate-800 leading-snug line-clamp-2">
                  {sg.name}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-5 pt-2">
            {activeDetailView.detailedSections.map((sec, idx) => (
              <div key={idx} className="space-y-2.5">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-1.5">
                  {sec.sectionTitle}
                </h3>

                <div className="space-y-2.5">
                  {sec.items.map((item) => {
                    const isAdded = cartItems.some(
                      ci => (ci.serviceId && ci.serviceId === item.id) || ci.title === item.title
                    );
                    return (
                      <div
                        key={item.id}
                        className="bg-white border border-slate-200/80 rounded-xl p-3 flex items-start justify-between gap-3 shadow-2xs hover:border-slate-300 transition-all"
                      >
                        <div className="space-y-1 flex-1">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900">{item.title}</h4>
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                            <span className="flex items-center gap-0.5 font-bold text-slate-900">
                              ★ {item.rating}
                            </span>
                            <span>({item.reviews})</span>
                          </div>
                          <p className="text-xs font-bold text-slate-900">{item.price}</p>
                          <p className="text-[11px] text-slate-500 leading-snug line-clamp-2 pt-0.5">
                            {item.desc}
                          </p>
                        </div>

                        <div className="flex flex-col items-center shrink-0 space-y-1.5">
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-slate-100 overflow-hidden border border-slate-100 relative">
                            <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleAddService(item, sec.sectionTitle)}
                            className={`w-16 sm:w-20 py-1 rounded-md font-bold text-[11px] transition-all shadow-2xs flex items-center justify-center gap-1 ${
                              isAdded
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                : 'bg-white text-red-600 border border-red-200 hover:bg-red-50'
                            }`}
                          >
                            {isAdded ? (
                              <>
                                <FiCheck className="w-3 h-3" /> Added
                              </>
                            ) : (
                              <>Add +</>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </main>
      ) : (
        /* -------------------------------------------------------------
            MAIN DASHBOARD VIEW
           ------------------------------------------------------------- */
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2 space-y-5">
          
          {/* COMPACT HERO AWARENESS BANNER */}
          <section className="flex w-full rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100 border border-amber-200/80 p-4 sm:p-5 flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden shadow-2xs">
            <div className="space-y-2 max-w-xl text-left">
              <span className="font-extrabold text-[10px] tracking-widest text-slate-900 uppercase">
                ZIPPTO HOME SERVICES
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight tracking-tight">
                All Your Home Needs, <br className="hidden sm:inline" />
                One <span className="text-slate-900 underline decoration-amber-400">Reliable Partner.</span>
              </h1>
              <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold text-slate-700 flex-wrap">
                <span className="bg-white/80 px-2 py-0.5 rounded border border-amber-200">⚡ Electrician</span>
                <span className="bg-white/80 px-2 py-0.5 rounded border border-amber-200">🚰 Plumber</span>
                <span className="bg-white/80 px-2 py-0.5 rounded border border-amber-200">🧹 Cleaning</span>
                <span className="bg-white/80 px-2 py-0.5 rounded border border-amber-200">🎨 Painting</span>
              </div>
              <div className="pt-0.5">
                <button
                  onClick={() => toast.success('Explore verified home specialists below')}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-900 text-white font-bold text-xs shadow-xs hover:bg-slate-800 transition-all"
                >
                  Explore Services
                </button>
              </div>
            </div>

            <div className="w-full md:w-1/4 flex items-center justify-center">
              <img
                src="/cat_electrician_plumber.png"
                alt="Reliable Partner"
                className="max-h-32 sm:max-h-40 object-contain drop-shadow-sm"
              />
            </div>
          </section>

          {/* =============================================================
              COMPACT CATEGORIES GRID (Texts outside the image card tiles)
             ============================================================= */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Categories
              </h2>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4">
              {mainCategories.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => setActiveCategoryModal(cat)}
                  className="flex flex-col items-center text-center cursor-pointer group"
                >
                  {/* The Image Card Tile */}
                  <div className="w-full aspect-square rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-center p-2 overflow-hidden group-hover:border-slate-400 group-hover:shadow-md transition-all duration-300">
                    <img
                      src={cat.image}
                      alt={cat.title}
                      className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  {/* Title Text Outside the Card Tile */}
                  <h3 className="mt-1.5 text-[10.5px] sm:text-xs font-bold text-slate-900 leading-snug text-center line-clamp-2 px-0.5">
                    {cat.title}
                  </h3>
                </div>
              ))}
            </div>
          </section>

          {/* =============================================================
              SECTION: "New and noteworthy" (Desktop / Tablet Only)
             ============================================================= */}
          <section className="hidden md:block space-y-2 relative">
            <h2 className="text-base font-bold text-[#111827] tracking-tight">
              New and noteworthy
            </h2>

            <div className="relative group/carousel">
              <div className={`absolute left-1 sm:-left-2 top-[38%] -translate-y-1/2 z-20 flex md:hidden transition-opacity duration-200 ${scrollState['carousel-noteworthy']?.canLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <button
                  onClick={() => scrollCarousel('carousel-noteworthy', -220)}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/95 backdrop-blur-xs border border-slate-200/90 shadow-md flex items-center justify-center text-slate-800 hover:bg-slate-50 active:scale-95 transition-all focus:outline-none"
                  aria-label="Scroll left"
                >
                  <FiArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-900" />
                </button>
              </div>

              <div
                id="carousel-noteworthy"
                onScroll={() => handleCarouselScroll('carousel-noteworthy')}
                className="flex md:grid md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] py-1 px-1"
              >
                {newNoteworthyServices.map((card) => (
                  <div
                    key={card.id}
                    className="group cursor-pointer flex flex-col w-[135px] sm:w-[155px] md:w-auto shrink-0 snap-start"
                  >
                    <div className="w-full aspect-[4/3] relative overflow-hidden rounded-2xl bg-slate-100 border border-slate-200/80 shadow-2xs">
                      <img
                        src={card.image}
                        alt={card.title}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                      />
                    </div>
                    <div className="mt-1.5 px-0.5">
                      <h3 className="text-[11px] sm:text-xs font-bold text-[#111827] leading-tight font-sans line-clamp-1">
                        {card.title}
                      </h3>
                      {card.subtitle && (
                        <p className={`text-[10px] font-bold mt-0.5 ${card.isGreenText ? 'text-[#00875A]' : 'text-slate-500'}`}>
                          {card.subtitle}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className={`absolute right-1 sm:-right-2 top-[38%] -translate-y-1/2 z-20 flex md:hidden transition-opacity duration-200 ${scrollState['carousel-noteworthy']?.canRight ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <button
                  onClick={() => scrollCarousel('carousel-noteworthy', 220)}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/95 backdrop-blur-xs border border-slate-200/90 shadow-md flex items-center justify-center text-slate-800 hover:bg-slate-50 active:scale-95 transition-all focus:outline-none"
                  aria-label="Scroll right"
                >
                  <FiArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-900" />
                </button>
              </div>
            </div>
          </section>

          {/* SECTION: "Most booked services" (Desktop / Tablet Only) */}
          <section className="hidden md:block space-y-2 relative">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#111827] tracking-tight">
                Most booked services
              </h2>
            </div>

            <div className="relative group/carousel">
              <div className={`absolute left-1 sm:-left-2 top-[40%] -translate-y-1/2 z-20 flex md:hidden transition-opacity duration-200 ${scrollState['carousel-most-booked']?.canLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <button
                  onClick={() => scrollCarousel('carousel-most-booked', -220)}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/95 backdrop-blur-xs border border-slate-200/90 shadow-md flex items-center justify-center text-slate-800 hover:bg-slate-50 active:scale-95 transition-all focus:outline-none"
                  aria-label="Scroll left"
                >
                  <FiArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-900" />
                </button>
              </div>

              <div
                id="carousel-most-booked"
                onScroll={() => handleCarouselScroll('carousel-most-booked')}
                className="flex md:grid md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] py-1 px-1"
              >
                {mostBookedServices.map((card) => (
                  <div
                    key={card.id}
                    className="group cursor-pointer flex flex-col w-[135px] sm:w-[155px] md:w-auto shrink-0 snap-start"
                  >
                    <div className="w-full aspect-[4/3] relative overflow-hidden rounded-2xl bg-slate-100 border border-slate-200/80 shadow-2xs">
                      <img
                        src={card.image}
                        alt={card.title}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                      />
                      {card.discountBadge && (
                        <span className="absolute top-1.5 left-1.5 bg-[#007F5F] text-white font-bold text-[8px] px-1 py-0.2 rounded-[2px] uppercase tracking-wide">
                          {card.discountBadge}
                        </span>
                      )}
                    </div>

                    <div className="px-0.5">
                      <h3 className="text-[11px] sm:text-xs font-bold text-[#111827] leading-tight mt-1.5 line-clamp-1">
                        {card.title}
                      </h3>

                      <div className="flex items-center gap-1 text-[10px] text-slate-700 font-medium mt-0.5">
                        <span className="flex items-center gap-0.5 font-bold">
                          ★ {card.rating}
                        </span>
                        {card.isInstant && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="text-[#00875A] font-bold">
                              ⚡ Instant
                            </span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[11px] sm:text-xs font-bold text-[#111827]">{card.price}</span>
                        {card.originalPrice && (
                          <span className="text-[9px] text-slate-400 line-through font-normal">
                            {card.originalPrice}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className={`absolute right-1 sm:-right-2 top-[40%] -translate-y-1/2 z-20 flex md:hidden transition-opacity duration-200 ${scrollState['carousel-most-booked']?.canRight ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <button
                  onClick={() => scrollCarousel('carousel-most-booked', 220)}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/95 backdrop-blur-xs border border-slate-200/90 shadow-md flex items-center justify-center text-slate-800 hover:bg-slate-50 active:scale-95 transition-all focus:outline-none"
                  aria-label="Scroll right"
                >
                  <FiArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-900" />
                </button>
              </div>
            </div>
          </section>

          {/* NATIVE WATER PURIFIER BANNER (Desktop / Tablet Only) */}
          <section className="hidden md:flex w-full rounded-2xl bg-[#EBE7DF] overflow-hidden border border-slate-200/60 p-4 sm:p-5 flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
            <div className="space-y-1.5 max-w-lg">
              <span className="inline-block bg-[#007F5F] text-white font-bold text-[9px] px-2 py-0.5 rounded-[3px]">
                Up to ₹3,550 off
              </span>
              <div>
                <h3 className="text-lg sm:text-xl font-extrabold text-[#111827] tracking-tight">
                  NATIVE RO water purifier
                </h3>
                <p className="text-xs font-medium text-slate-700">
                  Needs no service for 2 years
                </p>
              </div>
              <button className="px-3.5 py-1.5 rounded-md bg-white text-[#111827] font-bold text-xs shadow-2xs hover:bg-slate-50 transition-colors">
                Buy now
              </button>
            </div>

            <div className="w-full sm:w-1/3 flex items-center justify-center">
              <img
                src="/native_water_purifier.png"
                alt="Native Water Purifier"
                className="max-h-28 sm:max-h-36 object-contain rounded-lg shadow-2xs"
              />
            </div>
          </section>

          {/* SECTION: "Cleaning Essentials" (Desktop / Tablet Only) */}
          <section className="hidden md:block space-y-2 relative">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#111827] tracking-tight">
                  Cleaning Essentials
                </h2>
                <p className="text-[10px] sm:text-[11px] text-slate-500">Monthly essential services</p>
              </div>
              <button className="px-2.5 py-1 rounded-md border border-slate-200 text-[10px] sm:text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                See all
              </button>
            </div>

            <div className="relative group/carousel">
              <div className={`absolute left-1 sm:-left-2 top-[48%] -translate-y-1/2 z-20 flex md:hidden transition-opacity duration-200 ${scrollState['carousel-cleaning']?.canLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <button
                  onClick={() => scrollCarousel('carousel-cleaning', -220)}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/95 backdrop-blur-xs border border-slate-200/90 shadow-md flex items-center justify-center text-slate-800 hover:bg-slate-50 active:scale-95 transition-all focus:outline-none"
                  aria-label="Scroll left"
                >
                  <FiArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-900" />
                </button>
              </div>

              <div
                id="carousel-cleaning"
                onScroll={() => handleCarouselScroll('carousel-cleaning')}
                className="flex md:grid md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] py-1 px-1"
              >
                {cleaningEssentials.map((card) => (
                  <div
                    key={card.id}
                    className="group cursor-pointer flex flex-col w-[135px] sm:w-[155px] md:w-auto shrink-0 snap-start"
                  >
                    <div className="w-full aspect-[4/3] relative overflow-hidden rounded-2xl bg-[#EFEFEF] border border-slate-200/80 shadow-2xs flex items-center justify-center">
                      {card.isTextTile ? (
                        <div className="flex flex-col items-center justify-center text-center p-2">
                          <span className="text-2xl font-black text-[#111827] tracking-tighter">2</span>
                          <span className="text-[9px] font-extrabold text-[#111827] tracking-wider uppercase mt-0.5">BATHROOMS</span>
                        </div>
                      ) : (
                        <img
                          src={card.image}
                          alt={card.title}
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                        />
                      )}
                      {card.discountBadge && (
                        <span className="absolute top-1.5 left-1.5 bg-[#007F5F] text-white font-bold text-[8px] px-1 py-0.2 rounded-[2px] uppercase tracking-wide">
                          {card.discountBadge}
                        </span>
                      )}
                    </div>

                    <div className="px-0.5">
                      <h3 className="text-[11px] sm:text-xs font-bold text-[#111827] leading-tight mt-1.5 line-clamp-1">
                        {card.title}
                      </h3>

                      <div className="flex items-center gap-1 text-[10px] text-slate-700 font-medium mt-0.5">
                        <span className="flex items-center gap-0.5 font-bold">
                          ★ {card.rating}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[11px] sm:text-xs font-bold text-[#111827]">{card.price}</span>
                        {card.originalPrice && (
                          <span className="text-[9px] text-slate-400 line-through font-normal">
                            {card.originalPrice}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className={`absolute right-1 sm:-right-2 top-[48%] -translate-y-1/2 z-20 flex md:hidden transition-opacity duration-200 ${scrollState['carousel-cleaning']?.canRight ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <button
                  onClick={() => scrollCarousel('carousel-cleaning', 220)}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/95 backdrop-blur-xs border border-slate-200/90 shadow-md flex items-center justify-center text-slate-800 hover:bg-slate-50 active:scale-95 transition-all focus:outline-none"
                  aria-label="Scroll right"
                >
                  <FiArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-900" />
                </button>
              </div>
            </div>
          </section>

          {/* SECTION: "Appliance repair & service" (Desktop / Tablet Only) */}
          <section className="hidden md:block space-y-2 relative">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#111827] tracking-tight">
                Appliance repair & service
              </h2>
              <button className="px-2.5 py-1 rounded-md border border-slate-200 text-[10px] sm:text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                See all
              </button>
            </div>

            <div className="relative group/carousel">
              <div className={`absolute left-1 sm:-left-2 top-[48%] -translate-y-1/2 z-20 flex md:hidden transition-opacity duration-200 ${scrollState['carousel-appliance']?.canLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <button
                  onClick={() => scrollCarousel('carousel-appliance', -220)}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/95 backdrop-blur-xs border border-slate-200/90 shadow-md flex items-center justify-center text-slate-800 hover:bg-slate-50 active:scale-95 transition-all focus:outline-none"
                  aria-label="Scroll left"
                >
                  <FiArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-900" />
                </button>
              </div>

              <div
                id="carousel-appliance"
                onScroll={() => handleCarouselScroll('carousel-appliance')}
                className="flex md:grid md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] py-1 px-1"
              >
                {applianceRepairServices.map((card) => (
                  <div
                    key={card.id}
                    className="group cursor-pointer flex flex-col w-[135px] sm:w-[155px] md:w-auto shrink-0 snap-start"
                  >
                    <div className="w-full aspect-[4/3] relative overflow-hidden rounded-2xl bg-slate-100 border border-slate-200/80 shadow-2xs">
                      <img
                        src={card.image}
                        alt={card.title}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                      />
                    </div>

                    <div className="px-0.5">
                      <h3 className="text-[11px] sm:text-xs font-bold text-[#111827] leading-tight mt-1.5 line-clamp-1">
                        {card.title}
                      </h3>

                      <div className="flex items-center gap-1 text-[10px] text-slate-700 font-medium mt-0.5">
                        <span className="flex items-center gap-0.5 font-bold">
                          ★ {card.rating}
                        </span>
                        {card.isInstant && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="text-[#00875A] font-bold">
                              ⚡ Instant
                            </span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[11px] sm:text-xs font-bold text-[#111827]">{card.price}</span>
                        {card.originalPrice && (
                          <span className="text-[9px] text-slate-400 line-through font-normal">
                            {card.originalPrice}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className={`absolute right-1 sm:-right-2 top-[48%] -translate-y-1/2 z-20 flex md:hidden transition-opacity duration-200 ${scrollState['carousel-appliance']?.canRight ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <button
                  onClick={() => scrollCarousel('carousel-appliance', 220)}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/95 backdrop-blur-xs border border-slate-200/90 shadow-md flex items-center justify-center text-slate-800 hover:bg-slate-50 active:scale-95 transition-all focus:outline-none"
                  aria-label="Scroll right"
                >
                  <FiArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-900" />
                </button>
              </div>
            </div>
          </section>

          {/* SECTION: "Home repair & installation" (Desktop / Tablet Only) */}
          <section className="hidden md:block space-y-2 relative">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#111827] tracking-tight">
                Home repair & installation
              </h2>
              <button className="px-2.5 py-1 rounded-md border border-slate-200 text-[10px] sm:text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                See all
              </button>
            </div>

            <div className="relative group/carousel">
              <div className={`absolute left-1 sm:-left-2 top-[48%] -translate-y-1/2 z-20 flex md:hidden transition-opacity duration-200 ${scrollState['carousel-home-repair']?.canLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <button
                  onClick={() => scrollCarousel('carousel-home-repair', -220)}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/95 backdrop-blur-xs border border-slate-200/90 shadow-md flex items-center justify-center text-slate-800 hover:bg-slate-50 active:scale-95 transition-all focus:outline-none"
                  aria-label="Scroll left"
                >
                  <FiArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-900" />
                </button>
              </div>

              <div
                id="carousel-home-repair"
                onScroll={() => handleCarouselScroll('carousel-home-repair')}
                className="flex md:grid md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] py-1 px-1"
              >
                {homeRepairServices.map((card) => (
                  <div
                    key={card.id}
                    className="group cursor-pointer flex flex-col w-[135px] sm:w-[155px] md:w-auto shrink-0 snap-start"
                  >
                    <div className="w-full aspect-[4/3] relative overflow-hidden rounded-2xl bg-slate-100 border border-slate-200/80 shadow-2xs">
                      <img
                        src={card.image}
                        alt={card.title}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                      />
                    </div>

                    <div className="px-0.5">
                      <h3 className="text-[11px] sm:text-xs font-bold text-[#111827] leading-tight mt-1.5 line-clamp-1">
                        {card.title}
                      </h3>

                      <div className="flex items-center gap-1 text-[10px] text-slate-700 font-medium mt-0.5">
                        <span className="flex items-center gap-0.5 font-bold">
                          ★ {card.rating}
                        </span>
                        {card.isInstant && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="text-[#00875A] font-bold">
                              ⚡ Instant
                            </span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[11px] sm:text-xs font-bold text-[#111827]">{card.price}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className={`absolute right-1 sm:-right-2 top-[48%] -translate-y-1/2 z-20 flex md:hidden transition-opacity duration-200 ${scrollState['carousel-home-repair']?.canRight ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <button
                  onClick={() => scrollCarousel('carousel-home-repair', 220)}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/95 backdrop-blur-xs border border-slate-200/90 shadow-md flex items-center justify-center text-slate-800 hover:bg-slate-50 active:scale-95 transition-all focus:outline-none"
                  aria-label="Scroll right"
                >
                  <FiArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-900" />
                </button>
              </div>
            </div>
          </section>

          {/* STATUS BAND (Desktop / Tablet Only) */}
          <section className="hidden md:flex bg-slate-900 text-white rounded-lg py-2.5 px-3.5 flex-col sm:flex-row items-center justify-between gap-1.5 shadow-2xs">
            <div className="flex items-center gap-2 text-[11px] sm:text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
              <span className="font-bold">All Zippto Networks Operational</span>
              <span className="hidden sm:inline text-slate-400">•</span>
              <span className="hidden sm:inline text-slate-300">Avg technician ETA: 18 mins</span>
            </div>
            <Link to="/user/help-support" className="text-[10px] sm:text-[11px] text-slate-300 hover:text-white font-semibold flex items-center gap-1">
              24/7 Support <FiArrowRight className="w-3 h-3" />
            </Link>
          </section>

          {/* FOOTER CTA BAND (Desktop / Tablet Only) */}
          <footer className="hidden md:block bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-slate-100 text-slate-900 flex items-center justify-center font-bold shrink-0">
                  <FiSmartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Get Zippto Mobile App Link</h3>
                  <p className="text-[10px] text-slate-500">Live GPS technician tracking and order updates</p>
                </div>
              </div>

              <form onSubmit={handleSubscribe} className="w-full md:w-auto flex items-center gap-2">
                <input
                  type="text"
                  value={newsletterInput}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter 10-digit mobile number"
                  className="w-full md:w-56 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-[11px] text-slate-900 focus:bg-white focus:border-slate-900 outline-none"
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="shrink-0 px-3 py-1.5 rounded-md bg-slate-900 text-white hover:bg-slate-800 text-[11px] font-semibold transition-colors"
                >
                  {isSubmitting ? 'Sending...' : 'Send Link'}
                </button>
              </form>
            </div>
          </footer>

        </main>
      )}

      {/* -------------------------------------------------------------
          MODAL SHEET WHEN TAPPING A CATEGORY (Bottom-Up Sheet Modal)
         ------------------------------------------------------------- */}
      {activeCategoryModal && (
        <>
          {/* Backdrop (Blocks background touch scroll) */}
          <div
            className="fixed inset-0 z-[9998] bg-slate-900/60 backdrop-blur-xs transition-opacity animate-fadeIn touch-none"
            onClick={() => setActiveCategoryModal(null)}
            onTouchMove={(e) => e.preventDefault()}
          />

          {/* Bottom Sheet Container (Full Edge-to-Edge Sheet Overlay) */}
          <div className="fixed bottom-0 left-0 right-0 z-[9999] w-full bg-white rounded-t-[32px] max-h-[85vh] overflow-y-auto overscroll-y-contain shadow-2xl border-t border-slate-100 animate-slideUp">
            {/* Top Handle Pill */}
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-1"></div>

            {/* Sticky Header Bar */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md z-10 px-5 pt-2 pb-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  {activeCategoryModal.title}
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {activeCategoryModal.count}
                </p>
              </div>

              <button
                onClick={() => setActiveCategoryModal(null)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
                aria-label="Close modal"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            {/* Subcategories Grid (Circular Image Cards Matching Image 2) */}
            <div className="px-5 py-6">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-y-7 gap-x-4">
                {activeCategoryModal.subCategories.map((sub) => (
                  <div
                    key={sub.id}
                    onClick={async () => {
                      try {
                        const categorySlug = activeCategoryModal.id || activeCategoryModal.slug || 'electrician';
                        setActiveCategoryModal(null);
                        
                        // Fetch live brands & services for this category from backend API
                        const brandRes = await publicCatalogService.getBrands({ categorySlug });
                        
                        if (brandRes.success && Array.isArray(brandRes.brands) && brandRes.brands.length > 0) {
                          // Find matching brand or use first brand
                          const matchBrand = brandRes.brands.find(b => b.slug === sub.id || b.title.toLowerCase().includes(sub.name.toLowerCase())) || brandRes.brands[0];
                          
                          // Fetch full brand services
                          const fullBrandRes = await publicCatalogService.getBrandBySlug(matchBrand.slug);
                          if (fullBrandRes.success && fullBrandRes.brand) {
                            const brandData = fullBrandRes.brand;
                            const sections = brandData.sections || [];
                            
                            const dynamicSubGrid = brandRes.brands.map(b => ({
                              id: b.slug,
                              name: b.title,
                              image: toAssetUrl(b.icon || b.imageUrl || sub.image || '/cat_electrician_plumber.png')
                            }));
                            
                            const dynamicSections = sections.length > 0 ? sections.map(sec => ({
                              sectionTitle: sec.title,
                              items: (sec.cards || []).map(card => ({
                                id: card.id,
                                title: card.title,
                                rating: card.rating || '4.8',
                                reviews: card.reviews || '100+ reviews',
                                price: card.price ? `₹${card.price}` : (card.basePrice ? `₹${card.basePrice}` : '₹99'),
                                desc: card.subtitle || card.features?.join(' • ') || 'Professional home service package.',
                                image: toAssetUrl(card.imageUrl || matchBrand.icon || '/cat_electrician_plumber.png')
                              }))
                            })) : [{
                              sectionTitle: sub.name,
                              items: [{
                                id: matchBrand.id,
                                title: matchBrand.title,
                                rating: '4.8',
                                reviews: '150+ reviews',
                                price: matchBrand.price ? `₹${matchBrand.price}` : '₹99',
                                desc: 'Professional certified doorstep service package.',
                                image: toAssetUrl(matchBrand.icon || '/cat_electrician_plumber.png')
                              }]
                            }];

                            setActiveDetailView({
                              title: activeCategoryModal.title,
                              rating: '4.8',
                              reviews: '1.2k+ reviews',
                              desc: `Book certified, professional ${activeCategoryModal.title} experts at transparent doorstep prices.`,
                              subGrid: dynamicSubGrid,
                              detailedSections: dynamicSections
                            });
                            return;
                          }
                        }
                      } catch (err) {
                        console.error('Error fetching live brand services:', err);
                      }

                      // Fallback to default detail structure if network error
                      setActiveDetailView(electricianDetailData);
                    }}
                    className="flex flex-col items-center cursor-pointer group active:scale-95 transition-transform"
                  >
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-50 flex items-center justify-center shadow-sm overflow-hidden border border-slate-100 text-3xl group-hover:shadow-md group-hover:scale-105 transition-all">
                      {sub.image ? (
                        <img
                          src={sub.image}
                          alt={sub.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        sub.icon
                      )}
                    </div>
                    <span className="text-xs font-semibold text-slate-800 text-center mt-2.5 leading-tight line-clamp-2 px-1">
                      {sub.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default UserDashboard;
