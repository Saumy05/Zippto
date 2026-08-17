import React, { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiHome, FiCalendar, FiRepeat, FiShoppingCart, FiUser } from 'react-icons/fi';
import { HiHome, HiCalendar, HiRefresh, HiShoppingCart, HiUser } from 'react-icons/hi';
import { motion } from 'framer-motion';
import { useCart } from '../../../../context/CartContext';

const BottomNav = React.memo(() => {
  const navigate = useNavigate();
  const location = useLocation();
  const { cartCount } = useCart();
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  React.useEffect(() => {
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
      { id: 'scrap', label: 'Scrap', icon: FiRepeat, filledIcon: HiRefresh, path: '/user/scrap' },
      { id: 'cart', label: 'Cart', icon: FiShoppingCart, filledIcon: HiShoppingCart, path: '/user/cart', isCart: true },
      { id: 'account', label: 'Account', icon: FiUser, filledIcon: HiUser, path: '/user/account' },
    ],
    []
  );

  const getActiveTab = () => {
    const path = location.pathname;
    if (path === '/user' || path === '/user/' || path.includes('dashboard')) return 'home';
    if (path.includes('/my-bookings') || path.includes('/booking/')) return 'bookings';
    if (path.includes('/scrap')) return 'scrap';
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
      className="fixed bottom-0 left-0 right-0 z-50 w-full lg:hidden"
      style={{ WebkitBackfaceVisibility: 'hidden' }}
    >
      {/* Sleek Compact Mobile Bottom Bar */}
      <div className="w-full bg-white/95 backdrop-blur-xl border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-2 py-1">
        <div className="flex items-center justify-between max-w-md mx-auto h-12">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const IconComponent = isActive ? item.filledIcon : item.icon;

            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.path)}
                className="relative flex flex-col items-center justify-center flex-1 h-full focus:outline-none transition-all duration-200"
              >
                {/* Active Indicator Top Line */}
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute -top-1 w-6 h-0.8 rounded-full bg-[#0B132B]"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}

                <div className="relative flex flex-col items-center justify-center">
                  <motion.div
                    animate={{
                      scale: isActive ? 1.05 : 1,
                    }}
                    transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                    className={`relative p-1 rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-[#0B132B] text-amber-400 shadow-2xs'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <IconComponent className="w-4.5 h-4.5" />

                    {/* Cart Counter Badge */}
                    {item.isCart && cartCount > 0 && (
                      <span className="absolute -top-1 -right-1.5 bg-red-500 text-white font-black text-[8px] min-w-[15px] h-[15px] px-0.5 rounded-full flex items-center justify-center ring-2 ring-white shadow-2xs">
                        {cartCount > 9 ? '9+' : cartCount}
                      </span>
                    )}
                  </motion.div>

                  {/* Label */}
                  <span
                    className={`text-[9.5px] leading-none mt-0.5 tracking-tight transition-all duration-200 ${
                      isActive
                        ? 'font-extrabold text-[#0B132B]'
                        : 'font-medium text-slate-500'
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
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
