import React from 'react';
import { Link } from 'react-router-dom';
import { FiHelpCircle } from 'react-icons/fi';
import Logo from '../common/Logo';
import { useSettings } from '../../context/SettingsContext';

/**
 * Fixed header shown on the login / OTP / registration screens.
 */
export const AuthHeader = () => (
  <header className="fixed top-0 inset-x-0 z-30 h-14 bg-white/90 backdrop-blur-md border-b border-gray-100 flex items-center justify-center">
    <div className="flex items-center gap-2">
      <Logo className="h-8 w-8" />
      <span className="text-xl font-extrabold tracking-tight text-[#0B132B]">Zippto</span>
    </div>
  </header>
);

/**
 * Footer with Privacy, Terms and Support links for the login / OTP / registration screens.
 */
export const AuthFooter = () => {
  const { settings } = useSettings();
  const supportEmail = settings?.supportEmail || 'support@zippto.in';

  return (
    <footer className="relative z-10 py-3 px-4 text-center text-xs text-gray-500">
      <div className="flex items-center justify-center gap-4 flex-wrap">
        <Link to="/page/privacy-policy" className="hover:text-[#347989] transition-colors">Privacy Policy</Link>
        <span className="text-gray-300">|</span>
        <Link to="/page/terms-of-service" className="hover:text-[#347989] transition-colors">Terms &amp; Conditions</Link>
        <span className="text-gray-300">|</span>
        <a href={`mailto:${supportEmail}`} className="inline-flex items-center gap-1 hover:text-[#347989] transition-colors">
          <FiHelpCircle className="w-3.5 h-3.5" /> Support
        </a>
      </div>
      <p className="mt-1 text-[11px] text-gray-400">&copy; {new Date().getFullYear()} Zippto. All rights reserved.</p>
    </footer>
  );
};
