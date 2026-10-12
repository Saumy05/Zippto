// Comprehensive Route Metadata Hierarchy and Search Index for Admin Portal
export const ROUTE_DEFINITIONS = [
  // ── Bookings ─────────────────────────────────────────────────────────────
  {
    path: '/admin/bookings/tracking',
    title: 'Live Order Tracking',
    description: 'Real-time dispatch, lifecycle progression, and live order status',
    category: 'Bookings',
    categoryPath: '/admin/bookings',
    keywords: ['live', 'map', 'tracking', 'dispatch', 'gps', 'driver', 'vendor location', 'orders']
  },
  {
    path: '/admin/bookings/notifications',
    title: 'Order Notifications',
    description: 'Real-time booking alerts, broadcasts, and system dispatches',
    category: 'Bookings',
    categoryPath: '/admin/bookings',
    keywords: ['alerts', 'broadcasts', 'order notification', 'sound', 'messages']
  },
  {
    path: '/admin/bookings',
    title: 'Bookings Management',
    description: 'Monitor, assign, filter, and audit all customer service requests',
    category: 'Core Operations',
    categoryPath: '/admin/bookings',
    keywords: ['bookings', 'orders', 'services', 'schedule', 'appointments', 'jobs', 'status']
  },

  // ── Dashboard ────────────────────────────────────────────────────────────
  {
    path: '/admin/dashboard',
    title: 'Executive Dashboard',
    description: 'High-level platform metrics, revenue trends, and operational health',
    category: 'Core Operations',
    categoryPath: '/admin/dashboard',
    keywords: ['home', 'dashboard', 'overview', 'metrics', 'stats', 'analytics', 'charts', 'revenue']
  },

  // ── Users & Customers ───────────────────────────────────────────────────
  {
    path: '/admin/users/all',
    title: 'Customer Directory',
    description: 'Browse, inspect, and manage registered platform customers',
    category: 'Users & Customers',
    categoryPath: '/admin/users/all',
    keywords: ['users', 'customers', 'clients', 'accounts', 'profiles', 'directory', 'people']
  },
  {
    path: '/admin/users/bookings',
    title: 'Customer Bookings',
    description: 'Audit service history and user booking behavior',
    category: 'Users & Customers',
    categoryPath: '/admin/users/all',
    keywords: ['customer orders', 'user bookings', 'order history', 'user jobs']
  },
  {
    path: '/admin/users/transactions',
    title: 'Customer Transactions',
    description: 'Track customer wallet debits, payments, and refunds',
    category: 'Users & Customers',
    categoryPath: '/admin/users/all',
    keywords: ['transactions', 'wallet', 'refunds', 'user payments', 'credits', 'debits']
  },
  {
    path: '/admin/users/analytics',
    title: 'Customer Analytics',
    description: 'Cohort insights, user retention, and order frequency',
    category: 'Users & Customers',
    categoryPath: '/admin/users/all',
    keywords: ['retention', 'cohort', 'growth', 'repeat users', 'customer analytics']
  },
  {
    path: '/admin/users',
    title: 'Users & Customers',
    description: 'Manage platform customers and their activity',
    category: 'Core Operations',
    categoryPath: '/admin/users/all',
    keywords: ['users', 'customers', 'client base']
  },

  // ── Vendors & Partners ───────────────────────────────────────────────────
  {
    path: '/admin/vendors/all',
    title: 'Service Partners Directory',
    description: 'Manage registered vendors, approval statuses, and KYC verifications',
    category: 'Vendors & Partners',
    categoryPath: '/admin/vendors/all',
    keywords: ['vendors', 'partners', 'technicians', 'service providers', 'kyc', 'verification', 'approval']
  },
  {
    path: '/admin/vendors/bookings',
    title: 'Partner Bookings',
    description: 'Monitor vendor order fulfilment rates and assigned service jobs',
    category: 'Vendors & Partners',
    categoryPath: '/admin/vendors/all',
    keywords: ['partner jobs', 'vendor orders', 'fulfilment rate', 'assigned jobs']
  },
  {
    path: '/admin/vendors/analytics',
    title: 'Partner Analytics',
    description: 'Performance scores, response latency, and acceptance rates',
    category: 'Vendors & Partners',
    categoryPath: '/admin/vendors/all',
    keywords: ['partner metrics', 'vendor ratings', 'performance', 'acceptance rate']
  },
  {
    path: '/admin/vendors/payments',
    title: 'Partner Earnings & Payouts',
    description: 'Track vendor net earnings, dues, and payout summaries',
    category: 'Vendors & Partners',
    categoryPath: '/admin/vendors/all',
    keywords: ['vendor earnings', 'payouts', 'partner dues', 'net income']
  },
  {
    path: '/admin/vendors',
    title: 'Vendors & Partners',
    description: 'Manage partner registrations, onboarding, and performance',
    category: 'Core Operations',
    categoryPath: '/admin/vendors/all',
    keywords: ['vendors', 'partners', 'mechanics', 'service pros']
  },

  // ── Service Catalog ──────────────────────────────────────────────────────
  {
    path: '/admin/user-categories/home',
    title: 'Home Showcase Layout',
    description: 'Configure featured service categories, hero banners, and home sections',
    category: 'Service Catalog',
    categoryPath: '/admin/user-categories',
    keywords: ['home showcase', 'featured services', 'hero banners', 'homepage layout']
  },
  {
    path: '/admin/user-categories/categories',
    title: 'Service Categories',
    description: 'Manage primary service categories, taxonomy, and category icons',
    category: 'Service Catalog',
    categoryPath: '/admin/user-categories',
    keywords: ['categories', 'catalog', 'service taxonomy', 'icons', 'add category']
  },
  {
    path: '/admin/user-categories/brands',
    title: 'Vehicle & Appliance Brands',
    description: 'Manage brands, models, and appliance manufacturer hierarchies',
    category: 'Service Catalog',
    categoryPath: '/admin/user-categories',
    keywords: ['brands', 'makes', 'models', 'manufacturers', 'vehicles']
  },
  {
    path: '/admin/user-categories/sections',
    title: 'Service Pricing & Packages',
    description: 'Configure granular service packages, base prices, and labour charges',
    category: 'Service Catalog',
    categoryPath: '/admin/user-categories',
    keywords: ['services', 'pricing', 'packages', 'labour', 'hourly rate', 'add service']
  },
  {
    path: '/admin/user-categories/vendor-parts',
    title: 'Spare Parts & Consumables Catalog',
    description: 'Manage repair spare parts inventory, vendor pricing, and margin caps',
    category: 'Service Catalog',
    categoryPath: '/admin/user-categories',
    keywords: ['parts', 'spare parts', 'consumables', 'components', 'pricing']
  },
  {
    path: '/admin/user-categories',
    title: 'Service Catalog & Categories',
    description: 'Manage root categories, sub-services, rates, and catalog hierarchy',
    category: 'Service Catalog',
    categoryPath: '/admin/user-categories',
    keywords: ['catalog', 'services', 'categories', 'pricing']
  },

  // ── Settlements & Dues ───────────────────────────────────────────────────
  {
    path: '/admin/settlements/pending',
    title: 'Pending Settlements',
    description: 'Review and approve vendor cash collections and platform commissions',
    category: 'Settlements & Dues',
    categoryPath: '/admin/settlements/pending',
    keywords: ['settlements', 'pending', 'cash collection', 'commission', 'payout approval']
  },
  {
    path: '/admin/settlements/withdrawals',
    title: 'Withdrawal Requests',
    description: 'Process partner wallet withdrawal requests to bank accounts',
    category: 'Settlements & Dues',
    categoryPath: '/admin/settlements/pending',
    keywords: ['withdrawals', 'bank transfer', 'payout request', 'wallet payout']
  },
  {
    path: '/admin/settlements/vendors',
    title: 'Partner Balances & Dues',
    description: 'Monitor partner ledger balances, credit limits, and outstanding dues',
    category: 'Settlements & Dues',
    categoryPath: '/admin/settlements/pending',
    keywords: ['vendor dues', 'balances', 'credit limit', 'ledger', 'outstanding']
  },
  {
    path: '/admin/settlements/history',
    title: 'Settlement History',
    description: 'Immutable historical records of completed settlements and payouts',
    category: 'Settlements & Dues',
    categoryPath: '/admin/settlements/pending',
    keywords: ['settlement logs', 'history', 'completed payouts', 'past settlements']
  },
  {
    path: '/admin/settlements',
    title: 'Settlements & Payouts',
    description: 'Manage partner finances, commission deductions, and settlements',
    category: 'Finance & Intelligence',
    categoryPath: '/admin/settlements/pending',
    keywords: ['settlements', 'dues', 'finances', 'payouts']
  },

  // ── Payments & Ledger ────────────────────────────────────────────────────
  {
    path: '/admin/payments/users',
    title: 'Customer Payments',
    description: 'Detailed records of online gateway payments and cash transactions',
    category: 'Payments & Ledger',
    categoryPath: '/admin/payments/users',
    keywords: ['customer payments', 'razorpay', 'cash payments', 'gateway transactions']
  },
  {
    path: '/admin/payments/vendors',
    title: 'Vendor Settlements Ledger',
    description: 'Settlement logs and partner commission distributions',
    category: 'Payments & Ledger',
    categoryPath: '/admin/payments/users',
    keywords: ['ledger', 'vendor ledger', 'commission distributions', 'partner credits']
  },
  {
    path: '/admin/payments/revenue',
    title: 'Platform Net Revenue',
    description: 'Track gross marketplace volume, commission cuts, and net profits',
    category: 'Payments & Ledger',
    categoryPath: '/admin/payments/users',
    keywords: ['revenue', 'profit', 'gmv', 'gross volume', 'platform fee', 'earnings']
  },
  {
    path: '/admin/payments/reports',
    title: 'Financial Statements & Reports',
    description: 'Download reconciliation reports, GST logs, and audit trails',
    category: 'Payments & Ledger',
    categoryPath: '/admin/payments/users',
    keywords: ['financial statements', 'tax reports', 'gst logs', 'audit trail', 'excel download']
  },
  {
    path: '/admin/payments',
    title: 'Payments & Ledger',
    description: 'Audit all financial flows, transaction logs, and platform revenue',
    category: 'Finance & Intelligence',
    categoryPath: '/admin/payments/users',
    keywords: ['payments', 'ledger', 'money', 'transactions', 'revenue']
  },

  // ── Analytics & Intelligence ─────────────────────────────────────────────
  {
    path: '/admin/reports',
    title: 'Analytics & Reports',
    description: 'Comprehensive business intelligence, growth trends, and cohort analysis',
    category: 'Finance & Intelligence',
    categoryPath: '/admin/reports',
    keywords: ['reports', 'analytics', 'charts', 'growth', 'kpi', 'sales', 'conversion']
  },
  {
    path: '/admin/plans',
    title: 'Subscription Plans',
    description: 'Configure and manage consumer membership & discount plans',
    category: 'Finance & Intelligence',
    categoryPath: '/admin/plans',
    keywords: ['subscription', 'plans', 'membership', 'vip pass', 'discounts']
  },
  {
    path: '/admin/coupons',
    title: 'Coupons & Promo Codes',
    description: 'Create and manage discount promo codes for customers',
    category: 'System Config',
    categoryPath: '/admin/coupons',
    keywords: ['coupons', 'promo code', 'discount', 'voucher', 'offer', 'promotions', 'deal']
  },
  {
    path: '/admin/tickets',
    title: 'Support Tickets & Disputes',
    description: 'Resolve customer issues, complaint escalations, and refund disputes',
    category: 'System Config',
    categoryPath: '/admin/tickets',
    keywords: ['support', 'tickets', 'disputes', 'complaints', 'refunds', 'helpdesk', 'issues']
  },
  {
    path: '/admin/reviews',
    title: 'Customer & Partner Reviews',
    description: 'Audit customer feedback, ratings, and moderate public reviews',
    category: 'System Config',
    categoryPath: '/admin/reviews',
    keywords: ['reviews', 'ratings', 'feedback', 'stars', 'moderation', 'testimonials']
  },
  {
    path: '/admin/cms',
    title: 'CMS & Landing Content',
    description: 'Manage promotional banners, blog posts, terms, and homepage content',
    category: 'System Config',
    categoryPath: '/admin/cms',
    keywords: ['cms', 'blogs', 'articles', 'content', 'banners', 'legal', 'pages']
  },

  // ── Notifications & Broadcasts ───────────────────────────────────────────
  {
    path: '/admin/notifications/push',
    title: 'Push Broadcast Composer',
    description: 'Broadcast instant targeted push notifications to users or partners',
    category: 'Notifications',
    categoryPath: '/admin/notifications/push',
    keywords: ['broadcast', 'push notification', 'composer', 'fcm', 'marketing messages']
  },
  {
    path: '/admin/notifications/messages',
    title: 'In-App Messages',
    description: 'Compose and deliver rich in-app banners and inbox announcements',
    category: 'Notifications',
    categoryPath: '/admin/notifications/push',
    keywords: ['in-app', 'banners', 'announcements', 'popup alerts']
  },
  {
    path: '/admin/notifications/settings',
    title: 'Notification Triggers',
    description: 'Configure automated event triggers, FCM templates, and alert thresholds',
    category: 'Notifications',
    categoryPath: '/admin/notifications/push',
    keywords: ['triggers', 'fcm settings', 'templates', 'sms triggers']
  },
  {
    path: '/admin/notifications',
    title: 'Notifications & Broadcasts',
    description: 'Manage multichannel notification broadcasts and automated triggers',
    category: 'System Config',
    categoryPath: '/admin/notifications/push',
    keywords: ['notifications', 'alerts', 'broadcasts']
  },

  // ── System Settings ──────────────────────────────────────────────────────
  {
    path: '/admin/settings/general',
    title: 'General & Business Settings',
    description: 'Company profile, support helpline, email configs, and company info',
    category: 'System Settings',
    categoryPath: '/admin/settings',
    keywords: ['business settings', 'company profile', 'contact email', 'helpline', 'logo']
  },
  {
    path: '/admin/settings/features',
    title: 'Feature Toggles & Controls',
    description: 'Dynamically toggle Chat, Referrals, Push Notifications, and B2B mode',
    category: 'System Settings',
    categoryPath: '/admin/settings',
    keywords: ['feature flags', 'toggles', 'chat enable', 'referrals', 'b2b mode']
  },
  {
    path: '/admin/settings/tax',
    title: 'GST & Financial Fees',
    description: 'Configure GST percentage, inspection visit charges, and cancellation penalty',
    category: 'System Settings',
    categoryPath: '/admin/settings',
    keywords: ['gst', 'tax', 'inspection fee', 'cancellation fee', 'tax percentage']
  },
  {
    path: '/admin/settings/booking',
    title: 'Booking & Dispatch Controls',
    description: 'Configure search radius, partner auto-dispatch, and acceptance timers',
    category: 'System Settings',
    categoryPath: '/admin/settings',
    keywords: ['radius', 'dispatch controls', 'timer', 'auto assign', 'booking settings']
  },
  {
    path: '/admin/settings/notifications',
    title: 'System Notification Preferences',
    description: 'Configure SMS, Email, and Push notification defaults across the platform',
    category: 'System Settings',
    categoryPath: '/admin/settings',
    keywords: ['notification preferences', 'sms defaults', 'email smtp']
  },
  {
    path: '/admin/settings/localization',
    title: 'Cities & Regional Settings',
    description: 'Manage active operating cities, supported languages, and currency formatting',
    category: 'System Settings',
    categoryPath: '/admin/settings',
    keywords: ['cities', 'localization', 'languages', 'operating cities', 'currency']
  },
  {
    path: '/admin/settings/sms',
    title: 'SMS & OTP Gateways',
    description: 'Configure SMS Hub API credentials, DLT templates, and OTP bypass flags',
    category: 'System Settings',
    categoryPath: '/admin/settings',
    keywords: ['sms gateway', 'otp', 'dlt templates', 'sms hub', 'fast2sms']
  },
  {
    path: '/admin/settings',
    title: 'System Settings',
    description: 'Central platform controls, financial parameters, and business logic',
    category: 'System Config',
    categoryPath: '/admin/settings',
    keywords: ['settings', 'configuration', 'system', 'preferences']
  },
  {
    path: '/admin/customization-settings',
    title: 'Platform Customization',
    description: 'Brand themes, visual layout customization, and user preferences',
    category: 'System Config',
    categoryPath: '/admin/customization-settings',
    keywords: ['customization', 'branding', 'themes', 'colors', 'visual layout']
  }
];

