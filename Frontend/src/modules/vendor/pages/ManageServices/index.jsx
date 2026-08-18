import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiChevronDown, FiChevronUp, FiSearch, FiCheck, FiX, FiTrash2, FiPlus, FiSave, FiLayers, FiAlertCircle, FiInfo, FiSliders, FiMapPin, FiNavigation } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { vendorTheme as themeColors } from '../../../../theme';
import { vendorAuthService } from '../../../../services/authService';
import { publicCatalogService } from '../../../../services/catalogService';
import Header from '../../components/layout/Header';
import BottomNav from '../../components/layout/BottomNav';
import LogoLoader from '../../../../components/common/LogoLoader';

const toAssetUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads/') || url.startsWith('uploads/')) {
    const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001').replace(/\/api\/?$/, '');
    return `${base}/${url.replace(/^\/+/, '')}`;
  }
  return url;
};

const DEFAULT_SUB_SERVICES = {
  electrician: [
    { id: 'switch-socket', name: 'Switch & Socket Replacement', icon: '🔌' },
    { id: 'fan-repair', name: 'Ceiling Fan Repair & Mounting', icon: '🌀' },
    { id: 'mcb-repair', name: 'MCB & Fuse Box Repair', icon: '⚡' },
    { id: 'tv-install', name: 'TV Installation & Wiring', icon: '📺' },
  ],
  plumber: [
    { id: 'tap-repair', name: 'Tap & Mixer Leakage Repair', icon: '🚰' },
    { id: 'drainage-clear', name: 'Blockage & Drainage Clearing', icon: '🧼' },
    { id: 'toilet-flush', name: 'Flush Tank & Toilet Repair', icon: '🚽' },
    { id: 'pipe-fitting', name: 'Water Pipe & Tank Fitting', icon: '🚿' },
  ],
  carpenter: [
    { id: 'door-lock', name: 'Door Hinge & Lock Repair', icon: '🚪' },
    { id: 'furniture-assemble', name: 'Furniture Assembly & Repair', icon: '🪑' },
    { id: 'sofa-repair', name: 'Sofa Repair & Upholstery', icon: '🛋️' },
    { id: 'hanger-decor', name: 'Hanger & Wall Decor Fitting', icon: '🖼️' },
  ],
  'salon-for-women': [
    { id: 'waxing', name: 'Waxing & Hair Removal', icon: '💅' },
    { id: 'facial', name: 'Facial & Clean Up', icon: '✨' },
    { id: 'korean-glow', name: 'Korean Glow Facial', icon: '🌸' },
    { id: 'mani-pedi', name: 'Pedicure & Manicure', icon: '💅' },
    { id: 'hair-care', name: 'Hair Styling & Care', icon: '💇‍♀️' },
  ],
  'ac-appliance-repair': [
    { id: 'ac-foam-jet', name: 'AC Foam Jet Service', icon: '❄️' },
    { id: 'ac-gas-fill', name: 'AC Gas Leak Refill', icon: '🧪' },
    { id: 'fridge-repair', name: 'Refrigerator Repair', icon: '🧊' },
    { id: 'washing-machine', name: 'Washing Machine Repair', icon: '🧺' },
  ],
  'cleaning-service': [
    { id: 'full-home-clean', name: 'Full Home Deep Cleaning', icon: '🧹' },
    { id: 'bathroom-clean', name: 'Bathroom Sanitization & Scrub', icon: '🧼' },
    { id: 'kitchen-clean', name: 'Kitchen Chimney & Tile Cleaning', icon: '🍳' },
  ],
  'pest-control': [
    { id: 'cockroach-pest', name: 'Cockroach Control', icon: '🪲' },
    { id: 'termite-pest', name: 'Termite Treatment', icon: '🪵' },
    { id: 'bedbug-pest', name: 'Bed Bug Eradication', icon: '🛏️' },
  ],
  'painting-service': [
    { id: 'interior-paint', name: 'Full Interior Paint', icon: '🎨' },
    { id: 'waterproof-paint', name: 'Waterproofing', icon: '💧' },
    { id: 'wall-texture', name: 'Wall Texture Painting', icon: '🖼️' },
  ]
};

const RADIUS_PRESETS = [5, 10, 15, 25, 50];

