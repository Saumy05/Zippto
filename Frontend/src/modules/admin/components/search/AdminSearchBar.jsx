import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  FiSearch,
  FiX,
  FiArrowRight,
  FiCornerDownLeft,
  FiCommand,
  FiCompass,
  FiZap,
  FiShoppingBag,
  FiUsers,
  FiBriefcase,
  FiGrid,
  FiLifeBuoy,
  FiTag,
  FiClock,
  FiCheckCircle,
  FiLoader,
  FiSliders,
  FiChevronRight
} from 'react-icons/fi';
import { ROUTE_DEFINITIONS, ADMIN_QUICK_ACTIONS } from '../../config/routeDefinitions';
import adminSearchService from '../../services/adminSearchService';

const RECENT_SEARCHES_KEY = 'admin_recent_searches';
const MAX_RECENT = 6;
const EMPTY_RESULTS = {
  bookings: [],
  users: [],
  vendors: [],
  services: [],
  tickets: [],
  coupons: []
};

const GROUP_LABELS = {
  suggestion: 'Suggestions',
  page: 'Pages',
  action: 'Quick Actions',
  booking: 'Bookings',
  user: 'Customers',
  vendor: 'Partners',
  service: 'Catalog',
  ticket: 'Tickets',
  coupon: 'Coupons'
};

const SUGGESTIONS = [
  { title: 'Dashboard', path: '/admin/dashboard', subtitle: 'Core Operations', icon: FiCompass },
  { title: 'All Bookings', path: '/admin/bookings', subtitle: 'Bookings', icon: FiShoppingBag },
  { title: 'Live Order Tracking', path: '/admin/bookings/tracking', subtitle: 'Bookings', icon: FiZap },
  { title: 'Customer Directory', path: '/admin/users/all', subtitle: 'Users', icon: FiUsers },
  { title: 'Service Partners', path: '/admin/vendors/all', subtitle: 'Vendors', icon: FiBriefcase },
  { title: 'Pending Settlements', path: '/admin/settlements/pending', subtitle: 'Finance', icon: FiSliders }
].map((item) => ({ ...item, type: 'suggestion', id: `suggestion-${item.path}` }));

