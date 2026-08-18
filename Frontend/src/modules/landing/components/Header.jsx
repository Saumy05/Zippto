import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiMenu, FiX, FiArrowRight, FiBookOpen } from 'react-icons/fi';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${
      isScrolled ? 'bg-white/95 backdrop-blur-md shadow-xs border-b border-gray-100' : 'bg-white border-b border-gray-100'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/Home" className="flex items-center gap-2">
          <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-sm">
            Z
          </div>
          <span className="text-xl font-black text-gray-900 tracking-tight">Zippto</span>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-gray-600">
          <Link to="/Home" className="hover:text-teal-600 transition-colors">Home</Link>
          <Link to="/user" className="hover:text-teal-600 transition-colors">Services</Link>
          <Link to="/blog" className="hover:text-teal-600 transition-colors flex items-center gap-1">
            <span>Blog & Guides</span>
            <span className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 text-[9px] font-extrabold uppercase">New</span>
          </Link>
          <Link to="/page/about-us" className="hover:text-teal-600 transition-colors">About Us</Link>
          <Link to="/vendor/login" className="hover:text-teal-600 transition-colors">Partner With Us</Link>
        </nav>

        {/* CTA Button */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            to="/user"
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs shadow-xs transition-all flex items-center gap-1.5"
          >
            <span>Book a Service</span>
            <FiArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Mobile Hamburger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-gray-600 hover:text-gray-900"
        >
          {mobileMenuOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 px-4 py-4 space-y-3 text-sm font-bold text-gray-700 shadow-xl">
          <Link to="/Home" onClick={() => setMobileMenuOpen(false)} className="block py-1">Home</Link>
          <Link to="/user" onClick={() => setMobileMenuOpen(false)} className="block py-1">Services</Link>
          <Link to="/blog" onClick={() => setMobileMenuOpen(false)} className="block py-1 text-teal-600">Blog & Insights</Link>
          <Link to="/page/about-us" onClick={() => setMobileMenuOpen(false)} className="block py-1">About Us</Link>
          <Link to="/vendor/login" onClick={() => setMobileMenuOpen(false)} className="block py-1">Partner Portal</Link>
          <Link
            to="/user"
            onClick={() => setMobileMenuOpen(false)}
            className="w-full mt-2 py-2.5 bg-teal-600 text-white rounded-xl text-center block text-xs font-bold shadow-xs"
          >
            Book a Service
          </Link>
        </div>
      )}
    </header>
  );
}
