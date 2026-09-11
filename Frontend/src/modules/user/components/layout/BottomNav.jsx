import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiHome, FiCalendar, FiShoppingCart, FiUser } from 'react-icons/fi';
import { HiHome, HiCalendar, HiShoppingCart, HiUser } from 'react-icons/hi';
import { motion } from 'framer-motion';
import { useCart } from '../../../../context/CartContext';

const BottomNav = React.memo(() => {
  const navigate = useNavigate();
  const location = useLocation();
  const { cartCount } = useCart();
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const checkModalState = () => {
      setIsModalOpen(
        document.body.style.overflow === 'hidden' ||
        document.body.classList.contains('modal-open')
      );
    };

    checkModalState();
    const observer = new MutationObserver(checkModalState);
    observer.observe(document.body, { attributes: true, attributeFilter: ['style', 'class'] });

    return () => observer.disconnect();
  }, []);

  const navItems = useMemo(
    () => [
      { id: 'home', label: 'Home', icon: FiHome, filledIcon: HiHome, path: '/user' },
      { id: 'bookings', label: 'Bookings', icon: FiCalendar, filledIcon: HiCalendar, path: '/user/my-bookings' },
      { id: 'cart', label: 'Cart', icon: FiShoppingCart, filledIcon: HiShoppingCart, path: '/user/cart', isCart: true },
      { id: 'account', label: 'Account', icon: FiUser, filledIcon: HiUser, path: '/user/account' },
    ],
    []
  );

  const getActiveTab = () => {
    const path = location.pathname;
    if (path === '/user' || path === '/user/' || path.includes('dashboard') || path.includes('/category/')) return 'home';
    if (path.includes('/my-bookings') || path.includes('/booking/') || path.includes('/bookings')) return 'bookings';
    if (path.includes('/cart') || path.includes('/checkout')) return 'cart';
    if (path.includes('/account') || path.includes('/settings') || path.includes('/profile')) return 'account';
    return 'home';
  };

  const activeTab = getActiveTab();

  const handleTabClick = (path) => {
    navigate(path);
  };

  if (isModalOpen) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 w-full lg:hidden safe-area-bottom"
      style={{ WebkitBackfaceVisibility: 'hidden' }}
    >
      {/* Mobile Glassmorphic Bottom Bar with DoorMeets Rust Design System */}
      <div
        className="w-full bg-white/95 backdrop-blur-[20px] border-t border-slate-100 rounded-t-[20px] px-4 py-2"
        style={{
          boxShadow: '0 -4px 30px rgba(0, 0, 0, 0.15)'
        }}
      >
        <div className="flex items-center justify-between max-w-md mx-auto">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const IconComponent = isActive ? item.filledIcon : item.icon;

            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.path)}
                className="relative focus:outline-none transition-all duration-300"
              >
                {isActive ? (
                  <motion.div
                    layoutId="activeBottomNavPill"
                    className="flex items-center gap-1.5 bg-[#B33A35] text-white px-3.5 py-2 rounded-full max-w-[135px] shadow-md shadow-[#B33A35]/25"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  >
                    <IconComponent className="w-4 h-4 text-white shrink-0" />
                    <span className="text-xs font-bold tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
                      {item.label}
                    </span>
                  </motion.div>
                ) : (
                  <div
                    className="relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95"
                    style={{
                      backgroundColor: 'rgba(179, 58, 53, 0.12)',
                      color: '#B33A35'
                    }}
                  >
                    <IconComponent className="w-5 h-5 text-[#B33A35]" />

                    {/* Cart Counter Badge */}
                    {item.isCart && cartCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white font-black text-[9px] min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center ring-2 ring-white shadow-xs">
                        {cartCount > 9 ? '9+' : cartCount}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
});

BottomNav.displayName = 'BottomNav';

export default BottomNav;