export const AdminSearchBar = ({ className = '' }) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'pages', 'bookings', 'users', 'vendors', 'actions'
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState([]);
  const [isSearchingBackend, setIsSearchingBackend] = useState(false);
  const [backendResults, setBackendResults] = useState(EMPTY_RESULTS);

  const inputRef = useRef(null);
  const resultsContainerRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const requestIdRef = useRef(0);

  // Detect OS for shortcut hint (⌘K vs Ctrl+K)
  const isMac = useMemo(() => {
    if (typeof window === 'undefined') return true;
    return /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform || navigator.userAgent);
  }, []);

  // Load recent searches
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const saveRecentSearch = useCallback((term) => {
    if (!term || !term.trim()) return;
    const clean = term.trim();
    try {
      const current = recentSearches.filter((s) => s.toLowerCase() !== clean.toLowerCase());
      const updated = [clean, ...current].slice(0, MAX_RECENT);
      setRecentSearches(updated);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch {
      // Ignore
    }
  }, [recentSearches]);

  const removeRecentSearch = useCallback((term, e) => {
    e.stopPropagation();
    try {
      const updated = recentSearches.filter((s) => s !== term);
      setRecentSearches(updated);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch {
      // Ignore
    }
  }, [recentSearches]);

  const clearAllRecent = useCallback((e) => {
    e.stopPropagation();
    try {
      setRecentSearches([]);
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {
      // Ignore
    }
  }, []);

  // Global Keyboard shortcut listener (⌘K / Ctrl+K / "/")
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Open shortcut: Cmd+K / Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        return;
      }

      // Open shortcut: "/" when not focused on an input or textarea
      if (
        e.key === '/' &&
        !isOpen &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        !document.activeElement?.isContentEditable
      ) {
        e.preventDefault();
        setIsOpen(true);
        return;
      }

      // Escape closes modal
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Lock page scroll while the palette is open (html + body, in case either is the scroller)
  useEffect(() => {
    if (!isOpen) return;
    const html = document.documentElement;
    const prevBody = document.body.style.overflow;
    const prevHtml = html.style.overflow;
    document.body.style.overflow = 'hidden';
    html.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBody;
      html.style.overflow = prevHtml;
    };
  }, [isOpen]);

  // Autofocus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      requestIdRef.current += 1;
      setQuery('');
      setBackendResults(EMPTY_RESULTS);
    }
  }, [isOpen]);

  // Debounced backend search for live records
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      requestIdRef.current += 1;
      setIsSearchingBackend(false);
      setBackendResults(EMPTY_RESULTS);
      return;
    }

    setIsSearchingBackend(true);
    debounceTimerRef.current = setTimeout(async () => {
      const requestId = ++requestIdRef.current;
      try {
        const res = await adminSearchService.search(trimmed);
        // Drop responses from superseded queries
        if (requestId !== requestIdRef.current) return;
        if (res?.success && res.data) {
          setBackendResults({ ...EMPTY_RESULTS, ...res.data });
        }
      } catch (err) {
        console.warn('Backend search error:', err);
      } finally {
        if (requestId === requestIdRef.current) setIsSearchingBackend(false);
      }
    }, 280);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query]);

  // Filter local pages and actions
  const filteredPages = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return ROUTE_DEFINITIONS.filter((route) => {
      const matchTitle = route.title.toLowerCase().includes(q);
      const matchDesc = route.description?.toLowerCase().includes(q);
      const matchCategory = route.category?.toLowerCase().includes(q);
      const matchKeywords = (route.keywords || []).some((kw) => kw.toLowerCase().includes(q));
      return matchTitle || matchDesc || matchCategory || matchKeywords;
    }).slice(0, 8);
  }, [query]);

  const filteredActions = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return ADMIN_QUICK_ACTIONS.filter((action) => {
      const matchTitle = action.title.toLowerCase().includes(q);
      const matchDesc = action.description?.toLowerCase().includes(q);
      const matchKeywords = (action.keywords || []).some((kw) => kw.toLowerCase().includes(q));
      return matchTitle || matchDesc || matchKeywords;
    }).slice(0, 5);
  }, [query]);

  // Aggregate results by active tab
  const aggregatedResults = useMemo(() => {
    const list = [];

    // Filter by tab
    const includePages = activeTab === 'all' || activeTab === 'pages';
    const includeActions = activeTab === 'all' || activeTab === 'actions';
    const includeBookings = activeTab === 'all' || activeTab === 'bookings';
    const includeUsers = activeTab === 'all' || activeTab === 'users';
    const includeVendors = activeTab === 'all' || activeTab === 'vendors';
    const includeCatalog = activeTab === 'all' || activeTab === 'catalog';

    if (includePages && filteredPages.length > 0) {
      filteredPages.forEach((item) => {
        list.push({
          type: 'page',
          id: `page-${item.path}`,
          title: item.title,
          subtitle: item.description,
          badge: item.category,
          path: item.path,
          icon: FiCompass
        });
      });
    }

    if (includeActions && filteredActions.length > 0) {
      filteredActions.forEach((item) => {
        list.push({
          type: 'action',
          id: `action-${item.id}`,
          title: item.title,
          subtitle: item.description,
          badge: 'Action',
          path: item.path,
          icon: FiZap
        });
      });
    }

    if (includeBookings && backendResults.bookings?.length > 0) {
      backendResults.bookings.forEach((b) => {
        const customerName = b.userId?.name || 'Customer';
        const phone = b.userId?.phone ? ` • ${b.userId.phone}` : '';
        const scheduled = b.scheduledDate ? ` • ${new Date(b.scheduledDate).toLocaleDateString()}` : '';
        const amount = b.totalAmount ? ` • ₹${b.totalAmount}` : '';
        list.push({
          type: 'booking',
          id: `booking-${b._id}`,
          title: `Booking #${b.bookingNumber} — ${b.serviceName}`,
          subtitle: `${customerName}${phone}${scheduled}${amount}`,
          badge: (b.status || 'booking').toUpperCase(),
          badgeColor:
            b.status === 'completed'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : b.status === 'cancelled'
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-blue-50 text-blue-700 border-blue-200',
          path: `/admin/bookings?search=${encodeURIComponent(b.bookingNumber)}`,
          icon: FiShoppingBag
        });
      });
    }

    if (includeUsers && backendResults.users?.length > 0) {
      backendResults.users.forEach((u) => {
        const phone = u.phone || '';
        const email = u.email || '';
        const contact = [phone, email].filter(Boolean).join(' • ');
        list.push({
          type: 'user',
          id: `user-${u._id}`,
          title: u.name || 'Unnamed Customer',
          subtitle: contact || 'Registered User',
          badge: u.isActive !== false ? 'ACTIVE' : 'INACTIVE',
          badgeColor:
            u.isActive !== false
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-gray-100 text-gray-600 border-gray-200',
          path: `/admin/users/all?search=${encodeURIComponent(u.phone || u.email || u.name)}`,
          icon: FiUsers
        });
      });
    }

    if (includeVendors && backendResults.vendors?.length > 0) {
      backendResults.vendors.forEach((v) => {
        const business = v.businessName ? ` (${v.businessName})` : '';
        const contact = [v.phone, v.email].filter(Boolean).join(' • ');
        list.push({
          type: 'vendor',
          id: `vendor-${v._id}`,
          title: `${v.name || 'Vendor'}${business}`,
          subtitle: contact || 'Service Partner',
          badge: (v.approvalStatus || 'approved').toUpperCase(),
          badgeColor:
            v.approvalStatus === 'approved'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : v.approvalStatus === 'rejected'
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-amber-50 text-amber-700 border-amber-200',
          path: `/admin/vendors/all?search=${encodeURIComponent(v.businessName || v.phone || v.name)}`,
          icon: FiBriefcase
        });
      });
    }

    if (includeCatalog && backendResults.services?.length > 0) {
      backendResults.services.forEach((s) => {
        const cat = s.categoryId?.title ? `Category: ${s.categoryId.title}` : '';
        const price = s.basePrice ? ` • ₹${s.basePrice}` : '';
        list.push({
          type: 'service',
          id: `service-${s._id}`,
          title: s.title,
          subtitle: `${cat}${price}` || 'Service Package',
          badge: 'SERVICE',
          badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          path: '/admin/user-categories/sections',
          icon: FiGrid
        });
      });
    }

    if (backendResults.tickets?.length > 0 && (activeTab === 'all' || activeTab === 'support')) {
      backendResults.tickets.forEach((t) => {
        list.push({
          type: 'ticket',
          id: `ticket-${t._id}`,
          title: `Ticket #${t.ticketNumber} — ${t.subject}`,
          subtitle: `Priority: ${(t.priority || 'medium').toUpperCase()} • Category: ${t.category || 'Support'}`,
          badge: (t.status || 'open').toUpperCase(),
          badgeColor:
            t.status === 'resolved'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-orange-50 text-orange-700 border-orange-200',
          path: `/admin/tickets?search=${encodeURIComponent(t.ticketNumber || t.subject)}`,
          icon: FiLifeBuoy
        });
      });
    }

    if (backendResults.coupons?.length > 0 && (activeTab === 'all' || activeTab === 'support')) {
      backendResults.coupons.forEach((c) => {
        list.push({
          type: 'coupon',
          id: `coupon-${c._id}`,
          title: `Coupon: ${c.code}`,
          subtitle: `${c.description || ''} • ${c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`}`,
          badge: (c.status || 'active').toUpperCase(),
          badgeColor:
            c.status === 'active'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-gray-100 text-gray-600 border-gray-200',
          path: `/admin/coupons?search=${encodeURIComponent(c.code)}`,
          icon: FiTag
        });
      });
    }

    return list;
  }, [
    activeTab,
    filteredPages,
    filteredActions,
    backendResults
  ]);

  // What the keyboard and the list operate on: live results when typing, suggestions otherwise
  const navItems = query.trim() ? aggregatedResults : SUGGESTIONS;

  // Keep the highlighted row valid when the result list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [navItems.length]);

  // Handle navigate item
  const handleSelectItem = useCallback((item) => {
    if (!item?.path) return;
    if (query.trim()) {
      saveRecentSearch(query.trim());
    }
    setIsOpen(false);
    navigate(item.path);
  }, [navigate, query, saveRecentSearch]);

  // Keyboard navigation inside modal
  const handleKeyDownModal = (e) => {
    if (navItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % navItems.length);
      scrollSelectedIntoView((selectedIndex + 1) % navItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + navItems.length) % navItems.length);
      scrollSelectedIntoView((selectedIndex - 1 + navItems.length) % navItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = navItems[selectedIndex];
      if (current) {
        handleSelectItem(current);
      }
    }
  };

  const scrollSelectedIntoView = (index) => {
    const el = document.getElementById(`search-result-item-${index}`);
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  };

  return (
    <>
      {/* ── 1. Desktop & Tablet Header Search Bar Trigger ── */}
      <div className={`relative hidden md:block ${className}`}>
        <button
          type="button"
          id="admin-global-search-trigger"
          onClick={() => setIsOpen(true)}
          className="group flex items-center justify-between w-full max-w-[280px] lg:max-w-[340px] xl:max-w-[400px] px-3.5 py-2 text-left bg-gray-50/90 hover:bg-white text-gray-500 hover:text-gray-900 rounded-xl border border-gray-200/90 hover:border-blue-400/80 shadow-2xs hover:shadow-xs transition-all duration-200 cursor-pointer"
          title="Search Admin Panel (⌘K / /)"
          aria-label="Global Search in Admin Panel"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <FiSearch className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors shrink-0" />
            <span className="text-xs font-medium text-gray-500 group-hover:text-gray-700 truncate select-none">
              Search bookings, users, pages...
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-2">
            <kbd className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold font-mono text-gray-400 group-hover:text-blue-600 bg-white group-hover:bg-blue-50 border border-gray-200 group-hover:border-blue-200 rounded-md shadow-2xs transition-colors">
              {isMac ? '⌘K' : 'Ctrl+K'}
            </kbd>
          </div>
        </button>
      </div>

      {/* ── 2. Mobile Compact Search Button (Rendered on mobile viewports) ── */}
      <button
        type="button"
        id="admin-mobile-search-trigger"
        onClick={() => setIsOpen(true)}
        className="p-2.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50/60 rounded-xl border border-gray-200/80 transition-all cursor-pointer flex md:hidden items-center justify-center"
        title="Search Admin (⌘K)"
        aria-label="Open Admin Search"
      >
        <FiSearch className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>

      {/* ── 3. Search Command Palette Modal ── */}
      {isOpen && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center p-3 sm:p-5 md:p-6 bg-slate-900/50 backdrop-blur-sm overflow-hidden overscroll-contain"
          onClick={() => setIsOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Admin Global Search Dialog"
        >
          <div
            className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden mt-6 sm:mt-[12vh] flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleKeyDownModal}
          >
            {/* Modal Search Header */}
            <div className="p-3.5 sm:p-4 border-b border-gray-100 bg-white">
              <div className="flex items-center gap-3 px-3 py-2 bg-gray-50/90 rounded-xl border border-gray-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
                <FiSearch className="w-5 h-5 text-blue-600 shrink-0" />
                <input
                  ref={inputRef}
                  id="admin-search-modal-input"
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelectedIndex(0);
                  }}
                  placeholder="Search bookings, users, vendors, catalog, settings..."
                  className="w-full bg-transparent text-sm text-gray-900 placeholder-gray-400 font-medium focus:outline-none"
                  autoComplete="off"
                  spellCheck="false"
                />

                {isSearchingBackend && (
                  <FiLoader className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                )}

                {query ? (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      setSelectedIndex(0);
                      inputRef.current?.focus();
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-md transition-colors"
                    title="Clear query"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                ) : (
                  <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-bold text-gray-400 bg-white border border-gray-200 rounded shadow-2xs">
                    ESC
                  </kbd>
                )}
              </div>

              {/* Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'pages', label: 'Pages' },
                  { id: 'bookings', label: 'Bookings' },
                  { id: 'users', label: 'Users' },
                  { id: 'vendors', label: 'Partners' },
                  { id: 'catalog', label: 'Catalog' },
                  { id: 'support', label: 'Support' },
                  { id: 'actions', label: 'Actions' }
                ].map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(tab.id);
                        setSelectedIndex(0);
                      }}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all shrink-0 cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-gray-100/80 hover:bg-gray-200/70 text-gray-600'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Body / Results */}
            <div
              ref={resultsContainerRef}
              className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 space-y-4 max-h-[58vh] scrollbar-admin"
            >
              {/* Recent searches (only before typing) */}
              {!query.trim() && (
                <>
                  {/* Recent Searches */}
                  {recentSearches.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                          <FiClock className="w-3.5 h-3.5" /> Recent Searches
                        </span>
                        <button
                          type="button"
                          onClick={clearAllRecent}
                          className="text-[11px] font-semibold text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {recentSearches.map((term) => (
                          <button
                            key={term}
                            type="button"
                            onClick={() => {
                              setQuery(term);
                              inputRef.current?.focus();
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-700 text-xs font-medium rounded-lg border border-gray-200/80 transition-colors group cursor-pointer"
                          >
                            <span>{term}</span>
                            <span
                              onClick={(e) => removeRecentSearch(term, e)}
                              className="text-gray-400 group-hover:text-red-500 hover:bg-gray-200/60 rounded p-0.5 transition-colors"
                              title="Remove"
                            >
                              <FiX className="w-3 h-3" />
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Results, or suggestions before typing; grouped under headings */}
              {navItems.length > 0 ? (
                <div className="space-y-1">
                  {navItems.map((item, index) => {
                    const group = GROUP_LABELS[item.type];
                    const showHeading = index === 0 || GROUP_LABELS[navItems[index - 1].type] !== group;
                    const Icon = item.icon || FiCompass;
                        const isSelected = index === selectedIndex;
                    return (
                      <React.Fragment key={item.id}>
                        {showHeading && (
                          <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1 pt-2 pb-1">
                            {group}
                          </h3>
                        )}
                          <div
                            key={item.id}
                            id={`search-result-item-${index}`}
                            onClick={() => handleSelectItem(item)}
                            onMouseEnter={() => setSelectedIndex(index)}
                            className={`flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-blue-50/80 border-blue-300 text-blue-900 shadow-xs'
                                : 'bg-white hover:bg-gray-50 border-gray-100 text-gray-800'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                  isSelected
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                <Icon className="w-4 h-4" />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                                    {item.title}
                                  </p>
                                  {item.badge && (
                                    <span
                                      className={`px-1.5 py-0.5 text-[9px] font-bold rounded border uppercase tracking-wider shrink-0 ${
                                        item.badgeColor ||
                                        'bg-gray-100 text-gray-600 border-gray-200'
                                      }`}
                                    >
                                      {item.badge}
                                    </span>
                                  )}
                                </div>
                                {item.subtitle && (
                                  <p className="text-[11px] text-gray-500 truncate mt-0.5">
                                    {item.subtitle}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {isSelected ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600">
                                  <span className="hidden sm:inline">Select</span>
                                  <FiCornerDownLeft className="w-3.5 h-3.5" />
                                </span>
                              ) : (
                                <FiChevronRight className="w-4 h-4 text-gray-300" />
                              )}
                            </div>
                          </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              ) : (
                query.trim() && (
                  <div className="py-12 text-center">
                    <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-3">
                      <FiSearch className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-gray-800 mb-1">
                      No results found for "{query}"
                    </h4>
                    <p className="text-xs text-gray-500 max-w-sm mx-auto">
                      Try searching by booking ID (e.g., #BK-1001), customer phone, partner name, service title, or module name.
                    </p>
                  </div>
                )
              )}
            </div>

            {/* Modal Footer with Keyboard Navigation hints */}
            <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-mono font-bold text-gray-500 shadow-2xs">
                    ↑
                  </kbd>
                  <kbd className="px-1 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-mono font-bold text-gray-500 shadow-2xs">
                    ↓
                  </kbd>
                  <span>to navigate</span>
                </span>
                <span className="hidden sm:flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-mono font-bold text-gray-500 shadow-2xs">
                    ↵
                  </kbd>
                  <span>to select</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-mono font-bold text-gray-500 shadow-2xs">
                    esc
                  </kbd>
                  <span>to close</span>
                </span>
              </div>

              {aggregatedResults.length > 0 && query.trim() && (
                <span className="font-semibold text-gray-500">
                  {aggregatedResults.length} {aggregatedResults.length === 1 ? 'result' : 'results'}
                </span>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default AdminSearchBar;