const ManageServices = () => {
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const [categories, setCategories] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedSubServices, setSelectedSubServices] = useState([]);
  const [expandedCategoryId, setExpandedCategoryId] = useState(null);
  const [workDistance, setWorkDistance] = useState(10);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useLayoutEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const bgStyle = themeColors.backgroundGradient;

    if (html) html.style.background = bgStyle;
    if (body) body.style.background = bgStyle;

    return () => {
      if (html) html.style.background = '';
      if (body) body.style.background = '';
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // 1. Fetch vendor profile
        const profileRes = await vendorAuthService.getProfile();
        let vendorServices = [];
        let vendorSkills = [];
        let vendorRange = 10;

        if (profileRes.success && profileRes.vendor) {
          const rawServices = profileRes.vendor.service;
          vendorServices = Array.isArray(rawServices) ? rawServices : (rawServices ? [rawServices] : []);
          vendorSkills = profileRes.vendor.skills || [];
          vendorRange = profileRes.vendor.serviceRange || profileRes.vendor.settings?.serviceRange || 10;
        } else {
          const stored = JSON.parse(localStorage.getItem('vendorData') || '{}');
          const rawServices = stored.service;
          vendorServices = Array.isArray(rawServices) ? rawServices : (rawServices ? [rawServices] : []);
          vendorSkills = stored.skills || [];
          vendorRange = stored.serviceRange || stored.settings?.serviceRange || 10;
        }

        setWorkDistance(vendorRange);

        // 2. Fetch public categories from API
        const catRes = await publicCatalogService.getCategories();
        let fetchedCats = [];

        const defaultCatalog = [
          { id: 'electrician', slug: 'electrician', title: 'Electrician', icon: '/cat_images/electrician.jpg', description: 'Switches, wiring, fans & MCB repairs' },
          { id: 'plumber', slug: 'plumber', title: 'Plumber', icon: '/cat_images/plumber.jpg', description: 'Tap repair, pipe leaks & drainage clearance' },
          { id: 'carpenter', slug: 'carpenter', title: 'Carpenter', icon: '/cat_images/carpenter.jpg', description: 'Door locks, furniture assembly & wooden repair' },
          { id: 'salon-for-women', slug: 'salon-for-women', title: 'Salon for Women', icon: '/cat_images/salon_women.jpg', description: 'At-home facial, waxing, mani-pedi & hair care' },
          { id: 'ac-appliance-repair', slug: 'ac-appliance-repair', title: 'AC & Appliance Repair', icon: '/ac_repair_wall.png', description: 'Split AC servicing, fridge & washing machine repair' },
          { id: 'cleaning-service', slug: 'cleaning-service', title: 'Cleaning Service', icon: '/cat_cleaning.png', description: 'Full home deep cleaning & bathroom sanitization' },
          { id: 'pest-control', slug: 'pest-control', title: 'Pest Control', icon: '/intense_bathroom_cleaning.png', description: 'Cockroach, termite & mosquito pest treatment' },
          { id: 'painting-service', slug: 'painting-service', title: 'Painting Service', icon: '/drill_wall_decor.png', description: 'Interior & exterior wall painting & waterproofing' },
          { id: 'construction-renovation', slug: 'construction-renovation', title: 'Construction & Renovation', icon: '/switchboard_repair.png', description: 'Civil repair, false ceiling & marble laying' },
          { id: 'solar-service', slug: 'solar-service', title: 'Solar Service', icon: '/native_water_purifier.png', description: 'Rooftop panel installation & maintenance' }
        ];

        if (catRes.success && Array.isArray(catRes.categories) && catRes.categories.length > 0) {
          const cleanCats = catRes.categories.filter(c => 
            !c.title.toLowerCase().includes('test') && 
            !c.slug.toLowerCase().includes('test') &&
            c.slug !== 'electrician-plumber-carpenter'
          );

          // Fetch all public brands to map live sub-services
          let allBrands = [];
          try {
            const brandRes = await publicCatalogService.getBrands();
            if (brandRes.success && Array.isArray(brandRes.brands)) {
              allBrands = brandRes.brands;
            }
          } catch (bErr) {
            console.error('Failed to fetch public brands for sub-services:', bErr);
          }

          fetchedCats = cleanCats.map(c => {
            const fallback = defaultCatalog.find(d => d.slug === c.slug);
            const catBrands = allBrands.filter(b => b.categorySlug === c.slug || b.categoryId === c.id);
            
            const liveSubServices = catBrands.length > 0
              ? catBrands.map(b => ({ id: b.slug, name: b.title, icon: '⚡' }))
              : (DEFAULT_SUB_SERVICES[c.slug] || DEFAULT_SUB_SERVICES[c.id] || []);

            return {
              id: c.slug || c.id || c._id,
              slug: c.slug || c.id || c._id,
              title: c.title,
              icon: c.icon || c.homeIconUrl || fallback?.icon || '',
              description: c.description || fallback?.description || 'On-demand service category',
              subServices: liveSubServices
            };
          });

          defaultCatalog.forEach(d => {
            if (!fetchedCats.some(f => f.slug === d.slug)) {
              fetchedCats.push({
                ...d,
                subServices: DEFAULT_SUB_SERVICES[d.slug] || []
              });
            }
          });
        } else {
          fetchedCats = defaultCatalog.map(d => ({
            ...d,
            subServices: DEFAULT_SUB_SERVICES[d.slug] || []
          }));
        }

        setCategories(fetchedCats);

        // Normalize raw vendorServices to match canonical category slugs
        const normalizedInitialServices = Array.from(new Set(
          vendorServices.map(s => {
            const match = fetchedCats.find(c =>
              c.slug.toLowerCase() === String(s).toLowerCase() ||
              c.title.toLowerCase() === String(s).toLowerCase() ||
              (c.id && String(c.id).toLowerCase() === String(s).toLowerCase())
            );
            return match ? match.slug : String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
          }).filter(Boolean)
        ));

        setSelectedServices(normalizedInitialServices);

        // Auto-initialize selectedSubServices with all sub-service IDs if vendorSkills is empty
        if (Array.isArray(vendorSkills) && vendorSkills.length > 0) {
          setSelectedSubServices(vendorSkills);
        } else {
          const allInitialSubIds = [];
          fetchedCats.forEach(cat => {
            if (normalizedInitialServices.includes(cat.slug) || normalizedInitialServices.includes(cat.id)) {
              (cat.subServices || []).forEach(s => allInitialSubIds.push(s.id));
            }
          });
          setSelectedSubServices(Array.from(new Set(allInitialSubIds)));
        }
      } catch (err) {
        console.error('Failed to load services data:', err);
        toast.error('Failed to load service categories');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const isCategorySelected = (cat) => {
    const cSlug = (cat.slug || cat.id || '').toLowerCase().trim();
    const cTitle = (cat.title || '').toLowerCase().trim();
    return selectedServices.some(s => {
      const item = String(s).toLowerCase().trim();
      return item === cSlug || item === cTitle;
    });
  };

  const handleSelectCategory = (cat) => {
    const catSlug = (cat.slug || cat.id).toLowerCase().trim();
    
    if (!isCategorySelected(cat)) {
      setSelectedServices(prev => Array.from(new Set([...prev, catSlug])));
      // Auto opt-in all sub-services for this category
      const subList = cat.subServices || DEFAULT_SUB_SERVICES[catSlug] || [];
      const subIds = subList.map(s => s.id);
      setSelectedSubServices(prev => Array.from(new Set([...prev, ...subIds])));
      toast.success(`${cat.title} added!`);
    }
    setIsDropdownOpen(false);
    setSearchQuery('');
  };

  const handleRemoveCategory = (cat) => {
    const catSlug = (cat.slug || cat.id || '').toLowerCase().trim();
    const catTitle = (cat.title || '').toLowerCase().trim();

    setSelectedServices(prev => prev.filter(s => {
      const item = String(s).toLowerCase().trim();
      return item !== catSlug && item !== catTitle;
    }));

    const subList = cat.subServices || DEFAULT_SUB_SERVICES[catSlug] || [];
    const subIds = subList.map(s => s.id);
    setSelectedSubServices(prev => prev.filter(id => !subIds.includes(id)));
    toast.success(`${cat.title} removed`);
  };

  const handleToggleSubService = (subId, categorySubList = []) => {
    setSelectedSubServices(prev => {
      let current = [...prev];
      if (current.length === 0 && categorySubList.length > 0) {
        current = categorySubList.map(s => s.id);
      }

      const exists = current.includes(subId);
      if (exists) {
        toast.success('Sub-service disabled');
        return current.filter(id => id !== subId);
      } else {
        toast.success('Sub-service enabled');
        return [...current, subId];
      }
    });
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const cleanServices = Array.from(new Set(selectedServices.map(s => String(s).trim()).filter(Boolean)));
      const cleanSkills = Array.from(new Set(selectedSubServices.map(s => String(s).trim()).filter(Boolean)));

      const res = await vendorAuthService.updateProfile({
        serviceCategory: cleanServices,
        skills: cleanSkills,
        serviceRange: workDistance
      });

      if (res.success) {
        toast.success('Offered services & work distance updated!');
        const stored = JSON.parse(localStorage.getItem('vendorData') || '{}');
        stored.service = cleanServices;
        stored.categories = cleanServices;
        stored.skills = cleanSkills;
        stored.serviceRange = workDistance;
        if (!stored.settings) stored.settings = {};
        stored.settings.serviceRange = workDistance;
        localStorage.setItem('vendorData', JSON.stringify(stored));
        window.dispatchEvent(new Event('vendorProfileUpdated'));
        setTimeout(() => navigate('/vendor/profile'), 700);
      } else {
        toast.error(res.message || 'Failed to update services');
      }
    } catch (error) {
      console.error('Error saving services:', error);
      toast.error('Failed to update services. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Filter available categories for dropdown (exclude already selected)
  const availableCategories = categories.filter(cat => 
    !isCategorySelected(cat) &&
    cat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Active selected category objects
  const activeCategoryObjects = categories.filter(cat => isCategorySelected(cat));

  if (isLoading) return <LogoLoader />;

  return (
    <div className="min-h-screen pb-24" style={{ background: themeColors.backgroundGradient }}>
      <Header title="My Offered Services & Radius" />

      <main className="px-4 pt-4 max-w-xl mx-auto space-y-5">
        {/* Banner Header */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100/80">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <FiSliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 leading-tight">Services & Service Distance</h2>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Set your maximum travel distance and select the specific categories and sub-services you perform.
              </p>
            </div>
          </div>
        </div>

        {/* WORK DISTANCE / SERVICE RADIUS CARD */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100/80 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <FiNavigation className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Work Distance Radius</h3>
                <p className="text-[11px] text-gray-500">Maximum distance you travel for bookings</p>
              </div>
            </div>
            <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-100">
              {workDistance} km
            </span>
          </div>

          {/* Slider Control */}
          <div className="space-y-2 pt-1">
            <input
              type="range"
              min="1"
              max="50"
              step="1"
              value={workDistance}
              onChange={(e) => setWorkDistance(Number(e.target.value))}
              className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
            />
            <div className="flex justify-between text-[10px] font-bold text-gray-400">
              <span>1 km</span>
              <span>15 km</span>
              <span>30 km</span>
              <span>50 km</span>
            </div>
          </div>

          {/* Quick Select Radius Pills */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Quick Select:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {RADIUS_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setWorkDistance(preset)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    workDistance === preset
                      ? 'bg-indigo-600 text-white shadow-sm scale-105'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {preset} km
                </button>
              ))}
            </div>
          </div>

          {/* Real-time Radius Info Banner */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex items-start gap-2 text-xs text-slate-600">
            <FiMapPin className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <span>
              You will automatically receive new booking alerts within a <strong className="text-slate-900">{workDistance} km</strong> radius around your location.
            </span>
          </div>
        </div>

        {/* Multi-Select Dropdown Component */}
        <div className="space-y-2" ref={dropdownRef}>
          <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block px-1">
            Add a Service Category
          </label>

          <div className="relative">
            {/* Custom Dropdown Trigger Button */}
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full bg-white border border-gray-200 hover:border-teal-500 rounded-2xl p-4 flex items-center justify-between shadow-sm transition-all text-left focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                  <FiPlus className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-gray-600">
                  {availableCategories.length > 0
                    ? 'Select category to add...'
                    : 'All categories selected'}
                </span>
              </div>
              <FiChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180 text-teal-600' : ''}`} />
            </button>

            {/* Dropdown Options Popup */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-fadeIn">
                {/* Search Bar */}
                <div className="p-3 border-b border-gray-100 bg-gray-50/50">
                  <div className="relative flex items-center">
                    <FiSearch className="absolute left-3 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search categories..."
                      className="w-full bg-white text-xs text-gray-900 rounded-xl pl-9 pr-8 py-2.5 border border-gray-200 focus:outline-none focus:border-teal-500"
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery('')} className="absolute right-3 text-gray-400">
                        <FiX className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Options List */}
                <div className="max-h-60 overflow-y-auto divide-y divide-gray-50">
                  {availableCategories.length > 0 ? (
                    availableCategories.map((cat) => (
                      <div
                        key={cat.id}
                        onClick={() => handleSelectCategory(cat)}
                        className="flex items-center justify-between p-3.5 hover:bg-teal-50/60 cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden flex items-center justify-center shrink-0">
                            {cat.icon ? (
                              <img src={toAssetUrl(cat.icon)} alt={cat.title} className="w-full h-full object-cover" />
                            ) : (
                              <FiLayers className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-gray-800 group-hover:text-teal-700">{cat.title}</h4>
                            <p className="text-[11px] text-gray-400 line-clamp-1">{cat.description}</p>
                          </div>
                        </div>
                        <div className="w-7 h-7 rounded-full bg-teal-50 group-hover:bg-teal-600 text-teal-600 group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                          <FiPlus className="w-4 h-4" />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-gray-400 text-xs font-medium">
                      No matching available categories found.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Active Offered Services & Sub-Services Accordion Section */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Active Categories & Sub-Services ({activeCategoryObjects.length})
            </h3>
          </div>

          {activeCategoryObjects.length > 0 ? (
            <div className="space-y-3">
              {activeCategoryObjects.map((cat) => {
                const isExpanded = expandedCategoryId === cat.id;
                const subList = cat.subServices || DEFAULT_SUB_SERVICES[cat.slug] || [];

                return (
                  <div
                    key={cat.id}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all"
                  >
                    {/* Main Category Row */}
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-2">
                        <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 overflow-hidden flex items-center justify-center shrink-0">
                          {cat.icon ? (
                            <img src={toAssetUrl(cat.icon)} alt={cat.title} className="w-full h-full object-cover" />
                          ) : (
                            <FiLayers className="w-6 h-6 text-teal-600" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-gray-900 truncate">{cat.title}</h4>
                            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200/60 shrink-0">
                              ● Active
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{cat.description}</p>
                        </div>
                      </div>

                      {/* Right Action Group */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Sub-Services Accordion Toggle */}
                        {subList.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setExpandedCategoryId(isExpanded ? null : cat.id)}
                            className="px-2.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <span>{subList.length} Sub-services</span>
                            {isExpanded ? <FiChevronUp className="w-3.5 h-3.5" /> : <FiChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        )}

                        {/* Remove Category Button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveCategory(cat)}
                          className="p-2 rounded-xl bg-gray-50 hover:bg-rose-50 text-gray-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Remove Category"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Sub-Services Accordion Body */}
                    {isExpanded && subList.length > 0 && (
                      <div className="bg-slate-50/80 p-3.5 border-t border-gray-100 space-y-2 animate-fadeIn">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block px-1">
                          Customize Sub-Service Opt-In
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {subList.map((sub) => {
                            const isOptedIn = selectedSubServices.includes(sub.id);

                            return (
                              <div
                                key={sub.id}
                                onClick={() => handleToggleSubService(sub.id, subList)}
                                className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                                  isOptedIn
                                    ? 'bg-white border-teal-500 shadow-2xs'
                                    : 'bg-white/60 border-gray-200 opacity-60'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                  <span className="text-base shrink-0">{sub.icon}</span>
                                  <span className="text-xs font-bold text-gray-800 truncate">{sub.name}</span>
                                </div>

                                <div
                                  className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors duration-300 shrink-0 ${
                                    isOptedIn ? 'bg-teal-600' : 'bg-gray-200'
                                  }`}
                                >
                                  <div
                                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                                      isOptedIn ? 'translate-x-4' : 'translate-x-0'
                                    }`}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-8 text-center border border-dashed border-gray-200">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center mx-auto mb-3">
                <FiInfo className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-gray-800">No Services Selected Yet</h4>
              <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                Select categories from the dropdown menu above to start receiving live booking requests.
              </p>
            </div>
          )}
        </div>

        {/* Save Changes Button */}
        <div className="pt-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-3.5 px-6 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-98 cursor-pointer"
            style={{ backgroundColor: themeColors.button }}
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <FiSave className="w-4.5 h-4.5" /> Save Offered Services & Radius ({workDistance} km)
              </>
            )}
          </button>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default ManageServices;