export const ADMIN_QUICK_ACTIONS = [
  {
    id: 'create-coupon',
    title: 'Create New Discount Coupon',
    description: 'Configure flat or percentage discount promo codes',
    path: '/admin/coupons',
    category: 'Quick Actions',
    actionType: 'create',
    keywords: ['new coupon', 'create promo', 'add discount', 'offer']
  },
  {
    id: 'broadcast-push',
    title: 'Broadcast Push Notification',
    description: 'Send instant marketing or system push broadcast to users/vendors',
    path: '/admin/notifications/push',
    category: 'Quick Actions',
    actionType: 'broadcast',
    keywords: ['broadcast notification', 'send push', 'blast message', 'fcm']
  },
  {
    id: 'review-settlements',
    title: 'Review Pending Partner Settlements',
    description: 'Audit cash collected and approve partner bank payout transfers',
    path: '/admin/settlements/pending',
    category: 'Quick Actions',
    actionType: 'finance',
    keywords: ['approve settlement', 'vendor payout', 'pending dues', 'withdrawals']
  },
  {
    id: 'live-dispatch',
    title: 'Open Live Order Dispatch & Tracking',
    description: 'Track partner GPS locations and live booking lifecycle stages',
    path: '/admin/bookings/tracking',
    category: 'Quick Actions',
    actionType: 'dispatch',
    keywords: ['live tracking', 'gps monitor', 'active orders', 'dispatch board']
  },
  {
    id: 'manage-catalog',
    title: 'Add / Edit Service Categories',
    description: 'Configure service hierarchy, base prices, and category icons',
    path: '/admin/user-categories/categories',
    category: 'Quick Actions',
    actionType: 'catalog',
    keywords: ['add category', 'edit services', 'new service package', 'catalog']
  },
  {
    id: 'support-tickets',
    title: 'Resolve Support Tickets & Disputes',
    description: 'Inspect user refund disputes and assign support priorities',
    path: '/admin/tickets',
    category: 'Quick Actions',
    actionType: 'support',
    keywords: ['resolve ticket', 'customer dispute', 'refund request', 'complaint']
  }
];
