import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { FiSearch, FiBell, FiMapPin, FiChevronDown, FiCreditCard, FiX } from 'react-icons/fi';
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
  const storedUser = React.useMemo(() => {
    try {
      const uStr = localStorage.getItem('user');
      return uStr ? JSON.parse(uStr) : null;
    } catch (e) {
      return null;
    }
  }, []);

  const userName = storedUser?.name || storedUser?.fullName || 'Alex Morgan';
  const displayCity = userLocationProp || currentCity?.name || storedUser?.city || 'Gondia, Maharashtra';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 h-15 flex items-center justify-between gap-1.5 sm:gap-3">
        
        {/* 1. BRAND LOGO + BRAND NAME (Always visible on all screens!) */}
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

        {/* 2. LOCATION PIN & DROPDOWN */}
        <div
          onClick={onLocationClick || (() => setIsCityModalOpen(true))}
          className="flex items-center gap-1 cursor-pointer group shrink min-w-0 px-1"
        >
          <FiMapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <div className="flex items-center gap-0.5 text-[10px] xs:text-[11px] sm:text-xs font-bold text-slate-900 leading-none truncate max-w-[90px] xs:max-w-[120px] sm:max-w-none">
            <span className="truncate">{displayCity}</span>
            <FiChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-700 shrink-0 transition-colors" />
          </div>
        </div>

        {/* 3. DESKTOP/TABLET NAVIGATION LINKS */}
        <nav className="hidden md:flex items-center gap-1 xl:gap-1.5">
          <NavLink
            to="/user"
            end
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-full text-xs transition-all ${
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
              `px-3 py-1.5 rounded-full text-xs transition-all ${
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
              `px-3 py-1.5 rounded-full text-xs transition-all ${
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
              `px-3 py-1.5 rounded-full text-xs transition-all flex items-center gap-1 ${
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

        {/* 4. CENTER SEARCH BAR (Desktop/Tablet) */}
        <div className="hidden md:flex flex-1 max-w-xs xl:max-w-sm items-center mx-1">
          <div className="relative w-full flex items-center">
            <FiSearch className="absolute left-3 text-slate-400 w-4 h-4 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search electrician, plumber, AC repair..."
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

        {/* 4. RIGHT ACTION ICONS: Search, Bell Notification (9+), Profile Avatar (Always visible on all screens!) */}
        <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-2.5 shrink-0">
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

          <LanguageToggle className="shrink-0 text-[11px] py-1 px-2 sm:px-2.5" />

          <Link
            to="/user/account"
            className="w-7.5 h-7.5 xs:w-8 xs:h-8 sm:w-8.5 sm:h-8.5 rounded-full bg-[#0B132B] text-white flex items-center justify-center text-xs font-black shrink-0 ring-2 ring-slate-100 hover:ring-slate-300 transition-all"
          >
            {userName.charAt(0).toUpperCase()}
          </Link>
        </div>
      </div>

      {/* Expandable Mobile Search Drawer */}
      {mobileSearchOpen && (
        <div className="md:hidden px-4 pb-3 pt-1 border-t border-slate-100 bg-slate-50 animate-fadeIn">
          <div className="relative flex items-center">
            <FiSearch className="absolute left-3 text-slate-400 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search electrician, plumber, AC service..."
              className="w-full bg-white text-slate-900 text-xs rounded-full pl-9 pr-8 py-2 border border-slate-200 focus:border-slate-900 outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 text-slate-400"
              >
                <FiX className="w-3.5 h-3.5" />
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
