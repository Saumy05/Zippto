import React from 'react';
import { Link } from 'react-router-dom';
import { FiShield, FiPhone, FiMail, FiMapPin } from 'react-icons/fi';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 text-xs font-sans border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-teal-500 rounded-xl flex items-center justify-center text-white font-black text-base shadow-sm">
                Z
              </div>
              <span className="text-xl font-black text-white tracking-tight">Zippto</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              India's premier on-demand home & facility service network. Certified experts, transparent pricing, and 30-day warranty on every job.
            </p>
          </div>

          {/* Popular Services */}
          <div className="space-y-2">
            <h4 className="font-extrabold text-white text-xs uppercase tracking-wider">Top Services</h4>
            <ul className="space-y-1.5">
              <li><Link to="/user" className="hover:text-teal-400 transition-colors">AC Deep Jet Cleaning</Link></li>
              <li><Link to="/user" className="hover:text-teal-400 transition-colors">Bathroom & Kitchen Cleaning</Link></li>
              <li><Link to="/user" className="hover:text-teal-400 transition-colors">Electricians & Plumbers</Link></li>
              <li><Link to="/user" className="hover:text-teal-400 transition-colors">Salon at Home</Link></li>
              <li><Link to="/user" className="hover:text-teal-400 transition-colors">Appliance Repair</Link></li>
            </ul>
          </div>

          {/* Knowledge & Resources */}
          <div className="space-y-2">
            <h4 className="font-extrabold text-white text-xs uppercase tracking-wider">Knowledge & Insights</h4>
            <ul className="space-y-1.5">
              <li><Link to="/blog" className="hover:text-teal-400 transition-colors">Home Care Blog</Link></li>
              <li><Link to="/blog?category=Appliance%20Care" className="hover:text-teal-400 transition-colors">Appliance Guides</Link></li>
              <li><Link to="/blog?category=Home%20Cleaning" className="hover:text-teal-400 transition-colors">Cleaning Checklists</Link></li>
              <li><Link to="/vendor/login" className="hover:text-teal-400 transition-colors">Partner Portal</Link></li>
            </ul>
          </div>

          {/* Legal & Policy Pages (Dynamic) */}
          <div className="space-y-2">
            <h4 className="font-extrabold text-white text-xs uppercase tracking-wider">Legal & Company</h4>
            <ul className="space-y-1.5">
              <li><Link to="/page/about-us" className="hover:text-teal-400 transition-colors">About Us</Link></li>
              <li><Link to="/page/terms-of-service" className="hover:text-teal-400 transition-colors">Terms of Service</Link></li>
              <li><Link to="/page/privacy-policy" className="hover:text-teal-400 transition-colors">Privacy Policy</Link></li>
              <li><Link to="/page/cancellation-policy" className="hover:text-teal-400 transition-colors">Cancellation & Refund Policy</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>© {new Date().getFullYear()} Zippto Technologies Pvt. Ltd. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-slate-400">
              <FiShield className="text-teal-400" /> 100% Safe & Verified Experts
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
