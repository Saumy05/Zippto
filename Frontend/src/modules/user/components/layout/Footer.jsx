import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiFacebook, FiTwitter, FiInstagram, FiLinkedin, FiMail, FiPhone, FiMapPin } from 'react-icons/fi';
import { configService } from '../../../../services/configService';

const Footer = () => {
  const location = useLocation();
  
  // Show on home and dashboard pages
  const isDashboardPage = 
    location.pathname === '/user' || 
    location.pathname === '/user/' || 
    location.pathname.includes('dashboard');

  if (!isDashboardPage) {
    return null;
  }

  const currentYear = new Date().getFullYear();
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      const data = await configService.getSettings();
      if (data?.success) {
        setSettings(data.settings);
      }
    };
    fetchSettings();
  }, []);

  const supportEmail = settings?.supportEmail || settings?.companyEmail || 'Nexorahr@gmail.com';
  const supportPhone = settings?.supportPhone || settings?.companyPhone || '7879363299';
  const companyAddress = settings?.companyAddress
    ? `${settings.companyAddress}, ${settings.companyCity}, ${settings.companyState} - ${settings.companyPincode}`
    : '428-A Sarvsampanna Nagar, Indore, Madhya Pradesh - 465116';

  return (
    <footer className="hidden md:block bg-slate-50/90 border-t border-slate-200/80 pt-8 pb-24 lg:pb-12 mt-4 relative overflow-hidden">
      {/* Decorative Blur Backdrops */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl -mr-36 -mt-36 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-slate-900/5 rounded-full blur-3xl -ml-36 -mb-36 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-8">
        
        {/* Main Footer Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-7 md:gap-10">
          
          {/* Brand Info Column */}
          <div className="space-y-3.5 text-left">
            <Link to="/user" className="inline-flex items-center gap-2.5 focus:outline-none">
              <img
                src="/zippto_logo.png"
                alt="ZIPPTO"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-contain shadow-2xs"
              />
              <div className="flex flex-col text-left">
                <span className="text-base font-black tracking-tight text-[#0B132B] leading-none">
                  ZIPPTO
                </span>
                <span className="text-[9px] font-extrabold tracking-widest text-amber-500 uppercase leading-none mt-0.5">
                  HOME SERVICES
                </span>
              </div>
            </Link>

            <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
              Zippto is your one-stop destination for all home services. From electrical repairs to premium cleaning services, we bring verified experts directly to your doorstep.
            </p>

            <div className="flex items-center gap-2.5 pt-1">
              {[
                { icon: FiFacebook, href: '#', label: 'Facebook' },
                { icon: FiTwitter, href: '#', label: 'Twitter' },
                { icon: FiInstagram, href: '#', label: 'Instagram' },
                { icon: FiLinkedin, href: '#', label: 'LinkedIn' },
              ].map((soc, i) => (
                <a
                  key={i}
                  href={soc.href}
                  aria-label={soc.label}
                  className="w-8.5 h-8.5 rounded-full bg-white border border-slate-200/80 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:border-slate-400 hover:shadow-2xs active:scale-95 transition-all"
                >
                  <soc.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Links Section: 2 Columns on Mobile View */}
          <div className="grid grid-cols-2 gap-6 sm:gap-8 md:col-span-1 lg:col-span-2">
            
            {/* Column: Company */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                COMPANY
              </h3>
              <ul className="space-y-2 text-xs font-semibold text-slate-600">
                <li>
                  <Link to="/user/about-homestr" className="hover:text-slate-900 transition-colors">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link to="/user/help-support" className="hover:text-slate-900 transition-colors">
                    Help & Support
                  </Link>
                </li>
                <li>
                  <Link to="/user/cancellation-policy" className="hover:text-slate-900 transition-colors">
                    Cancellation Policy
                  </Link>
                </li>
                <li>
                  <Link to="#" className="hover:text-slate-900 transition-colors">
                    Terms & Conditions
                  </Link>
                </li>
                <li>
                  <Link to="#" className="hover:text-slate-900 transition-colors">
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column: Quick Links */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                QUICK LINKS
              </h3>
              <ul className="space-y-2 text-xs font-semibold text-slate-600">
                <li>
                  <Link to="/user/my-bookings" className="hover:text-slate-900 transition-colors">
                    My Bookings
                  </Link>
                </li>
                <li>
                  <Link to="/user/wallet" className="hover:text-slate-900 transition-colors">
                    My Wallet
                  </Link>
                </li>
                <li>
                  <Link to="/user/my-plan" className="hover:text-slate-900 transition-colors">
                    My Plan
                  </Link>
                </li>
                <li>
                  <Link to="/vendor/signup" className="hover:text-slate-900 transition-colors">
                    Register as Partner / Vendor
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Contact Us Column */}
          <div className="space-y-3 text-left">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              CONTACT US
            </h3>
            <ul className="space-y-2.5 text-xs font-semibold text-slate-600">
              <li>
                <a
                  href={`mailto:${supportEmail}`}
                  className="flex items-center gap-2.5 hover:text-slate-900 transition-colors group"
                >
                  <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 group-hover:border-slate-400">
                    <FiMail className="w-3.5 h-3.5 text-slate-700" />
                  </div>
                  <span className="break-all">{supportEmail}</span>
                </a>
              </li>

              <li>
                <a
                  href={`tel:${supportPhone.replace(/\s/g, '')}`}
                  className="flex items-center gap-2.5 hover:text-slate-900 transition-colors group"
                >
                  <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 group-hover:border-slate-400">
                    <FiPhone className="w-3.5 h-3.5 text-slate-700" />
                  </div>
                  <span>{supportPhone}</span>
                </a>
              </li>

              <li>
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                    <FiMapPin className="w-3.5 h-3.5 text-slate-700" />
                  </div>
                  <span className="text-[11px] leading-relaxed text-slate-500">
                    {companyAddress}
                  </span>
                </div>
              </li>
            </ul>
          </div>

        </div>

        {/* Divider */}
        <div className="h-px w-full bg-slate-200/80" />

        {/* Bottom Copyright & Legal Links Strip (With Clearance above Fixed BottomNav) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left pt-1 pb-4">
          <p className="text-xs text-slate-500 font-medium">
            © {currentYear} Zippto. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-slate-500 font-semibold">
            <Link to="#" className="hover:text-slate-900 transition-colors">
              Privacy
            </Link>
            <span>•</span>
            <Link to="#" className="hover:text-slate-900 transition-colors">
              Terms
            </Link>
            <span>•</span>
            <Link to="#" className="hover:text-slate-900 transition-colors">
              Cookies
            </Link>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
