import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { FiSearch, FiBell, FiMapPin, FiChevronDown, FiCreditCard, FiX, FiUser } from 'react-icons/fi';
import { useCity } from '../../../../context/CityContext';
import { useCart } from '../../../../context/CartContext';
import { LanguageToggle } from '../../../../components/common/LanguageSelectorModal';
import CitySelectorModal from '../common/CitySelectorModal';

const Header = ({ location: userLocationProp, onLocationClick }) => {
  const { currentCity } = useCity();
  const { cartCount } = useCart();
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Logged-in user info retrieval
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const storedUser = React.useMemo(() => {
    try {
      const uStr = localStorage.getItem('userData') || localStorage.getItem('user');
      return uStr ? JSON.parse(uStr) : null;
    } catch (e) {
      return null;
    }
  }, [token]);

  const isLoggedIn = Boolean(token && storedUser);
  const userName = storedUser?.name || storedUser?.fullName || '';
  const displayCity = userLocationProp || currentCity?.name || storedUser?.city || 'Gondia, Maharashtra';
  const walletBalance = storedUser?.wallet?.balance ?? storedUser?.walletBalance ?? 0;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* 1. BRAND LOGO + BRAND NAME */}
        <Link to="/user" className="flex items-center gap-2 shrink-0 focus:outline-none group">
          <img
            src="/zippto_logo.png"
            alt="ZIPPTO"
            className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl object-contain shadow-xs transition-transform group-hover:scale-105"
          />
          <div className="flex flex-col text-left shrink-0">
            <span className="text-sm sm:text-base font-black tracking-tight text-[#1F2937] leading-none">
              ZIPPTO
            </span>
            <span className="text-[8px] sm:text-[9.5px] font-extrabold tracking-wider text-[#B33A35] uppercase leading-none mt-0.5 whitespace-nowrap">
              HOME SERVICES
            </span>
          </div>
        </Link>

        {/* 2. LOCATION PIN & DROPDOWN */}
        <div
          onClick={onLocationClick || (() => setIsCityModalOpen(true))}
          className="flex items-center gap-1.5 cursor-pointer group shrink min-w-0 px-2 py-1.5 rounded-full hover:bg-gray-50 transition-colors"
        >
          <FiMapPin className="w-4 h-4 text-[#B33A35] shrink-0" />
          <div className="flex items-center gap-1 text-[11px] sm:text-xs font-bold text-gray-800 leading-none truncate max-w-[100px] xs:max-w-[130px] sm:max-w-none">
            <span className="truncate">{displayCity}</span>
            <FiChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-700 shrink-0 transition-colors" />
          </div>
        </div>

        {/* 3. DESKTOP/TABLET NAVIGATION LINKS */}
        <nav className="hidden md:flex items-center gap-1.5">
          <NavLink
            to="/user"
            end
            className={({ isActive }) =>
              `px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                isActive
                  ? 'font-bold text-white bg-[#B33A35] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`
            }
          >
            Home
          </NavLink>
          <NavLink
            to="/user/my-bookings"
            className={({ isActive }) =>
              `px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                isActive
                  ? 'font-bold text-white bg-[#B33A35] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`
            }
          >
            Bookings
          </NavLink>
          <NavLink
            to="/user/my-plan"
            className={({ isActive }) =>
              `px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                isActive
                  ? 'font-bold text-white bg-[#B33A35] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`
            }
          >
            My Plan
          </NavLink>
          <NavLink
            to="/user/cart"
            className={({ isActive }) =>
              `px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                isActive
                  ? 'font-bold text-white bg-[#B33A35] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`
            }
          >
            Cart
            {cartCount > 0 && (
              <span className="min-w-[16px] h-[16px] bg-red-500 text-white rounded-full text-[9px] font-black flex items-center justify-center px-1">
                {cartCount}
              </span>
            )}
          </NavLink>
        </nav>

        {/* 4. CENTER SEARCH BAR (Desktop/Tablet) - max-w-4xl */}
        <div className="hidden md:flex flex-1 max-w-4xl items-center mx-2">
          <div className="relative w-full flex items-center">
            <FiSearch className="absolute left-3.5 text-gray-400 w-4 h-4 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search electrician, plumber, AC repair, cleaning..."
              className="w-full bg-gray-50 text-gray-900 text-xs font-medium rounded-full pl-10 pr-9 py-2.5 border border-gray-200 focus:bg-white focus:border-[#B33A35] focus:ring-1 focus:ring-[#B33A35] outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 5. RIGHT ACTION ICONS: Language, Search, Wallet, Notifications, Avatar / Login */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <LanguageToggle className="shrink-0 text-[11px] py-1 px-2.5" />

          <button
            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
            className="md:hidden w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-100/90 hover:bg-gray-200 border border-gray-200 flex items-center justify-center text-gray-700 transition-colors"
            aria-label="Search"
          >
            <FiSearch className="w-4 h-4" />
          </button>

          {isLoggedIn ? (
            <>
              <Link
                to="/user/wallet"
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200/80 border border-gray-200 text-xs font-bold text-gray-800 transition-colors"
              >
                <FiCreditCard className="w-3.5 h-3.5 text-[#B33A35]" />
                <span>₹{walletBalance.toLocaleString('en-IN')}</span>
              </Link>

              <Link
                to="/user/notifications"
                className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-100/90 hover:bg-gray-200 border border-gray-200 flex items-center justify-center text-gray-700 transition-colors shrink-0"
                aria-label="Notifications"
              >
                <FiBell className="w-4 h-4" />
              </Link>

              <Link
                to="/user/account"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#B33A35] text-white flex items-center justify-center text-xs font-black shrink-0 ring-2 ring-gray-100 hover:ring-[#B33A35]/30 transition-all shadow-xs"
                title={userName || 'Account'}
              >
                {userName ? userName.charAt(0).toUpperCase() : 'U'}
              </Link>
            </>
          ) : (
            <Link
              to="/user/login"
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full bg-[#B33A35] hover:bg-[#9E2E2A] text-white text-xs font-bold transition-all shadow-xs active:scale-95"
            >
              <FiUser className="w-3.5 h-3.5 text-white" />
              <span>Login</span>
            </Link>
          )}
        </div>
      </div>

      {/* Expandable Mobile Search Drawer */}
      {mobileSearchOpen && (
        <div className="md:hidden px-4 pb-3 pt-1 border-t border-gray-100 bg-gray-50">
          <div className="relative flex items-center">
            <FiSearch className="absolute left-3.5 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search electrician, plumber, AC service..."
              className="w-full bg-white text-gray-900 text-xs rounded-full pl-10 pr-9 py-2.5 border border-gray-200 focus:border-[#B33A35] focus:ring-1 focus:ring-[#B33A35] outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 text-gray-400"
              >
                <FiX className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      <CitySelectorModal
        isOpen={isCityModalOpen}
        onClose={() => setIsCityModalOpen(false)}
      />
    </header>
  );
};

export default Header;
