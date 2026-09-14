import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../../../../context/CartContext';

// Icons — outline
import { FiHome, FiShoppingBag, FiUser } from 'react-icons/fi';
import { BsCalendar2Check } from 'react-icons/bs';

// Icons — filled
import { HiHome, HiUser } from 'react-icons/hi';
import { BsCalendar2CheckFill } from 'react-icons/bs';
import { HiShoppingBag } from 'react-icons/hi2';

const BRAND = '#B33A35';

const BottomNav = React.memo(() => {
  const navigate = useNavigate();
  const location = useLocation();
  const { cartCount } = useCart();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [prevTab, setPrevTab] = useState(null);

  // Hide when modals are open
  useEffect(() => {
    const check = () => {
      setIsModalOpen(
        document.body.style.overflow === 'hidden' ||
        document.body.classList.contains('modal-open')
      );
    };
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.body, { attributes: true, attributeFilter: ['style', 'class'] });
    return () => obs.disconnect();
  }, []);

  const navItems = useMemo(() => [
    { id: 'home',     label: 'Home',     icon: FiHome,           filledIcon: HiHome,             path: '/user'           },
    { id: 'bookings', label: 'Bookings', icon: BsCalendar2Check, filledIcon: BsCalendar2CheckFill,path: '/user/my-bookings'},
    { id: 'cart',     label: 'Cart',     icon: FiShoppingBag,    filledIcon: HiShoppingBag,      path: '/user/cart', isCart: true },
    { id: 'account',  label: 'Account',  icon: FiUser,           filledIcon: HiUser,             path: '/user/account'   },
  ], []);

  const getActiveTab = () => {
    const p = location.pathname;
    if (p === '/user' || p === '/user/' || p.includes('dashboard') || p.includes('/category/')) return 'home';
    if (
      p.includes('/my-bookings') ||
      p.includes('/bookings') ||
      p.match(/\/booking\/[a-zA-Z0-9]/) ||
      p.includes('/booking-confirmation')
    ) return 'bookings';
    if (p.includes('/cart') || p.includes('/checkout')) return 'cart';
    if (p.includes('/account') || p.includes('/settings') || p.includes('/profile') || p.includes('/update-profile')) return 'account';
    return 'home';
  };

  const activeTab = getActiveTab();

  const handleTabClick = (item) => {
    if (activeTab === item.id) return; // already here, no-op
    setPrevTab(activeTab);
    navigate(item.path);
  };

  if (isModalOpen) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 w-full lg:hidden"
      style={{ WebkitBackfaceVisibility: 'hidden' }}
    >
      {/* Safe-area spacer for iOS */}
      <div
        className="w-full"
        style={{
          background: 'linear-gradient(to top, rgba(255,255,255,1) 60%, rgba(255,255,255,0))',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Floating island pill */}
        <div className="flex justify-center px-3 pb-2 pt-0.5">
          <div
            className="flex items-center justify-around w-full max-w-[320px] sm:max-w-xs rounded-full px-1.5 py-1"
            style={{
              background: 'rgba(255,255,255,0.94)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.10)',
            }}
          >
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = isActive ? item.filledIcon : item.icon;

              return (
                <button
                  key={item.id}
                  id={`bottom-nav-${item.id}`}
                  onClick={() => handleTabClick(item)}
                  className="relative flex flex-col items-center justify-center focus:outline-none select-none cursor-pointer"
                  style={{ minWidth: 52, minHeight: 38 }}
                >
                  {/* Active background pill */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        layoutId="nav-active-bg"
                        className="absolute inset-x-0 rounded-full"
                        style={{
                          insetInline: '-2px',
                          top: 1,
                          bottom: 1,
                          background: `linear-gradient(135deg, ${BRAND}15, ${BRAND}0a)`,
                          border: `1px solid ${BRAND}1e`,
                        }}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                      />
                    )}
                  </AnimatePresence>

                  {/* Icon */}
                  <motion.div
                    animate={{
                      scale: isActive ? 1.08 : 1,
                      y: isActive ? -0.5 : 0,
                    }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="relative z-10"
                  >
                    <Icon
                      className="transition-none"
                      style={{
                        width: 18,
                        height: 18,
                        color: isActive ? BRAND : '#94a3b8',
                      }}
                    />

                    {/* Cart badge */}
                    {item.isCart && cartCount > 0 && (
                      <motion.span
                        key={cartCount}
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="absolute -top-1.5 -right-1.5 text-white font-black flex items-center justify-center rounded-full ring-2 ring-white"
                        style={{
                          background: BRAND,
                          fontSize: 8.5,
                          minWidth: 14,
                          height: 14,
                          paddingInline: 2,
                        }}
                      >
                        {cartCount > 9 ? '9+' : cartCount}
                      </motion.span>
                    )}
                  </motion.div>

                  {/* Label */}
                  <motion.span
                    animate={{
                      color: isActive ? BRAND : '#94a3b8',
                      fontWeight: isActive ? 700 : 500,
                    }}
                    transition={{ duration: 0.15 }}
                    className="relative z-10 mt-0.5 text-[9px] leading-tight tracking-tight font-medium"
                  >
                    {item.label}
                  </motion.span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
});

BottomNav.displayName = 'BottomNav';
export default BottomNav;
