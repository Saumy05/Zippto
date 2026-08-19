import React, { useState, useMemo, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
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
import { LanguageToggle } from '../../../../components/common/LanguageSelectorModal';
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
    title: 'Electrician Services',
    rating: 4.8,
    reviews: '12K+',
    icon: '⚡',
    gradient: 'from-amber-500 to-yellow-600',
    sections: [
      {
        sectionTitle: 'Popular Fixes & Repairs',
        items: [
          { id: 'elec-1', title: 'Switch / Socket Replacement', price: '₹99', rating: 4.8, reviews: '3.4K', desc: 'Replacement or new switch/socket installation with surge testing.', image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=300&auto=format&fit=crop&q=80' },
          { id: 'elec-2', title: 'Ceiling Fan Installation / Repair', price: '₹149', rating: 4.9, reviews: '5.1K', desc: 'Blade balancing, regulator repair, and noise isolation setup.', image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300&auto=format&fit=crop&q=80' },
          { id: 'elec-3', title: 'MCB / Fuse Box Troubleshooting', price: '₹199', rating: 4.7, reviews: '2.2K', desc: 'Short circuit tracing, main breaker diagnostics, load balancing.', image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=300&auto=format&fit=crop&q=80' },
          { id: 'elec-4', title: 'Full House Wiring Inspection', price: '₹349', rating: 4.9, reviews: '1.8K', desc: 'Earthing health check, voltage leak audit, power point mapping.', image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=300&auto=format&fit=crop&q=80' }
        ]
      }
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
  const navigate = useNavigate();
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

  // Fetch live categories & brands dynamically from MongoDB API
  useEffect(() => {
    const fetchLiveCategories = async () => {
      try {
        const catRes = await publicCatalogService.getCategories();
        if (catRes.success && Array.isArray(catRes.categories) && catRes.categories.length > 0) {
          // Fetch all active brands in parallel to dynamically build subcategories for every category
          const brandRes = await publicCatalogService.getBrands().catch(() => ({ brands: [] }));
          const allBrands = brandRes.brands || [];

          const liveCats = catRes.categories
            .filter(c => !c.title.toLowerCase().includes('test'))
            .map(c => {
              const config = DEFAULT_CATEGORY_CONFIG[c.slug] || DEFAULT_CATEGORY_CONFIG[c.id] || {};
              const iconPath = c.icon || c.homeIconUrl || config.icon || '/cat_images/electrician.jpg';

              // Match brands belonging to this category from MongoDB
              const matchingBrands = allBrands.filter(b =>
                (Array.isArray(b.categoryIds) && (b.categoryIds.includes(c.id) || b.categoryIds.includes(c._id))) ||
                b.categoryId === c.id ||
                b.categoryId === c._id ||
                (b.categorySlug && b.categorySlug === c.slug)
              );

              let subCats = [];
              if (matchingBrands.length > 0) {
                subCats = matchingBrands.map(b => ({
                  id: b.slug || b.id,
                  name: b.title,
                  image: toAssetUrl(b.icon || b.imageUrl || b.logo)
                }));
              } else if (config.subCategories && config.subCategories.length > 0) {
                subCats = config.subCategories;
              } else {
                subCats = [
                  { id: `${c.slug || 'cat'}-consult`, name: `Book ${c.title} Consultation`, icon: '📋' },
                  { id: `${c.slug || 'cat'}-standard`, name: `Standard ${c.title} Service`, icon: '⭐' }
                ];
              }

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

  // Complete Dynamic Services Registry for All Platform Categories
  const CATEGORY_CATALOG_REGISTRY = {
    electrician: {
      bannerTitle: 'ELECTRICAL SERVICES',
      title: 'Electrician',
      rating: '4.8',
      reviews: '12k+ reviews',
      desc: 'Certified electrical technicians for fault diagnosis, wiring, lighting, fans, MCBs, and home appliance power solutions.',
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
          id: 'consultation',
          sectionTitle: 'Book a consultation',
          items: [
            { id: 'book-consultant', title: 'Book electrical consultant', rating: '4.8', reviews: '120 reviews', price: '₹0', desc: 'Expert inspection, troubleshooting, safety advice, and exact cost estimation.', image: '/cat_electrician_plumber.png' }
          ]
        },
        {
          id: 'inverter',
          sectionTitle: 'Inverter And Stabiliser',
          items: [
            { id: 'inverter-install', title: 'Inverter installation', rating: '4.8', reviews: '120 reviews', price: '₹249', desc: 'Professional single inverter battery installation, replacement, and power connection.', image: '/native_water_purifier.png' },
            { id: 'inverter-stabilizer', title: 'Inverter & stabilizer repair', rating: '4.8', reviews: '120 reviews', price: '₹199', desc: 'Diagnosis and component repair for heavy-load voltage stabilizers.', image: '/native_water_purifier.png' }
          ]
        },
        {
          id: 'appliances',
          sectionTitle: 'Appliances',
          items: [
            { id: 'home-theatre-install', title: 'Home theatre installation', rating: '4.8', reviews: '120 reviews', price: '₹399', desc: 'Surround sound setup, subwoofer tuning, and clean audio routing.', image: '/ac_foam_jet_service.png' },
            { id: 'tv-wall-mounting', title: 'TV Wall Mounting & Setup', rating: '4.9', reviews: '280 reviews', price: '₹299', desc: 'Laser-level TV wall mount fitting with concealed cable casing.', image: '/ac_repair_wall.png' }
          ]
        },
        {
          id: 'mcb',
          sectionTitle: 'MCB / Fuse Box',
          items: [
            { id: 'mcb-replacement', title: 'MCB Switch Replacement', rating: '4.8', reviews: '95 reviews', price: '₹149', desc: 'Replacement of single/double pole miniature circuit breaker with surge test.', image: '/switchboard_repair.png' },
            { id: 'fuse-troubleshoot', title: 'Main Fuse Troubleshooting', rating: '4.7', reviews: '110 reviews', price: '₹199', desc: 'Diagnosis of sudden trips, short circuits, and phase load balancing.', image: '/switchboard_repair.png' }
          ]
        },
        {
          id: 'doorbell',
          sectionTitle: 'Doorbell & Security',
          items: [
            { id: 'doorbell-install', title: 'Smart / Standard Doorbell Installation', rating: '4.8', reviews: '75 reviews', price: '₹129', desc: 'Fitting electric or smart video doorbells with transformer & chime setup.', image: '/drill_wall_decor.png' }
          ]
        },
        {
          id: 'wiring',
          sectionTitle: 'Wiring & Cable Management',
          items: [
            { id: 'internal-wiring', title: 'Internal Concealed Wiring (Per Point)', rating: '4.9', reviews: '310 reviews', price: '₹199', desc: 'Flame-retardant wiring installation with PVC casing and pipe conduit.', image: '/switchboard_repair.png' }
          ]
        },
        {
          id: 'light',
          sectionTitle: 'Light & Fixture Installation',
          items: [
            { id: 'fancy-light-install', title: 'Decorative / Chandelier Light Fitting', rating: '4.8', reviews: '140 reviews', price: '₹199', desc: 'Ceiling anchor fixing for fancy pendant lights, chandeliers, and LED battens.', image: '/ac_repair_wall.png' }
          ]
        },
        {
          id: 'fan',
          sectionTitle: 'Fan Installation & Repair',
          items: [
            { id: 'ceiling-fan-install', title: 'Ceiling Fan Installation & Balancing', rating: '4.9', reviews: '420 reviews', price: '₹149', desc: 'Downrod assembly, blade balancing, regulator wiring, and wobble elimination.', image: '/ac_repair_wall.png' }
          ]
        },
        {
          id: 'switch-socket',
          sectionTitle: 'Switch & Socket Replacement',
          items: [
            { id: 'switch-socket-replace-item', title: 'Modular Switch & 16A Socket Replacement', rating: '4.8', reviews: '560 reviews', price: '₹79', desc: 'Replacement of burnt or broken switches, plugs, and heavy appliance sockets.', image: '/switchboard_repair.png' }
          ]
        }
      ]
    },
    plumber: {
      bannerTitle: 'PLUMBING & SANITARY SERVICES',
      title: 'Plumber',
      rating: '4.7',
      reviews: '9.8k+ reviews',
      desc: 'Expert plumbing specialists for tap leakage, high pressure drainage unclogging, pipe fittings, and complete bathroom sanitary repairs at transparent prices.',
      subGrid: [
        { id: 'tap-mixer', name: 'Tap & Mixer Repair', image: '/tap_plumbing_repair.png' },
        { id: 'drainage', name: 'Drainage & Blockage', image: '/intense_bathroom_cleaning.png' },
        { id: 'flush-toilet', name: 'Flush Tank & Toilet', image: '/intense_bathroom_cleaning.png' },
        { id: 'pipe-fitting', name: 'Pipe & Tank Fitting', image: '/tap_plumbing_repair.png' },
        { id: 'basin-sink', name: 'Basin & Kitchen Sink', image: '/tap_plumbing_repair.png' },
        { id: 'water-pump', name: 'Water Pump & Motor', image: '/native_water_purifier.png' }
      ],
      detailedSections: [
        {
          id: 'tap-mixer',
          sectionTitle: 'Tap & Mixer Leakage Repair',
          items: [
            { id: 'plumb-tap-replace', title: 'Tap & Spout Replacement', price: '₹79', rating: '4.8', reviews: '1.4k', desc: 'Fix leaking or broken bib taps, pillar cocks, and spout filters.', image: '/tap_plumbing_repair.png' },
            { id: 'plumb-mixer-cartridge', title: 'Wall Mixer Cartridge Repair', price: '₹149', rating: '4.9', reviews: '920', desc: 'Repair low water pressure and internal ceramic disc cartridges.', image: '/tap_plumbing_repair.png' },
            { id: 'plumb-angle-valve', title: 'Angle Valve & Jet Spray Fit', price: '₹99', rating: '4.7', reviews: '640', desc: 'Installation of high-pressure bidet jet sprays and angle stop valves.', image: '/tap_plumbing_repair.png' }
          ]
        },
        {
          id: 'drainage',
          sectionTitle: 'Blockage & Drainage Clearing',
          items: [
            { id: 'plumb-sink-unclog', title: 'Kitchen Sink Drain Unclogging', price: '₹199', rating: '4.8', reviews: '2.1k', desc: 'Clearing food sludge, grease buildup, and bottle trap sanitization.', image: '/intense_bathroom_cleaning.png' },
            { id: 'plumb-bath-drain', title: 'Bathroom Floor Trap Clearing', price: '₹249', rating: '4.7', reviews: '1.8k', desc: 'Removal of hair clogs, soap residue, and gully trap unclogging.', image: '/intense_bathroom_cleaning.png' },
            { id: 'plumb-jet-clear', title: 'High-Pressure Pipe Jet Clean', price: '₹499', rating: '4.9', reviews: '760', desc: 'Motorized mechanical snake rodding for heavy main line blocks.', image: '/intense_bathroom_cleaning.png' }
          ]
        },
        {
          id: 'flush-toilet',
          sectionTitle: 'Flush Tank & Toilet Repair',
          items: [
            { id: 'plumb-flush-syphon', title: 'Flush Tank Syphon & Float Valve', price: '₹179', rating: '4.8', reviews: '1.1k', desc: 'Fix continuous water running, faulty push button, and overflow float valve.', image: '/intense_bathroom_cleaning.png' },
            { id: 'plumb-commode-leak', title: 'Western Commode Sealing & Repair', price: '₹249', rating: '4.7', reviews: '830', desc: 'Gasket replacement, wax ring sealing, and floor joint leak prevention.', image: '/intense_bathroom_cleaning.png' }
          ]
        },
        {
          id: 'pipe-fitting',
          sectionTitle: 'Pipe & Tank Fitting',
          items: [
            { id: 'plumb-concealed-pipe', title: 'Concealed Pipeline Leakage Repair', price: '₹299', rating: '4.9', reviews: '950', desc: 'Acoustic detection and CPVC/UPVC pipe joint patching with pressure test.', image: '/tap_plumbing_repair.png' },
            { id: 'plumb-tank-valve', title: 'Overhead Tank Ball Valve Install', price: '₹199', rating: '4.8', reviews: '420', desc: 'Automatic brass ball valve fitting to prevent overhead water overflow.', image: '/native_water_purifier.png' }
          ]
        },
        {
          id: 'basin-sink',
          sectionTitle: 'Basin & Kitchen Sink',
          items: [
            { id: 'plumb-basin-install', title: 'Wash Basin Installation & Coupling', price: '₹249', rating: '4.8', reviews: '530', desc: 'Laser level mounting of wash basins with waste coupling & trap.', image: '/tap_plumbing_repair.png' }
          ]
        },
        {
          id: 'water-pump',
          sectionTitle: 'Water Pump & Motor',
          items: [
            { id: 'plumb-motor-connect', title: 'Water Motor Pump Connection & Wiring', price: '₹349', rating: '4.8', reviews: '310', desc: 'Inlet/outlet plumbing union joints and capacitor check for booster pumps.', image: '/native_water_purifier.png' }
          ]
        }
      ]
    },
    carpenter: {
      bannerTitle: 'CARPENTRY & WOODWORK SERVICES',
      title: 'Carpenter',
      rating: '4.8',
      reviews: '8.4k+ reviews',
      desc: 'Expert woodworking, flat-pack furniture assembly, door locks, hinges, and custom wall mounting with laser precision.',
      subGrid: [
        { id: 'door-lock', name: 'Door Lock & Handles', image: '/drill_wall_decor.png' },
        { id: 'furniture-assemble', name: 'Furniture Assembly', image: '/drill_wall_decor.png' },
        { id: 'sofa-repair', name: 'Sofa & Chair Repair', image: '/drill_wall_decor.png' },
        { id: 'wardrobe-hinge', name: 'Cupboard & Hinge Fix', image: '/switchboard_repair.png' },
        { id: 'custom-drilling', name: 'Wall Hanging & Drill', image: '/drill_wall_decor.png' }
      ],
      detailedSections: [
        {
          id: 'door-lock',
          sectionTitle: 'Door Lock & Handles',
          items: [
            { id: 'carp-mortise-lock', title: 'Mortise Main Door Lock Fitting', price: '₹199', rating: '4.9', reviews: '1.2k', desc: 'Precision mortise chiseled installation for security locks & smart latches.', image: '/drill_wall_decor.png' },
            { id: 'carp-cylinder-replace', title: 'Lock Cylinder Replacement', price: '₹149', rating: '4.8', reviews: '840', desc: 'Replacement of brass key cylinder with 3 duplicate keys testing.', image: '/drill_wall_decor.png' }
          ]
        },
        {
          id: 'furniture-assemble',
          sectionTitle: 'Furniture Assembly',
          items: [
            { id: 'carp-bed-assembly', title: 'Bed Assembly (Single/Double/Hydraulic)', price: '₹349', rating: '4.8', reviews: '950', desc: 'Flat-pack bed frame assembly with headboard and hydraulic lift fitting.', image: '/drill_wall_decor.png' },
            { id: 'carp-table-chair', title: 'Study Table & Dining Table Assembly', price: '₹249', rating: '4.7', reviews: '720', desc: 'Leg bolt alignment, structural wobble removal, and surface leveling.', image: '/drill_wall_decor.png' }
          ]
        },
        {
          id: 'wardrobe-hinge',
          sectionTitle: 'Cupboard & Hinge Fix',
          items: [
            { id: 'carp-soft-hinge', title: 'Soft-Close Cabinet Hinge Fitting', price: '₹129', rating: '4.8', reviews: '610', desc: 'Replacement of rusted or loose cabinet auto-hinges and magnetic catches.', image: '/switchboard_repair.png' },
            { id: 'carp-drawer-channel', title: 'Drawer Telescopic Channel Repair', price: '₹179', rating: '4.7', reviews: '490', desc: 'Smooth ball-bearing channel realigning for kitchen & wardrobe drawers.', image: '/switchboard_repair.png' }
          ]
        },
        {
          id: 'custom-drilling',
          sectionTitle: 'Wall Hanging & Drill',
          items: [
            { id: 'carp-curtain-rod', title: 'Curtain Rod Installation (Per Rod)', price: '₹99', rating: '4.9', reviews: '1.5k', desc: 'Heavy masonry anchor drill fitting with spirit level alignment.', image: '/drill_wall_decor.png' },
            { id: 'carp-heavy-mirror', title: 'Large Mirror & Artwork Mounting', price: '₹149', rating: '4.8', reviews: '820', desc: 'Secure load-rated bracket wall drilling for vanity mirrors and framed art.', image: '/drill_wall_decor.png' }
          ]
        }
      ]
    },
    'salon-for-women': {
      bannerTitle: 'SALON & SPA FOR WOMEN',
      title: 'Salon for Women',
      rating: '4.9',
      reviews: '15k+ reviews',
      desc: 'Certified female beauticians delivering hygienic doorstep waxing, glowing facials, manicures, pedicures, and hair rituals with single-use kits.',
      subGrid: [
        { id: 'waxing', name: 'Waxing & Threading', image: '/cat_images/salon_women.jpg' },
        { id: 'facial', name: 'Facials & Cleanups', image: '/cat_images/salon_women.jpg' },
        { id: 'korean-glow', name: 'Korean Glass Glow', image: '/cat_images/salon_women.jpg' },
        { id: 'mani-pedi', name: 'Manicure & Pedicure', image: '/cat_images/salon_women.jpg' },
        { id: 'hair-spa', name: 'Hair Care & Spa', image: '/cat_images/salon_women.jpg' }
      ],
      detailedSections: [
        {
          id: 'waxing',
          sectionTitle: 'Waxing & Threading',
          items: [
            { id: 'salon-wax-combo', title: 'Rica Full Arms + Full Legs Waxing', price: '₹499', rating: '4.9', reviews: '3.2k', desc: 'Painless roll-on Rica waxing with pre-wax gel & post-wax oil treatment.', image: '/cat_images/salon_women.jpg' },
            { id: 'salon-threading', title: 'Eyebrow + Upper Lip Threading', price: '₹79', rating: '4.8', reviews: '4.5k', desc: 'Precision shaping with sanitized organic antibacterial thread.', image: '/cat_images/salon_women.jpg' }
          ]
        },
        {
          id: 'facial',
          sectionTitle: 'Facials & Cleanups',
          items: [
            { id: 'salon-o3-facial', title: 'O3+ Bridal Radiance & Glow Facial', price: '₹1,199', rating: '4.9', reviews: '2.1k', desc: '6-Step brightening treatment with peel-off algae mask and serum infusion.', image: '/cat_images/salon_women.jpg' },
            { id: 'salon-fruit-cleanup', title: 'Herbal Fruit Cleanup', price: '₹399', rating: '4.8', reviews: '1.7k', desc: 'Deep pore cleansing, fruit enzyme scrub, blackhead extraction, and pack.', image: '/cat_images/salon_women.jpg' }
          ]
        },
        {
          id: 'korean-glow',
          sectionTitle: 'Korean Glass Glow',
          items: [
            { id: 'salon-hydra-glow', title: 'Korean Hydra Glass Skin Facial', price: '₹1,499', rating: '4.9', reviews: '1.3k', desc: 'Deep ultrasonic exfoliation, hyaluronic hydration infusion, and LED phototherapy.', image: '/cat_images/salon_women.jpg' }
          ]
        },
        {
          id: 'mani-pedi',
          sectionTitle: 'Manicure & Pedicure',
          items: [
            { id: 'salon-rose-pedi', title: 'Rose Petal Spa Pedicure + Manicure', price: '₹699', rating: '4.8', reviews: '1.9k', desc: 'Dead skin buffing, cuticle care, relaxing massage, and nail polish.', image: '/cat_images/salon_women.jpg' }
          ]
        }
      ]
    },
    'ac-appliance-repair': {
      bannerTitle: 'AC & APPLIANCE REPAIR SERVICES',
      title: 'AC & Appliance Repair',
      rating: '4.8',
      reviews: '18k+ reviews',
      desc: 'Certified appliance engineers for AC foam-jet servicing, gas charging, washing machines, refrigerators, and water heaters.',
      subGrid: [
        { id: 'ac-foam-jet', name: 'AC Service & Repair', image: '/ac_foam_jet_service.png' },
        { id: 'refrigerator', name: 'Refrigerator Repair', image: '/ac_repair_wall.png' },
        { id: 'washing-machine', name: 'Washing Machine', image: '/intense_bathroom_cleaning.png' },
        { id: 'geyser', name: 'Geyser & Water Heater', image: '/geyser_checkup.png' },
        { id: 'ro-purifier', name: 'RO Water Purifier', image: '/native_water_purifier.png' }
      ],
      detailedSections: [
        {
          id: 'ac-foam-jet',
          sectionTitle: 'AC Service & Repair',
          items: [
            { id: 'app-foam-jet-1', title: 'Power-Jet Foam AC Deep Service', price: '₹599', rating: '4.8', reviews: '6.5k', desc: '2x deeper coil cleaning with pressurized foam jet gun, drain tray wash & anti-fungal spray.', image: '/ac_foam_jet_service.png' },
            { id: 'app-ac-gas', title: 'AC Gas Charging & Leak Check', price: '₹1,499', rating: '4.7', reviews: '2.1k', desc: 'Nitrogen pressure testing, brazing leak repair, and 100% refrigerant top-up.', image: '/ac_repair_wall.png' }
          ]
        },
        {
          id: 'refrigerator',
          sectionTitle: 'Refrigerator Repair',
          items: [
            { id: 'app-fridge-diag', title: 'Refrigerator Cooling Diagnosis', price: '₹199', rating: '4.8', reviews: '1.4k', desc: 'Compressor check, thermostat relay diagnostic, and cooling gas level test.', image: '/ac_repair_wall.png' }
          ]
        },
        {
          id: 'washing-machine',
          sectionTitle: 'Washing Machine',
          items: [
            { id: 'app-wm-service', title: 'Automatic Washing Machine Service', price: '₹249', rating: '4.8', reviews: '1.6k', desc: 'Drum descaling, drain motor valve clearance, and spin noise balance.', image: '/intense_bathroom_cleaning.png' }
          ]
        },
        {
          id: 'geyser',
          sectionTitle: 'Geyser & Water Heater',
          items: [
            { id: 'app-geyser-check', title: 'Geyser Check-up & Element Descale', price: '₹249', rating: '4.8', reviews: '980', desc: 'Heating coil descaling, thermostat temperature test, and safety valve check.', image: '/geyser_checkup.png' }
          ]
        }
      ]
    },
    'cleaning-service': {
      bannerTitle: 'CLEANING & HYGIENE SERVICES',
      title: 'Cleaning Service',
      rating: '4.8',
      reviews: '11k+ reviews',
      desc: 'Professional mechanized deep cleaning for bathrooms, kitchens, sofas, and full apartments with eco-friendly sanitizers.',
      subGrid: [
        { id: 'full-home', name: 'Full Home Deep Clean', image: '/intense_bathroom_cleaning.png' },
        { id: 'bathroom', name: 'Bathroom Cleaning', image: '/intense_bathroom_cleaning.png' },
        { id: 'kitchen', name: 'Kitchen Degreasing', image: '/intense_bathroom_cleaning.png' },
        { id: 'sofa-carpet', name: 'Sofa & Carpet Wash', image: '/mattress_cleaning.png' }
      ],
      detailedSections: [
        {
          id: 'full-home',
          sectionTitle: 'Full Home Deep Clean',
          items: [
            { id: 'clean-1bhk', title: '1 BHK Complete Home Deep Clean', price: '₹1,899', rating: '4.8', reviews: '1.2k', desc: 'Floor single-disc buffing, bathroom descaling, kitchen degreasing & balcony wash.', image: '/intense_bathroom_cleaning.png' },
            { id: 'clean-2bhk', title: '2 BHK Complete Home Deep Clean', price: '₹2,499', rating: '4.9', reviews: '2.4k', desc: 'Comprehensive deep cleaning for 2 bedrooms, hall, kitchen & 2 bathrooms.', image: '/intense_bathroom_cleaning.png' }
          ]
        },
        {
          id: 'bathroom',
          sectionTitle: 'Bathroom Cleaning',
          items: [
            { id: 'clean-bath-intense', title: 'Intense Bathroom Descaling (2 Bathrooms)', price: '₹699', rating: '4.8', reviews: '3.1k', desc: 'Heavy hard-water stain removal from tiles, taps, mirrors, and WC sanitization.', image: '/intense_bathroom_cleaning.png' }
          ]
        },
        {
          id: 'sofa-carpet',
          sectionTitle: 'Sofa & Carpet Wash',
          items: [
            { id: 'clean-sofa-shampoo', title: '3-Seater Sofa Injection Shampooing', price: '₹599', rating: '4.9', reviews: '1.8k', desc: 'High-power foam extraction wash for fabric sofas with dust mite removal.', image: '/mattress_cleaning.png' }
          ]
        }
      ]
    },
    'pest-control': {
      bannerTitle: 'PEST CONTROL & DISINFECTION',
      title: 'Pest Control',
      rating: '4.8',
      reviews: '7.2k+ reviews',
      desc: 'Odorless, government-approved herbal pest control for cockroaches, termites, bed bugs, and rodents with warranty.',
      subGrid: [
        { id: 'cockroach', name: 'Cockroach & Ant Control', image: '/intense_bathroom_cleaning.png' },
        { id: 'termite', name: 'Termite Treatment', image: '/drill_wall_decor.png' },
        { id: 'bedbug', name: 'Bed Bug Eradication', image: '/mattress_cleaning.png' }
      ],
      detailedSections: [
        {
          id: 'cockroach',
          sectionTitle: 'Cockroach & Ant Control',
          items: [
            { id: 'pest-cockroach-1bhk', title: '1 BHK Herbal Gel Cockroach Treatment', price: '₹699', rating: '4.8', reviews: '1.5k', desc: 'Odorless German gel baiting across cabinets and kitchen corners with 3-month warranty.', image: '/intense_bathroom_cleaning.png' },
            { id: 'pest-cockroach-2bhk', title: '2 BHK Herbal Gel + Drain Spray', price: '₹899', rating: '4.9', reviews: '2.1k', desc: 'Dual-action gel baiting and anti-cockroach drain piping treatment.', image: '/intense_bathroom_cleaning.png' }
          ]
        },
        {
          id: 'termite',
          sectionTitle: 'Termite Treatment',
          items: [
            { id: 'pest-termite-barrier', title: 'Drill-Fill-Seal Termite Barrier (1 Room)', price: '₹1,499', rating: '4.9', reviews: '620', desc: 'Subterranean chemical barrier drill injection with color-matched sealant.', image: '/drill_wall_decor.png' }
          ]
        }
      ]
    },
    'painting-service': {
      bannerTitle: 'PAINTING & WATERPROOFING',
      title: 'Painting Service',
      rating: '4.8',
      reviews: '6.4k+ reviews',
      desc: 'Expert wall painting, moisture leak waterproofing, texture stencils, and dustless mechanized sanding.',
      subGrid: [
        { id: 'interior-paint', name: 'Full Interior Painting', image: '/drill_wall_decor.png' },
        { id: 'waterproofing', name: 'Seepage Waterproofing', image: '/tap_plumbing_repair.png' },
        { id: 'accent-wall', name: 'Accent Wall Textures', image: '/drill_wall_decor.png' }
      ],
      detailedSections: [
        {
          id: 'interior-paint',
          sectionTitle: 'Full Interior Painting',
          items: [
            { id: 'paint-1room', title: '1 Room Fresh Paint (Walls + Ceiling)', price: '₹1,999', rating: '4.8', reviews: '840', desc: '2 Coats premium washable acrylic emulsion with floor masking and putty touchup.', image: '/drill_wall_decor.png' },
            { id: 'paint-2bhk', title: '2 BHK Full Interior Painting Package', price: '₹8,999', rating: '4.9', reviews: '1.1k', desc: 'Complete Asian Paints / Berger premium paint finish with mechanized dustless sanding.', image: '/drill_wall_decor.png' }
          ]
        },
        {
          id: 'waterproofing',
          sectionTitle: 'Seepage Waterproofing',
          items: [
            { id: 'paint-seepage-fix', title: 'Wall Dampness & Efflorescence Sealing', price: '₹999', rating: '4.8', reviews: '530', desc: 'Epoxy injection and silicone barrier primer to permanently stop peeling paint.', image: '/tap_plumbing_repair.png' }
          ]
        }
      ]
    },
    'construction-renovation': {
      bannerTitle: 'CONSTRUCTION & RENOVATION',
      title: 'Construction & Renovation',
      rating: '4.8',
      reviews: '5.1k+ reviews',
      desc: 'Civil repair work, false ceiling installations, tile laying, bathroom remodels, and structural masonry work.',
      subGrid: [
        { id: 'civil-repair', name: 'Civil Repair Work', image: '/switchboard_repair.png' },
        { id: 'false-ceiling', name: 'False Ceiling & Gypsum', image: '/ac_repair_wall.png' },
        { id: 'tile-laying', name: 'Tile & Marble Laying', image: '/drill_wall_decor.png' }
      ],
      detailedSections: [
        {
          id: 'civil-repair',
          sectionTitle: 'Civil Repair Work',
          items: [
            { id: 'const-wall-crack', title: 'Structural Wall Crack Repair & Stitching', price: '₹499', rating: '4.8', reviews: '410', desc: 'Polymer modified mortar patching and structural fiber mesh reinforcement.', image: '/switchboard_repair.png' },
            { id: 'const-core-cut', title: 'Masonry Wall Cut & Plastering', price: '₹799', rating: '4.7', reviews: '290', desc: 'Neat electrical/plumbing chase groove cutting and cement sand plaster finishing.', image: '/switchboard_repair.png' }
          ]
        },
        {
          id: 'tile-laying',
          sectionTitle: 'Tile & Marble Laying',
          items: [
            { id: 'const-tile-replace', title: 'Broken Tile Replacement & Re-Grouting', price: '₹349', rating: '4.8', reviews: '380', desc: 'Chiseling cracked floor/wall tiles, adhesive bed leveling, and epoxy joint sealing.', image: '/drill_wall_decor.png' }
          ]
        }
      ]
    },
    'solar-service': {
      bannerTitle: 'SOLAR ROOFTOP & INVERTER SERVICES',
      title: 'Solar Service',
      rating: '4.9',
      reviews: '4.3k+ reviews',
      desc: 'Specialized solar technicians for inverter wiring repair, de-ionized solar panel washing, and full rooftop solar generation audits.',
      subGrid: [
        { id: 'solar-inverter-wiring-repair', name: 'Solar Inverter & Wiring Repair', image: '/native_water_purifier.png' },
        { id: 'solar-panel-washing', name: 'Solar Panel Washing & Maintenance', image: '/intense_bathroom_cleaning.png' },
        { id: 'rooftop-solar-installation', name: 'Rooftop Solar Installation Checkup', image: '/native_water_purifier.png' }
      ],
      detailedSections: [
        {
          id: 'solar-inverter-wiring-repair',
          sectionTitle: 'Solar Inverter & Wiring Repair',
          items: [
            { id: 'solar-inv-diag', title: 'Solar Inverter Error & Fault Diagnostics', price: '₹299', rating: '4.9', reviews: '520', desc: 'Diagnostic check for MPPT charge controller, grid sync faults, and MC4 connectors.', image: '/native_water_purifier.png' },
            { id: 'solar-string-wire', title: 'DC String Cable & Surge Protector Fix', price: '₹399', rating: '4.8', reviews: '340', desc: 'Rewiring damaged solar DC cables, replacement of SPD fuses and isolator switches.', image: '/native_water_purifier.png' }
          ]
        },
        {
          id: 'solar-panel-washing',
          sectionTitle: 'Solar Panel Washing & Maintenance',
          items: [
            { id: 'solar-wash-10', title: 'De-ionized Pressure Wash (Up to 10 Panels)', price: '₹499', rating: '4.9', reviews: '810', desc: 'Non-abrasive microfiber de-ionized pressure wash removing dust and bird drops to boost output by 15-25%.', image: '/intense_bathroom_cleaning.png' },
            { id: 'solar-wash-20', title: 'Rooftop Solar Deep Clean (11-25 Panels)', price: '₹799', rating: '4.9', reviews: '640', desc: 'Complete frame scrub, glass polish, and anti-static dust repellent coating.', image: '/intense_bathroom_cleaning.png' }
          ]
        },
        {
          id: 'rooftop-solar-installation',
          sectionTitle: 'Rooftop Solar Installation Checkup',
          items: [
            { id: 'solar-audit-full', title: 'Comprehensive Solar Plant Generation Audit', price: '₹699', rating: '4.9', reviews: '430', desc: 'Thermal imaging for hot spots, inverter efficiency test, and structural bolt torque check.', image: '/native_water_purifier.png' }
          ]
        }
      ]
    }
  };

  // Helper to dynamically resolve full service detail template for ANY category (preset or custom created by admin)
  const resolveCategoryDetail = (category, subCategory) => {
    const catSlug = (category.slug || category.id || category.title || '').toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    let key = Object.keys(CATEGORY_CATALOG_REGISTRY).find(k => catSlug.includes(k) || k.includes(catSlug));
    if (!key) {
      if (catSlug.includes('electr')) key = 'electrician';
      else if (catSlug.includes('plumb')) key = 'plumber';
      else if (catSlug.includes('carpent')) key = 'carpenter';
      else if (catSlug.includes('salon') || catSlug.includes('women')) key = 'salon-for-women';
      else if (catSlug.includes('ac') || catSlug.includes('appliance')) key = 'ac-appliance-repair';
      else if (catSlug.includes('clean')) key = 'cleaning-service';
      else if (catSlug.includes('pest')) key = 'pest-control';
      else if (catSlug.includes('paint')) key = 'painting-service';
      else if (catSlug.includes('construct') || catSlug.includes('renovat')) key = 'construction-renovation';
      else if (catSlug.includes('solar')) key = 'solar-service';
    }

    if (key && CATEGORY_CATALOG_REGISTRY[key]) {
      const template = CATEGORY_CATALOG_REGISTRY[key];
      return {
        ...template,
        title: category.title || template.title,
        bannerTitle: `${(category.title || template.title).toUpperCase()} SERVICES`
      };
    }

    // Dynamic Generator for Brand-New Categories Created by Admin in Database
    const subList = Array.isArray(category.subCategories) && category.subCategories.length > 0
      ? category.subCategories
      : [
          { id: `${catSlug}-consultation`, name: `${category.title} Consultation`, icon: '📋' },
          { id: `${catSlug}-standard`, name: `Standard ${category.title} Package`, icon: '⭐' }
        ];

    return {
      title: category.title,
      bannerTitle: `${category.title.toUpperCase()} SERVICES`,
      rating: '4.8',
      reviews: '100+ reviews',
      desc: `Book certified, background-verified ${category.title} professionals with upfront pricing, doorstep inspection, and complete service warranty.`,
      subGrid: subList.map(sc => ({
        id: (sc.id || sc.slug || sc.name).toLowerCase().replace(/[^a-z0-9]/g, '-'),
        name: sc.name || sc.title,
        image: toAssetUrl(sc.image || category.image || '/cat_electrician_plumber.png')
      })),
      detailedSections: subList.map(sc => ({
        id: (sc.id || sc.slug || sc.name).toLowerCase().replace(/[^a-z0-9]/g, '-'),
        sectionTitle: sc.name || sc.title,
        items: [
          {
            id: `${catSlug}-${(sc.id || 'service').toLowerCase().replace(/[^a-z0-9]/g, '-')}-item`,
            title: `${sc.name || sc.title} Doorstep Service`,
            price: '₹199',
            rating: '4.8',
            reviews: '50+ reviews',
            desc: `Complete professional ${sc.name || sc.title} service with certified tools, safety compliance, and labor guarantee.`,
            image: toAssetUrl(sc.image || category.image || '/cat_electrician_plumber.png')
          }
        ]
      }))
    };
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

          {/* RIGHT: Action Icons (Search, Language, Bell Notification 9+, Profile Avatar) */}
          <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-2.5 shrink-0">
            <LanguageToggle />
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
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight uppercase">
                {activeDetailView.bannerTitle || `${activeDetailView.title} SERVICES`}
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
                  const cleanKey = (sg.id || sg.name || '').toLowerCase().replace(/[^a-z0-9]/g, '-');
                  let targetEl = document.getElementById(`section-${cleanKey}`);
                  if (!targetEl) {
                    const cleanName = sg.name.toLowerCase().trim();
                    targetEl = Array.from(document.querySelectorAll('[id^="section-"]')).find(el =>
                      el.id.toLowerCase().includes(cleanKey.slice(0, 4)) ||
                      el.textContent.toLowerCase().includes(cleanName)
                    );
                  }
                  if (targetEl) {
                    targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    targetEl.classList.add('bg-amber-50/70', 'p-2.5', 'rounded-2xl', 'transition-all', 'duration-300');
                    setTimeout(() => {
                      targetEl.classList.remove('bg-amber-50/70', 'p-2.5', 'rounded-2xl');
                    }, 1400);
                  }
                }}
                className="flex flex-col items-center text-center cursor-pointer group active:scale-95 transition-transform"
              >
                <div className="w-full aspect-square rounded-2xl bg-white border border-slate-200/90 shadow-2xs overflow-hidden flex items-center justify-center p-2 group-hover:border-slate-400 group-hover:shadow-md transition-all">
                  <img
                    src={sg.image}
                    alt={sg.name}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/cat_electrician_plumber.png';
                    }}
                    className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform"
                  />
                </div>
                <span className="mt-1.5 text-[10.5px] sm:text-xs font-bold text-slate-800 leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">
                  {sg.name}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-5 pt-2">
            {activeDetailView.detailedSections.map((sec, idx) => {
              const secAnchorId = `section-${(sec.id || sec.sectionTitle || `sec-${idx}`).toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
              return (
                <div key={idx} id={secAnchorId} className="space-y-2.5 scroll-mt-24">
                  <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-1.5 flex items-center justify-between">
                    <span>{sec.sectionTitle}</span>
                    <span className="text-[10px] text-slate-400 font-medium">({sec.items.length} services)</span>
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
                            onClick={() => {
                              if (isAdded) {
                                navigate('/cart');
                              } else {
                                handleToggleAddService(item, sec.sectionTitle);
                              }
                            }}
                            className={`w-16 sm:w-20 py-1 rounded-md font-bold text-[11px] transition-all shadow-2xs flex items-center justify-center gap-1 cursor-pointer ${
                              isAdded
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95'
                                : 'bg-white text-red-600 border border-red-200 hover:bg-red-50 active:scale-95'
                            }`}
                            title={isAdded ? 'Go to Cart' : 'Add to Cart'}
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
              );
            })}
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
                      const currentCategory = activeCategoryModal;
                      const currentSub = sub;
                      setActiveCategoryModal(null);

                      // 1. Resolve fallback detail immediately based on the selected category
                      const fallbackDetail = resolveCategoryDetail(currentCategory, currentSub);

                      try {
                        const categorySlug = currentCategory.slug || currentCategory.id || '';
                        
                        // Fetch live brands & services for this category from backend API
                        const brandRes = await publicCatalogService.getBrands({ categorySlug });
                        
                        if (brandRes.success && Array.isArray(brandRes.brands) && brandRes.brands.length > 0) {
                          // Find matching brand or use first brand
                          const matchBrand = brandRes.brands.find(b => b.slug === currentSub.id || b.title.toLowerCase().includes(currentSub.name.toLowerCase())) || brandRes.brands[0];
                          
                          // Fetch full brand services
                          const fullBrandRes = await publicCatalogService.getBrandBySlug(matchBrand.slug);
                          if (fullBrandRes.success && fullBrandRes.brand && fullBrandRes.brand.sections?.length > 0) {
                            const brandData = fullBrandRes.brand;
                            const sections = brandData.sections || [];
                            
                            const dynamicSubGrid = brandRes.brands.map(b => ({
                              id: b.slug,
                              name: b.title,
                              image: toAssetUrl(b.icon || b.imageUrl || currentSub.image || '/cat_electrician_plumber.png')
                            }));
                            
                            const dynamicSections = sections.map(sec => ({
                              id: (sec.title || '').toLowerCase().replace(/[^a-z0-9]/g, '-'),
                              sectionTitle: sec.title,
                              items: (sec.cards || []).map(card => ({
                                id: card.id || card._id,
                                title: card.title,
                                rating: card.rating || '4.8',
                                reviews: card.reviews || '100+ reviews',
                                price: card.price ? `₹${card.price}` : (card.basePrice ? `₹${card.basePrice}` : '₹99'),
                                desc: card.subtitle || card.features?.join(' • ') || 'Professional certified home service package.',
                                image: toAssetUrl(card.imageUrl || matchBrand.icon || '/cat_electrician_plumber.png')
                              }))
                            }));

                            setActiveDetailView({
                              title: currentCategory.title,
                              bannerTitle: `${currentCategory.title.toUpperCase()} SERVICES`,
                              rating: currentCategory.rating || '4.8',
                              reviews: currentCategory.reviews || '1.2k+ reviews',
                              desc: `Book certified, professional ${currentCategory.title} experts at transparent doorstep prices.`,
                              subGrid: dynamicSubGrid,
                              detailedSections: dynamicSections
                            });
                            return;
                          }
                        }
                      } catch (err) {
                        console.error('Error fetching live brand services:', err);
                      }

                      // Set category-specific detail view
                      setActiveDetailView(fallbackDetail);
                    }}
                    className="flex flex-col items-center cursor-pointer group active:scale-95 transition-transform"
                  >
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-50 flex items-center justify-center shadow-sm overflow-hidden border border-slate-100 text-3xl group-hover:shadow-md group-hover:scale-105 transition-all">
                      {sub.image ? (
                        <img
                          src={sub.image}
                          alt={sub.name}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/cat_electrician_plumber.png';
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <span className="text-3xl">{sub.icon || '⚡'}</span>
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
