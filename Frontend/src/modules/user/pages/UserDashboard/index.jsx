import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Link, NavLink, useLocation, useNavigate, useParams } from 'react-router-dom';
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
  FiCheck,
  FiPackage,
  FiGrid
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useCart } from '../../../../context/CartContext';
import { useCity } from '../../../../context/CityContext';
import { LanguageToggle } from '../../../../components/common/LanguageSelectorModal';
import { publicCatalogService } from '../../../../services/catalogService';
import { useUserNotificationCount } from '../../hooks/useUserNotificationCount';
import CitySelectorModal from '../../components/common/CitySelectorModal';
import OfferBannerSlider from '../../components/common/OfferBannerSlider';

const toAssetUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  if (url.includes('/uploads/')) {
    const uploadPath = url.substring(url.indexOf('/uploads/'));
    const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001').replace(/\/api\/?$/, '');
    return `${base}${uploadPath}`;
  }
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  // Frontend public static assets
  return url;
};

const UserDashboard = () => {
  const navigate = useNavigate();
  const { categorySlug } = useParams();
  const location = useLocation();
  const { cartItems = [], cartCount = 0, addToCart, removeItem } = useCart() || {};
  const { currentCity } = useCity() || {};
  const [homeContent, setHomeContent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [newsletterInput, setNewsletterInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);

  // Fetch dynamic home content (including admin banners and categories) from API
  useEffect(() => {
    const fetchHomeContent = async () => {
      try {
        const cityId = currentCity?._id || currentCity?.id;
        const res = await publicCatalogService.getHomeData(cityId);
        if (res?.success) {
          if (res.homeContent) {
            setHomeContent(res.homeContent);
          }
          if (Array.isArray(res.categories) && res.categories.length > 0) {
            setCategories(res.categories);
          }
        }
      } catch (err) {
        console.error('Failed to load home content in UserDashboard:', err);
      }
    };
    fetchHomeContent();
  }, [currentCity]);

  // Interactive Flow States
  const [activeCategoryModal, setActiveCategoryModal] = useState(null);
  const [activeDetailView, setActiveDetailView] = useState(null);

  // After picking a sub-service in the category sheet, scroll to its section once the view renders
  useEffect(() => {
    const target = location.state?.scrollTo;
    if (!target || !activeDetailView) return;
    const key = String(target).toLowerCase().replace(/[^a-z0-9]/g, '-');
    const timer = setTimeout(() => {
      document.getElementById(`section-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
    return () => clearTimeout(timer);
  }, [activeDetailView, location.state]);

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
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const storedUser = useMemo(() => {
    try {
      const userStr = localStorage.getItem('userData') || localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
      return null;
    }
  }, [token]);

  const isLoggedIn = Boolean(token && storedUser);

  // Real-time dynamic unread notification count for the header bell
  const { unreadCount } = useUserNotificationCount();
  const userName = storedUser?.name || storedUser?.fullName || '';
  // Header location label: GPS-detected address (set by LocationPermissionChecker) -> saved profile city -> prompt
  const readSavedAddress = () => {
    try { return localStorage.getItem('currentAddress') || ''; } catch (e) { return ''; }
  };
  const [detectedAddress, setDetectedAddress] = useState(readSavedAddress);
  useEffect(() => {
    const onDetected = (e) => setDetectedAddress(e.detail?.address || readSavedAddress());
    window.addEventListener('userLocationDetected', onDetected);
    return () => window.removeEventListener('userLocationDetected', onDetected);
  }, []);
  // Header label: stays empty (prompt shown) until the user's current location has actually been fetched.
  // Once it is, lead with the active service city, then the finer-grained area if we know it
  const userCity = (() => {
    if (!detectedAddress) return '';
    const area = detectedAddress.split(',')[0].trim();
    if (currentCity?.name) {
      return area && area.toLowerCase() !== currentCity.name.toLowerCase()
        ? `${currentCity.name} · ${area}`
        : currentCity.name;
    }
    return detectedAddress;
  })();
  const walletBalance = storedUser?.wallet?.balance ?? storedUser?.walletBalance ?? 0;

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

  // Main category items (loaded live from the API)
  const [mainCategories, setMainCategories] = useState([]);

  // Fetch live categories & brands dynamically from MongoDB API
  useEffect(() => {
    const fetchLiveCategories = async () => {
      try {
        const catRes = await publicCatalogService.getCategories();
        if (catRes.success && Array.isArray(catRes.categories) && catRes.categories.length > 0) {
          // Fetch all active brands in parallel to dynamically build subcategories for every category
          const brandRes = await publicCatalogService.getBrands().catch(() => ({ brands: [] }));
          const allBrands = brandRes.brands || [];

          const liveCats = catRes.categories.map(c => {
            const iconPath = c.icon || c.homeIconUrl || '/cat_images/electrician.jpg';

              // Match brands belonging to this category from MongoDB
              const matchingBrands = allBrands.filter(b =>
                (Array.isArray(b.categoryIds) && (b.categoryIds.includes(c.id) || b.categoryIds.includes(c._id))) ||
                b.categoryId === c.id ||
                b.categoryId === c._id ||
                (b.categorySlug && b.categorySlug === c.slug)
              );

              const subCats = matchingBrands.map(b => ({
                id: b.slug || b.id,
                name: b.title,
                image: toAssetUrl(b.icon || b.imageUrl || b.logo)
              }));

              return {
                id: c.slug || c.id,
                slug: c.slug || c.id,
                title: c.title,
                image: toAssetUrl(iconPath),
                count: subCats.length > 0 ? `${subCats.length} services available` : 'Coming soon',
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

  // Builds the category detail view from live data (sub-services come from the category's brands)
  const resolveCategoryDetail = (category) => {
    const subList = Array.isArray(category.subCategories) ? category.subCategories : [];

    return {
      title: category.title,
      bannerTitle: `${category.title.toUpperCase()} SERVICES`,
      rating: category.rating || 'New',
      reviews: category.reviews || null,
      desc: category.description || `Explore professional ${category.title} services at your doorstep.`,
      subGrid: subList.map(sc => ({
        id: (sc.id || sc.slug || sc.name).toLowerCase().replace(/[^a-z0-9]/g, '-'),
        name: sc.name || sc.title,
        image: toAssetUrl(sc.image || category.image || '')
      })),
      detailedSections: []
    };
  };

  // Categories come from the live API only
  const displayCategories = useMemo(() => {
    return (categories || [])
      .filter(cat => cat.showOnHome !== false)
      .sort((a, b) => (a.homeOrder || 0) - (b.homeOrder || 0))
      .map((cat) => {
        const matchedMain = mainCategories.find(m => m.slug === cat.slug || m.id === cat.id);

        return {
          id: cat.id,
          slug: cat.slug,
          title: cat.title,
          displayTitle: cat.title,
          image: cat.icon ? toAssetUrl(cat.icon) : (matchedMain?.image || '/cat_images/electrician.jpg'),
          badge: cat.badge || null,
          hasSaleBadge: cat.hasSaleBadge || false,
          subCategories: matchedMain?.subCategories || []
        };
      });
  }, [categories, mainCategories]);

  const RESERVED_SLUGS = useMemo(() => [
    'login', 'signup', 'dashboard', 'home', 'home-legacy', 'native', 'cart',
    'help-support', 'cancellation-policy', 'about-homestr', 'about-zippto', 'checkout',
    'rewards', 'account', 'my-bookings', 'bookings', 'booking', 'booking-confirmation',
    'settings', 'manage-payment-methods', 'manage-addresses', 'wallet',
    'my-plan', 'my-rating', 'update-profile', 'notifications',
    'services', 'all-services', 'categories'
  ], []);

  // Helper to load category detail view dynamically from the DB
  const loadCategoryView = useCallback(async (slug) => {
    if (!slug) {
      setActiveDetailView(null);
      return;
    }

    const cleanSlug = slug.toLowerCase().trim();
    if (cleanSlug === 'bookings' || cleanSlug === 'my-bookings') {
      navigate('/user/my-bookings', { replace: true });
      return;
    }
    if (RESERVED_SLUGS.includes(cleanSlug)) return;

    // 1. Match from the live displayCategories / mainCategories
    const matchedCategory = displayCategories.find(
      c => c.slug === cleanSlug || c.id === cleanSlug
    ) || mainCategories.find(
      c => c.slug === cleanSlug || c.id === cleanSlug
    ) || {
      slug: cleanSlug,
      id: cleanSlug,
      title: cleanSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    };

    // 2. Base view (shown with no sub-services if the live fetch below finds none)
    const fallbackDetail = resolveCategoryDetail(matchedCategory);

    // 3. Try fetching live brand services from MongoDB
    try {
      publicCatalogService.invalidateCache();
      const brandRes = await publicCatalogService.getBrands({ categorySlug: cleanSlug });

      if (brandRes.success && Array.isArray(brandRes.brands) && brandRes.brands.length > 0) {
        const dynamicSubGrid = brandRes.brands.map(b => ({
          id: b.slug,
          name: b.title,
          image: toAssetUrl(b.icon || b.imageUrl || b.logo || '/cat_images/electrician.jpg')
        }));

        const dynamicSections = [];
        brandRes.brands.forEach(b => {
          if (b.sections && b.sections.length > 0) {
            b.sections.forEach(sec => {
              dynamicSections.push({
                id: (b.slug || sec.title || '').toLowerCase().replace(/[^a-z0-9]/g, '-'),
                sectionTitle: sec.title || b.title,
                items: (sec.cards || []).map(card => ({
                  id: card.id || card._id,
                  title: card.title,
                  rating: card.rating || null,
                  reviews: card.reviews || null,
                  price: card.price ? `₹${card.price}` : (card.basePrice ? `₹${card.basePrice}` : '₹99'),
                  desc: card.subtitle || card.features?.join(' • ') || card.description || 'Professional certified home service package.',
                  image: toAssetUrl(card.imageUrl || b.icon || '/cat_images/electrician.jpg')
                }))
              });
            });
          }
        });

        if (dynamicSections.length > 0) {
          setActiveDetailView({
            title: matchedCategory.title,
            bannerTitle: `${matchedCategory.title.toUpperCase()} SERVICES`,
            rating: matchedCategory.rating || 'New',
            reviews: matchedCategory.reviews || null,
            desc: `Book certified, professional ${matchedCategory.title} experts at transparent doorstep prices.`,
            subGrid: dynamicSubGrid,
            detailedSections: dynamicSections
          });
          return;
        }
      }
    } catch (err) {
      console.error('Error fetching live brand services:', err);
    }

    setActiveDetailView(fallbackDetail);
  }, [displayCategories, mainCategories, RESERVED_SLUGS]);

  // Synchronize categorySlug from URL with category view
  useEffect(() => {
    if (categorySlug) {
      loadCategoryView(categorySlug);
    } else {
      setActiveDetailView(null);
    }
  }, [categorySlug, loadCategoryView]);

  const handleCategoryClick = (cat) => {
    if (cat.subCategories?.length > 0) {
      setActiveCategoryModal(cat);
    } else {
      const slug = cat.slug || cat.id;
      navigate(`/user/category/${slug}`);
    }
  };

  const handleBannerClick = (banner) => {
    if (!banner) return;
    if (banner.targetCategoryId) {
      const cat = displayCategories.find(c => c.id === banner.targetCategoryId || c.slug === banner.targetCategoryId) ||
                  mainCategories.find(c => c.id === banner.targetCategoryId || c.slug === banner.targetCategoryId);
      if (cat) {
        handleCategoryClick(cat);
        return;
      }
      navigate(`/user/category/${banner.targetCategoryId}`);
      return;
    }
    if (banner.slug) {
      navigate(`/user/category/${banner.slug}`);
      return;
    }
    toast.success('Browsing featured service banner');
  };

  // Noteworthy services managed from the admin panel
  const displayNoteworthy = useMemo(() => {
    if (homeContent?.noteworthy && homeContent.noteworthy.length > 0) {
      return homeContent.noteworthy.map((item, idx) => ({
        id: item.id || `nw-${idx}`,
        title: item.title,
        image: item.imageUrl ? toAssetUrl(item.imageUrl) : '/cat_images/electrician.jpg',
        subtitle: item.subtitle || 'Featured',
        isGreenText: false,
        slug: item.slug,
        targetCategoryId: item.targetCategoryId,
        targetServiceId: item.targetServiceId
      }));
    }
    return [];
  }, [homeContent?.noteworthy]);

  // Most booked services managed from the admin panel
  const displayMostBooked = useMemo(() => {
    if (homeContent?.booked && homeContent.booked.length > 0) {
      return homeContent.booked.map((item, idx) => ({
        id: item.id || `mb-${idx}`,
        title: item.title,
        image: item.imageUrl ? toAssetUrl(item.imageUrl) : '/cat_images/electrician.jpg',
        rating: item.rating || '4.80',
        isInstant: true,
        price: item.price ? (String(item.price).startsWith('₹') ? item.price : `₹${item.price}`) : '₹199',
        originalPrice: item.originalPrice ? (String(item.originalPrice).startsWith('₹') ? item.originalPrice : `₹${item.originalPrice}`) : '',
        discountBadge: item.discount || '',
        slug: item.slug,
        targetCategoryId: item.targetCategoryId,
        targetServiceId: item.targetServiceId
      }));
    }
    return [];
  }, [homeContent?.booked]);

  // Unified click handler for dynamic cards
  const handleServiceCardClick = (card) => {
    if (!card) return;
    if (card.targetCategoryId) {
      const cat = displayCategories.find(c => c.id === card.targetCategoryId || c.slug === card.targetCategoryId) ||
                  mainCategories.find(c => c.id === card.targetCategoryId || c.slug === card.targetCategoryId);
      if (cat) {
        handleCategoryClick(cat);
        return;
      }
      navigate(`/user/category/${card.targetCategoryId}`);
      return;
    }
    if (card.slug) {
      navigate(`/user/category/${card.slug}`);
      return;
    }
    if (card.targetServiceId) {
      navigate(`/user/service/${card.targetServiceId}`);
      return;
    }
    handleToggleAddService(card, 'Services');
  };

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
          TOP NAVBAR HEADER (Matching User Reference Image)
         ------------------------------------------------------------- */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-2xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* LEFT: App Icon Badge & Location + Greeting (Exactly as in Reference Screenshot) */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {/* App logo */}
            <Link to="/user" className="shrink-0 focus:outline-none group">
              <img
                src="/zippto_logo.png"
                alt="Zippto"
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-contain shadow-sm transition-transform group-hover:scale-105"
              />
            </Link>

            {/* Location Dropdown & "What you are looking for today" */}
            <div className="flex flex-col text-left min-w-0">
              <button
                type="button"
                onClick={() => setIsCityModalOpen(true)}
                className="flex items-center gap-1 text-[11px] sm:text-xs text-slate-500 hover:text-slate-800 font-medium leading-tight truncate focus:outline-none cursor-pointer"
              >
                <span className="truncate">{userCity || 'Select your location'}</span>
                <FiChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
              </button>
              <h1 className="text-xs sm:text-sm md:text-base font-bold text-slate-900 leading-tight truncate">
                What you are looking for today
              </h1>
            </div>
          </div>

          {/* DESKTOP/TABLET NAVIGATION LINKS */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5 shrink-0">
            <NavLink
              to="/user"
              end
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-full text-xs transition-all whitespace-nowrap ${
                  isActive
                    ? 'font-extrabold text-[#A3342E] bg-red-50 border border-red-100 shadow-2xs'
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
                    ? 'font-extrabold text-[#A3342E] bg-red-50 border border-red-100 shadow-2xs'
                    : 'font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`
              }
            >
              Bookings
            </NavLink>
            <NavLink
              to="/user/cart"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-full text-xs transition-all whitespace-nowrap flex items-center gap-1 ${
                  isActive
                    ? 'font-extrabold text-[#A3342E] bg-red-50 border border-red-100 shadow-2xs'
                    : 'font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`
              }
            >
              Cart
              {cartCount > 0 && (
                <span className="bg-[#A3342E] text-white font-black text-[9px] px-1.5 py-0.2 rounded-full">
                  {cartCount}
                </span>
              )}
            </NavLink>
          </nav>

          {/* RIGHT: Action Circular Icons (Search, Notifications with Badge, Profile) */}
          <div className="flex items-center gap-2 shrink-0">
            <LanguageToggle />

            {/* Circular Search Button Matching Image */}
            <button
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors shadow-2xs active:scale-95 cursor-pointer"
              aria-label="Search"
            >
              <FiSearch className="w-4 h-4" />
            </button>

            {/* Circular Notification Bell with live unread badge */}
            <Link
              to="/user/notifications"
              className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors shadow-2xs active:scale-95"
              aria-label="Notifications"
            >
              <FiBell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#D32F2F] text-white font-bold text-[9px] min-w-[17px] h-[17px] rounded-full flex items-center justify-center px-0.5 shadow-xs ring-2 ring-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>

            {isLoggedIn ? (
              <Link
                to="/user/account"
                className="hidden sm:flex w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#091E3A] text-white items-center justify-center text-xs font-black shrink-0 ring-2 ring-slate-100 hover:ring-slate-300 transition-all"
                title={userName || 'Account'}
              >
                {userName ? userName.charAt(0).toUpperCase() : 'U'}
              </Link>
            ) : (
              <Link
                to="/user/login"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#091E3A] text-white hover:bg-slate-800 text-xs font-bold transition-all shadow-xs active:scale-95"
              >
                <FiUser className="w-3.5 h-3.5 text-amber-400" />
                <span>Login</span>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Expandable Search Bar */}
        <div
          className={`overflow-hidden transition-all duration-200 ease-in-out bg-white/98 border-t border-slate-100 ${
            mobileSearchOpen ? 'max-h-16 opacity-100 py-2 px-4' : 'max-h-0 opacity-0 py-0 px-4'
          }`}
        >
          <div className="relative flex items-center max-w-md mx-auto">
            <FiSearch className="absolute left-3 text-slate-400 w-4 h-4 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search electrician, plumber, AC service, cleaning..."
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
              onClick={() => navigate('/user')}
              className="mb-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-all backdrop-blur-xs cursor-pointer"
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
                {Number(activeDetailView.rating) > 0 ? Number(activeDetailView.rating).toFixed(1) : (activeDetailView.rating || 'New')}
              </span>
              {activeDetailView.reviews && activeDetailView.reviews !== '0' && activeDetailView.reviews !== 0 && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-500 font-semibold">
                    {typeof activeDetailView.reviews === 'number'
                      ? `${activeDetailView.reviews} reviews`
                      : (activeDetailView.reviews.includes('review') ? activeDetailView.reviews : `${activeDetailView.reviews} reviews`)}
                  </span>
                </>
              )}
            </div>
            <p className="text-xs text-slate-500 leading-relaxed pt-1">
              {activeDetailView.desc}
            </p>
          </div>

          {activeDetailView.subGrid && activeDetailView.subGrid.length > 0 && (
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
                        e.target.src = '/cat_images/electrician.jpg';
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
          )}

          {activeDetailView.detailedSections && activeDetailView.detailedSections.length > 0 ? (
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
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                                <span className="flex items-center gap-0.5 font-bold text-amber-500">
                                  <FiStar className="w-3 h-3 fill-amber-400 text-amber-400" />
                                  {Number(item.rating) > 0 ? Number(item.rating).toFixed(1) : (item.rating || 'New')}
                                </span>
                                {item.reviews && item.reviews !== '0' && item.reviews !== 0 && (
                                  <span className="text-slate-400">
                                    ({typeof item.reviews === 'number' ? `${item.reviews}` : item.reviews})
                                  </span>
                                )}
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
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-8 sm:p-12 text-center flex flex-col items-center justify-center my-4 shadow-2xs">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/70 flex items-center justify-center mb-4 text-amber-600 shadow-2xs">
                <FiPackage className="w-8 h-8" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1.5">
                No services available yet
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-sm mb-6 leading-relaxed">
                We are currently onboarding certified professionals for <span className="font-semibold text-slate-700">{activeDetailView.title}</span>. Please check back soon or browse our other active categories!
              </p>
              <button
                onClick={() => navigate('/user')}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <FiArrowLeft className="w-4 h-4" />
                <span>Browse Other Categories</span>
              </button>
            </div>
          )}
        </main>
      ) : (
        /* -------------------------------------------------------------
            MAIN DASHBOARD VIEW
           ------------------------------------------------------------- */
        <main className="max-w-4xl mx-auto px-3.5 sm:px-6 pt-3 pb-6 space-y-6">
          
          {/* =============================================================
              1. TOP PROMO BANNER SLIDER (Dynamic from Admin HomeContent)
             ============================================================= */}
          {homeContent?.isBannersVisible !== false && (
            <OfferBannerSlider
              banners={homeContent?.banners || []}
              onBannerClick={handleBannerClick}
            />
          )}

          {/* =============================================================
              2. EXPLORE MORE SERVICES GRID (Dynamic from Admin MongoDB)
             ============================================================= */}
          {homeContent?.isCategoriesVisible !== false && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-bold font-heading text-gray-900 tracking-tight">
                  Explore More Services
                </h2>
                <button
                  type="button"
                  onClick={() => navigate('/user/services')}
                  className="text-xs sm:text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors flex items-center gap-1 cursor-pointer group"
                >
                  <span>View All</span>
                  {displayCategories.length > 0 && (
                    <span className="text-[11px] text-slate-400 group-hover:text-blue-500">
                      ({displayCategories.length})
                    </span>
                  )}
                  <FiArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
                {displayCategories.slice(0, 9).map((cat, index) => {
                  const pastelColors = [
                    { bg: '#FEFBE8', text: '#854D0E' }, // Yellow
                    { bg: '#FAE8FF', text: '#86198F' }, // Purple
                    { bg: '#FFE4E6', text: '#9F1239' }, // Rose
                    { bg: '#FFF1F2', text: '#991B1B' }, // Red
                    { bg: '#F0FDF4', text: '#166534' }, // Green
                    { bg: '#E0F2FE', text: '#075985' }, // Sky
                    { bg: '#EEF2FF', text: '#3730A3' }, // Indigo
                    { bg: '#FEF3C7', text: '#92400E' }, // Amber
                    { bg: '#EFF6FF', text: '#1E40AF' }  // Blue
                  ];
                  const scheme = pastelColors[index % pastelColors.length];

                  return (
                    <div
                      key={cat.id || index}
                      onClick={() => handleCategoryClick(cat)}
                      className="flex flex-col items-center text-center cursor-pointer group select-none relative"
                    >
                      {/* Category Grid Card: 1:1 aspect-square, rounded-md, shadow 0 2px 8px */}
                      <div
                        className="w-full aspect-square rounded-md border border-[#E5E7EB] overflow-hidden group-hover:scale-[1.03] transition-all duration-300 relative"
                        style={{
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
                        }}
                      >
                        {cat.badge && (
                          <span className="absolute top-1 right-1 z-10 bg-amber-500 text-white font-bold text-[8px] px-1 py-0.2 rounded-full uppercase shadow-xs">
                            {cat.badge}
                          </span>
                        )}
                        {cat.hasSaleBadge && !cat.badge && (
                          <span className="absolute top-1 right-1 z-10 bg-red-600 text-white font-bold text-[8px] px-1 py-0.2 rounded-full uppercase shadow-xs">
                            SALE
                          </span>
                        )}
                        <img
                          src={cat.image}
                          alt={cat.displayTitle || cat.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/cat_images/electrician.jpg';
                          }}
                        />
                      </div>

                      {/* Title Underneath Tile */}
                      <h3
                        className="mt-1.5 text-[11px] sm:text-xs font-bold leading-tight text-center line-clamp-2 px-0.5 font-heading"
                        style={{ color: scheme.text }}
                      >
                        {cat.displayTitle || cat.title}
                      </h3>
                    </div>
                  );
                })}

                {/* 10th Card: All Services CTA Card */}
                {displayCategories.length > 9 && (
                  <div
                    onClick={() => navigate('/user/services')}
                    className="flex flex-col items-center text-center cursor-pointer group select-none relative"
                  >
                    <div
                      className="w-full aspect-square rounded-md border border-dashed border-slate-300 bg-slate-50/80 hover:bg-slate-100 flex flex-col items-center justify-center p-2.5 sm:p-3.5 overflow-hidden group-hover:scale-[1.03] transition-all duration-300 relative text-slate-700 hover:text-blue-600"
                      style={{
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                      }}
                    >
                      <FiGrid className="w-6 h-6 sm:w-7 sm:h-7 mb-1 text-slate-600 group-hover:text-blue-600 group-hover:rotate-6 transition-all" />
                      <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wide">
                        View All
                      </span>
                    </div>
                    <h3 className="mt-1.5 text-[11px] sm:text-xs font-bold leading-tight text-center text-slate-700 group-hover:text-blue-600 font-heading">
                      All Services
                    </h3>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* =============================================================
              3. "New and noteworthy" (Dynamic from Admin)
             ============================================================= */}
          {homeContent?.isNoteworthyVisible !== false && displayNoteworthy.length > 0 && (
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
                  {displayNoteworthy.map((card) => (
                    <div
                      key={card.id}
                      onClick={() => handleServiceCardClick(card)}
                      className="group cursor-pointer flex flex-col w-[135px] sm:w-[155px] md:w-auto shrink-0 snap-start"
                    >
                      <div className="w-full aspect-[4/3] relative overflow-hidden rounded-2xl bg-slate-100 border border-slate-200/80 shadow-2xs">
                        <img
                          src={card.image}
                          alt={card.title}
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/cat_images/electrician.jpg';
                          }}
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
          )}

          {/* =============================================================
              4. "Most booked services" (Dynamic from Admin)
             ============================================================= */}
          {homeContent?.isBookedVisible !== false && displayMostBooked.length > 0 && (
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
                  {displayMostBooked.map((card) => (
                    <div
                      key={card.id}
                      onClick={() => handleServiceCardClick(card)}
                      className="group cursor-pointer flex flex-col w-[135px] sm:w-[155px] md:w-auto shrink-0 snap-start"
                    >
                      <div className="w-full aspect-[4/3] relative overflow-hidden rounded-2xl bg-slate-100 border border-slate-200/80 shadow-2xs">
                        <img
                          src={card.image}
                          alt={card.title}
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/cat_images/electrician.jpg';
                          }}
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
          )}

          {/* =============================================================
              5. PROMOTIONAL FEATURE CARDS (Dynamic Admin Promos)
             ============================================================= */}
          {homeContent?.isPromosVisible !== false && (
            (homeContent?.promos && homeContent.promos.length > 0) ? (
              <div className="space-y-4">
                {homeContent.promos.map((promo, pIdx) => (
                  <section
                    key={promo.id || pIdx}
                    onClick={() => handleServiceCardClick(promo)}
                    className="cursor-pointer w-full rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white overflow-hidden border border-slate-700/50 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm group hover:border-slate-500 transition-all"
                  >
                    <div className="space-y-2 max-w-lg">
                      {promo.discount && (
                        <span className="inline-block bg-emerald-500 text-slate-950 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          {promo.discount}
                        </span>
                      )}
                      <div>
                        <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                          {promo.title}
                        </h3>
                        {promo.subtitle && (
                          <p className="text-xs font-medium text-slate-300 mt-0.5">
                            {promo.subtitle}
                          </p>
                        )}
                      </div>
                      <button className="px-4 py-1.5 rounded-lg bg-white text-slate-900 font-bold text-xs shadow-xs hover:bg-slate-100 transition-all active:scale-95">
                        {promo.buttonText || 'Book Now'}
                      </button>
                    </div>

                    {promo.imageUrl && (
                      <div className="w-full sm:w-1/3 flex items-center justify-center">
                        <img
                          src={toAssetUrl(promo.imageUrl)}
                          alt={promo.title}
                          className="max-h-28 sm:max-h-36 object-contain rounded-lg shadow-sm group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      </div>
                    )}
                  </section>
                ))}
              </div>
            ) : null
          )}

          {/* =============================================================
              6. CATEGORY SECTIONS (Dynamic Admin CategorySections)
             ============================================================= */}
          {homeContent?.isCategorySectionsVisible !== false && (
            (homeContent?.categorySections && homeContent.categorySections.length > 0) ? (
              homeContent.categorySections.map((section, sIdx) => {
                const carouselId = `carousel-dyn-sec-${sIdx}`;
                return (
                  <section key={section.id || sIdx} className="space-y-2 relative">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-base font-bold text-[#111827] tracking-tight">
                          {section.title}
                        </h2>
                        {section.subtitle && (
                          <p className="text-[10px] sm:text-[11px] text-slate-500">{section.subtitle}</p>
                        )}
                      </div>
                      {(section.seeAllTargetCategoryId || section.seeAllSlug) && (
                        <button
                          onClick={() => {
                            const target = section.seeAllTargetCategoryId || section.seeAllSlug;
                            navigate(`/user/category/${target}`);
                          }}
                          className="px-2.5 py-1 rounded-md border border-slate-200 text-[10px] sm:text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          See all
                        </button>
                      )}
                    </div>

                    <div className="relative group/carousel">
                      <div
                        id={carouselId}
                        onScroll={() => handleCarouselScroll(carouselId)}
                        className="flex md:grid md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] py-1 px-1"
                      >
                        {(section.cards || []).map((card, cIdx) => (
                          <div
                            key={card.id || cIdx}
                            onClick={() => handleServiceCardClick(card)}
                            className="group cursor-pointer flex flex-col w-[135px] sm:w-[155px] md:w-auto shrink-0 snap-start"
                          >
                            <div className="w-full aspect-[4/3] relative overflow-hidden rounded-2xl bg-slate-100 border border-slate-200/80 shadow-2xs">
                              <img
                                src={card.imageUrl ? toAssetUrl(card.imageUrl) : '/cat_images/electrician.jpg'}
                                alt={card.title}
                                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = '/cat_images/electrician.jpg';
                                }}
                              />
                              {card.discount && (
                                <span className="absolute top-1.5 left-1.5 bg-[#007F5F] text-white font-bold text-[8px] px-1 py-0.2 rounded-[2px] uppercase tracking-wide">
                                  {card.discount}
                                </span>
                              )}
                              {card.badge && (
                                <span className="absolute top-1.5 right-1.5 bg-amber-500 text-white font-bold text-[8px] px-1 py-0.2 rounded-[2px] uppercase tracking-wide">
                                  {card.badge}
                                </span>
                              )}
                            </div>

                            <div className="px-0.5">
                              <h3 className="text-[11px] sm:text-xs font-bold text-[#111827] leading-tight mt-1.5 line-clamp-1">
                                {card.title}
                              </h3>

                              {card.rating && (
                                <div className="flex items-center gap-1 text-[10px] text-slate-700 font-medium mt-0.5">
                                  <span className="flex items-center gap-0.5 font-bold">
                                    ★ {card.rating}
                                  </span>
                                  {card.reviews && (
                                    <span className="text-slate-400">({card.reviews})</span>
                                  )}
                                </div>
                              )}

                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-[11px] sm:text-xs font-bold text-[#111827]">
                                  {card.price ? (String(card.price).startsWith('₹') ? card.price : `₹${card.price}`) : '₹199'}
                                </span>
                                {card.originalPrice && (
                                  <span className="text-[9px] text-slate-400 line-through font-normal">
                                    {String(card.originalPrice).startsWith('₹') ? card.originalPrice : `₹${card.originalPrice}`}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                );
              })
            ) : null
          )}

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
                    onClick={() => {
                      setActiveCategoryModal(null);
                      if (sub.slug) {
                        navigate(`/user/category/${sub.slug}`);
                      } else {
                        // Sub-service of this category: open it and jump to that section
                        navigate(`/user/category/${activeCategoryModal.slug || activeCategoryModal.id}`, {
                          state: { scrollTo: sub.id }
                        });
                      }
                    }}
                    className="flex flex-col items-center cursor-pointer group active:scale-95 transition-transform"
                  >
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-50 flex items-center justify-center shadow-sm overflow-hidden border border-slate-100 group-hover:shadow-md group-hover:scale-105 transition-all">
                      <img
                        src={sub.image || '/cat_images/electrician.jpg'}
                        alt={sub.name}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/cat_images/electrician.jpg';
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
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

      {/* City Selector Modal */}
      <CitySelectorModal
        isOpen={isCityModalOpen}
        onClose={() => setIsCityModalOpen(false)}
      />
    </div>
  );
};

export default UserDashboard;
