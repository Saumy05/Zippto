import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiHome,
  FiUsers,
  FiBriefcase,
  FiShoppingBag,
  FiGrid,
  FiDollarSign,
  FiFileText,
  FiBell,
  FiSettings,
  FiChevronDown,
  FiX,
  FiPackage,
  FiStar,
  FiSliders,
  FiShield,
  FiUser
} from "react-icons/fi";
import dashboardService from "../../services/dashboardService";

// Categorized Visual Hierarchy Navigation Structure
const navSections = [
  {
    section: "CORE OPERATIONS",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        to: "/admin/dashboard",
        Icon: FiHome
      },
      {
        id: "bookings",
        label: "Bookings",
        to: "/admin/bookings",
        Icon: FiShoppingBag,
        badgeKey: "bookings",
        children: [
          { label: "All Bookings", to: "/admin/bookings" },
          { label: "Live Tracking", to: "/admin/bookings/tracking" },
          { label: "Notifications", to: "/admin/bookings/notifications" }
        ]
      },
      {
        id: "users",
        label: "Users & Customers",
        to: "/admin/users",
        Icon: FiUsers,
        children: [
          { label: "All Users", to: "/admin/users/all" },
          { label: "User Bookings", to: "/admin/users/bookings" },
          { label: "Transactions", to: "/admin/users/transactions" },
          { label: "User Analytics", to: "/admin/users/analytics" }
        ]
      },
      {
        id: "vendors",
        label: "Vendors & Partners",
        to: "/admin/vendors",
        Icon: FiBriefcase,
        badgeKey: "vendors",
        children: [
          { label: "All Vendors", to: "/admin/vendors/all" },
          { label: "Vendor Bookings", to: "/admin/vendors/bookings" },
          { label: "Vendor Analytics", to: "/admin/vendors/analytics" },
          { label: "Vendor Payments", to: "/admin/vendors/payments" }
        ]
      },
      {
        id: "catalog",
        label: "Service Catalog",
        to: "/admin/user-categories",
        Icon: FiGrid,
        children: [
          { label: "Home Showcase", to: "/admin/user-categories/home" },
          { label: "Manage Categories", to: "/admin/user-categories/categories" },
          { label: "Manage Brands", to: "/admin/user-categories/brands" },
          { label: "Manage Services", to: "/admin/user-categories/sections" }
        ]
      }
    ]
  },
  {
    section: "FINANCE & INTELLIGENCE",
    items: [
      {
        id: "settlements",
        label: "Settlements & Dues",
        to: "/admin/settlements",
        Icon: FiDollarSign,
        badgeKey: "settlements",
        children: [
          { label: "Pending Settlements", to: "/admin/settlements/pending", badgeChildKey: "pendingSettlements" },
          { label: "Withdrawals", to: "/admin/settlements/withdrawals", badgeChildKey: "withdrawals" },
          { label: "Vendors with Due", to: "/admin/settlements/vendors" },
          { label: "History", to: "/admin/settlements/history" }
        ]
      },
      {
        id: "payments",
        label: "Payments & Ledger",
        to: "/admin/payments",
        Icon: FiDollarSign,
        children: [
          { label: "Payment Overview", to: "/admin/payments/overview" },
          { label: "User Payments", to: "/admin/payments/users" },
          { label: "Vendor Payments", to: "/admin/payments/vendors" },
          { label: "Admin Revenue", to: "/admin/payments/revenue" },
          { label: "Payment Reports", to: "/admin/payments/reports" }
        ]
      },
      {
        id: "reports",
        label: "Analytics & Reports",
        to: "/admin/reports",
        Icon: FiFileText,
        children: [
          { label: "Revenue Report", to: "/admin/reports/revenue" },
          { label: "Booking Report", to: "/admin/reports/bookings" },
          { label: "Financial Audit", to: "/admin/payments/reports" }
        ]
      },
      {
        id: "plans",
        label: "Subscription Plans",
        to: "/admin/plans",
        Icon: FiPackage
      }
    ]
  },
  {
    section: "SYSTEM CONFIG",
    items: [
      {
        id: "notifications",
        label: "Notifications",
        to: "/admin/notifications",
        Icon: FiBell,
        children: [
          { label: "Push Notifications", to: "/admin/notifications/push" },
          { label: "Custom Broadcasts", to: "/admin/notifications/messages" },
          { label: "Notification Settings", to: "/admin/notifications/settings" }
        ]
      },
      {
        id: "reviews",
        label: "Ratings & Reviews",
        to: "/admin/reviews",
        Icon: FiStar
      },
      {
        id: "settings",
        label: "System Settings",
        to: "/admin/settings",
        Icon: FiSettings,
        children: [
          { label: "Profile Settings",         to: "/admin/settings/profile" },
          { label: "Financial Info",            to: "/admin/settings/general" },
          { label: "Customization Settings",    to: "/admin/settings/customization" },
          { label: "Contact & Support",         to: "/admin/settings/system" },
          { label: "City Management",           to: "/admin/settings/cities" },
          { label: "Languages & Localization",  to: "/admin/settings/languages" },
          { label: "Manage Admins",             to: "/admin/settings/admins" }
        ]
      }
    ]
  }
];

const AdminSidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedItems, setExpandedItems] = useState({});
  const [adminUser, setAdminUser] = useState({ name: "Admin", email: "", role: "admin" });
  const [counts, setCounts] = useState({
    bookings: 0,
    vendors: 0,
    withdrawals: 0,
    pendingSettlements: 0
  });

  // Load admin user metadata
  useEffect(() => {
    try {
      const storedData = sessionStorage.getItem("adminData") || localStorage.getItem("adminData");
      const stored = JSON.parse(storedData || "{}");
      if (stored.name || stored.email) {
        setAdminUser({
          name: stored.name || "Admin",
          email: stored.email || "",
          role: stored.role || "admin"
        });
      }
    } catch (e) {
      console.error("Failed to parse admin data:", e);
    }
  }, []);

  // Fetch live badge counters
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const response = await dashboardService.getStats();
        if (response.success && response.data?.stats) {
          const stats = response.data.stats;
          setCounts({
            bookings: stats.pendingBookings || 0,
            vendors: stats.pendingVendors || 0,
            withdrawals: stats.pendingWithdrawals || 0,
            pendingSettlements: stats.pendingSettlements || 0
          });
        }
      } catch (error) {
        console.error("Error fetching sidebar counts:", error);
      }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 25000);
    return () => clearInterval(interval);
  }, []);

  // Auto-close on mobile route changes & manage body scroll-lock
  useEffect(() => {
    if (window.innerWidth < 1024) {
      onClose();
    }
  }, [location.pathname]);

  // ESC key handler to dismiss mobile drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scroll when mobile sidebar is open
  useEffect(() => {
    if (isOpen && window.innerWidth < 1024) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Active state matching
  const isItemActive = useCallback((to, children = []) => {
    if (to === "/admin/dashboard") {
      return location.pathname === "/admin/dashboard";
    }
    if (location.pathname === to) return true;
    if (children.some(c => location.pathname === c.to || location.pathname.startsWith(c.to + "/"))) {
      return true;
    }
    return location.pathname.startsWith(to + "/");
  }, [location.pathname]);

  const isChildActive = useCallback((childTo, siblingChildren = []) => {
    if (location.pathname === childTo) return true;

    // Disambiguation: If a sibling has an exact match or longer match to the current pathname, do not match this child
    const hasMoreSpecificSibling = siblingChildren.some(sibling => {
      if (sibling.to === childTo) return false;
      if (location.pathname === sibling.to) return true;
      if (sibling.to.length > childTo.length && location.pathname.startsWith(sibling.to + "/")) return true;
      return false;
    });

    if (hasMoreSpecificSibling) return false;

    return location.pathname.startsWith(childTo + "/");
  }, [location.pathname]);

  // Auto-expand active category accordion on page load/navigation
  useEffect(() => {
    navSections.forEach(section => {
      section.items.forEach(item => {
        if (item.children && isItemActive(item.to, item.children)) {
          setExpandedItems(prev => {
            if (prev[item.id]) return prev;
            return { ...prev, [item.id]: true };
          });
        }
      });
    });
  }, [location.pathname, isItemActive]);

  // Accordions with auto-scroll reveal behavior (Strictly ONE open dropdown at a time)
  const toggleExpand = (id, e) => {
    setExpandedItems(prev => {
      const isNowExpanded = !prev[id];
      if (isNowExpanded && e?.currentTarget) {
        const containerEl = e.currentTarget.parentElement;
        setTimeout(() => {
          containerEl?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }, 120);
      }
      // Single-dropdown accordion: keep only the toggled item open, collapse all others
      return isNowExpanded ? { [id]: true } : {};
    });
  };

  const handleNavigate = (to) => {
    navigate(to);
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  // Helper for rendering badges
  const renderBadge = (key) => {
    if (key === "bookings" && counts.bookings > 0) {
      return (
        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-xs animate-pulse">
          {counts.bookings > 99 ? "99+" : counts.bookings}
        </span>
      );
    }
    if (key === "vendors" && counts.vendors > 0) {
      return (
        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-xs">
          {counts.vendors > 99 ? "99+" : counts.vendors}
        </span>
      );
    }
    if (key === "settlements") {
      const total = counts.withdrawals + counts.pendingSettlements;
      if (total > 0) {
        return (
          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-xs animate-pulse">
            {total > 99 ? "99+" : total}
          </span>
        );
      }
    }
    return null;
  };

  const renderChildBadge = (childKey) => {
    if (childKey === "pendingSettlements" && counts.pendingSettlements > 0) {
      return (
        <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
          {counts.pendingSettlements}
        </span>
      );
    }
    if (childKey === "withdrawals" && counts.withdrawals > 0) {
      return (
        <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
          {counts.withdrawals}
        </span>
      );
    }
    return null;
  };

  // Reusable Sidebar Core View
  const sidebarContent = (
    <div className="h-full w-full flex flex-col bg-slate-900 text-slate-200 select-none">
      {/* Compact SaaS Header with Live Status Dot & Role Badge */}
      <div className="px-5 py-4.5 border-b border-slate-800/80 bg-slate-900/95 backdrop-blur-md shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3.5 min-w-0">
          {/* Avatar with Live Indicator */}
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-sky-400 flex items-center justify-center text-white font-bold shadow-md shadow-blue-900/40 border border-blue-400/20">
              <FiShield className="w-5 h-5 text-white" />
            </div>
            {/* Live Green Status Dot */}
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-slate-900" />
          </div>

          {/* User & Role Details */}
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-white text-[14px] tracking-tight truncate leading-tight">
              {adminUser.name || "Administrator"}
            </h2>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded-md border border-blue-800/50">
                {adminUser.role === "super_admin" ? "Super Admin" : "Operations"}
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Close Button */}
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors lg:hidden cursor-pointer"
          aria-label="Close navigation"
        >
          <FiX className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Navigation Body (Spacious & Clean Layout) */}
      <nav className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6 custom-scrollbar scrollbar-hide overscroll-contain pb-28 lg:pb-32">
        {navSections.map((sec, secIdx) => (
          <div key={secIdx} className="space-y-1.5">
            {/* Section Categorization Header */}
            <div className="text-[10.5px] font-bold text-slate-400/90 uppercase tracking-wider px-3.5 pt-1 pb-1">
              {sec.section}
            </div>

            {/* Section Nav Items */}
            <div className="space-y-1">
              {sec.items.map((item) => {
                const hasChildren = item.children && item.children.length > 0;
                const isExpanded = !!expandedItems[item.id];
                const active = isItemActive(item.to, item.children);
                const Icon = item.Icon || FiHome;

                return (
                  <div key={item.id} className="group/item">
                    {/* Main Nav Button with Breathing Room */}
                    <button
                      type="button"
                      onClick={(e) => {
                        if (hasChildren) {
                          handleNavigate(item.to);
                          toggleExpand(item.id, e);
                        } else {
                          handleNavigate(item.to);
                        }
                      }}
                      className={`
                        w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl transition-all duration-150 text-left cursor-pointer outline-none
                        ${active
                          ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold shadow-md shadow-blue-600/25"
                          : "text-[13.5px] font-semibold text-slate-300 hover:text-white hover:bg-slate-800/70"
                        }
                      `}
                    >
                      <Icon
                        className={`w-4.5 h-4.5 shrink-0 transition-transform duration-150 group-hover/item:scale-105 ${
                          active ? "text-white" : "text-slate-400 group-hover/item:text-slate-200"
                        }`}
                      />
                      <span className="flex-1 text-[13.5px] truncate leading-normal py-0.5">
                        {item.label}
                      </span>

                      {/* Live Badge if present */}
                      {item.badgeKey && renderBadge(item.badgeKey)}

                      {/* Accordion Chevron */}
                      {hasChildren && (
                        <motion.div
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.15, ease: "easeInOut" }}
                          className="shrink-0 text-slate-400 ml-1"
                        >
                          <FiChevronDown className={`w-3.5 h-3.5 ${active ? "text-white/90" : ""}`} />
                        </motion.div>
                      )}
                    </button>

                    {/* Animated Dropdown Sub-Items with Clean Left Accent */}
                    <AnimatePresence initial={false}>
                      {hasChildren && isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.15, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="border-l border-slate-700/60 ml-5 pl-3.5 space-y-1 py-1.5 my-1">
                            {item.children.map((child, cIdx) => {
                              const childActive = isChildActive(child.to, item.children);
                              return (
                                <button
                                  key={cIdx}
                                  type="button"
                                  onClick={() => handleNavigate(child.to)}
                                  className={`
                                    w-full flex items-center justify-between px-3 py-2 rounded-lg text-[12.5px] font-medium transition-all duration-120 cursor-pointer text-left
                                    ${childActive
                                      ? "bg-blue-600/20 text-blue-300 font-bold border-l-2 border-blue-500 -ml-[15px] pl-[13px]"
                                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                                    }
                                  `}
                                >
                                  <span className="truncate leading-normal py-0.5">{child.label}</span>
                                  {child.badgeChildKey && renderChildBadge(child.badgeChildKey)}
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );

  return (
    <>
      {/* Mobile Backdrop with Blur */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[99998] lg:hidden backdrop-blur-xs"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Mobile Drawer (Spring Slide-In) */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed left-0 top-0 bottom-0 w-[272px] z-[99999] lg:hidden shadow-2xl border-r border-slate-800/80"
          >
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop Fixed Sidebar */}
      <aside
        className="hidden lg:flex fixed left-0 top-0 bottom-0 z-30 border-r border-slate-800/80"
        style={{ width: "260px" }}
      >
        {sidebarContent}
      </aside>
    </>
  );
};

export default AdminSidebar;
