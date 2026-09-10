import React from 'react';
import { toast } from 'react-hot-toast';

const CTABanner = ({ onActionClick }) => {
  return (
    <section className="w-full min-h-[220px] md:min-h-[280px] rounded-md relative overflow-hidden flex items-center p-4 sm:p-6 border border-[#E5E7EB] shadow-xs mb-6">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url('/cat_3d/banner_tech.jpg')` }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-transparent" />
      <div className="relative z-10 max-w-md space-y-2.5 text-left">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-[#B33A35] flex items-center justify-center text-white text-[10px] font-black shadow-xs">
            Z
          </div>
          <span className="font-extrabold text-[11px] tracking-wider text-white uppercase">
            ZIPPTO SERVICES
          </span>
        </div>

        <h2 className="text-lg sm:text-2xl font-black text-white leading-snug tracking-tight font-heading">
          All Your Home Needs, <br />
          One <span className="text-[#D56C67]">Reliable Partner.</span>
        </h2>

        <div className="flex items-center gap-1.5 text-gray-200 flex-wrap py-0.5">
          <span className="bg-white/15 backdrop-blur-xs px-2 py-0.5 rounded-sm text-[10px] font-semibold text-white">⚡ Electrician</span>
          <span className="bg-white/15 backdrop-blur-xs px-2 py-0.5 rounded-sm text-[10px] font-semibold text-white">🚰 Plumber</span>
          <span className="bg-white/15 backdrop-blur-xs px-2 py-0.5 rounded-sm text-[10px] font-semibold text-white">🧹 Cleaning</span>
          <span className="bg-white/15 backdrop-blur-xs px-2 py-0.5 rounded-sm text-[10px] font-semibold text-white">🎨 Painting</span>
        </div>

        <div className="pt-1.5">
          <button
            onClick={onActionClick || (() => toast.success('Discount offers applied to your services!'))}
            className="px-4 py-2 rounded-md bg-[#B33A35] hover:bg-[#9E2E2A] text-white font-bold text-xs shadow-md active:scale-95 transition-all cursor-pointer"
          >
            Book Now
          </button>
        </div>
      </div>
    </section>
  );
};

export default CTABanner;
