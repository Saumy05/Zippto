import React from 'react';
import { FiArrowRight } from 'react-icons/fi';

const ScrapPromotionCard = ({ onExploreClick }) => {
  return (
    <div
      className="w-full min-h-[180px] max-h-[220px] rounded-md overflow-hidden p-5 sm:p-6 text-white relative flex flex-col justify-between shadow-md mb-6"
      style={{
        background: 'linear-gradient(135deg, #B33A35 0%, #7A2825 45%, #1a4d5e 100%)'
      }}
    >
      <div className="relative z-10 max-w-sm">
        <span className="bg-white/20 backdrop-blur-xs text-white text-[9.5px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider">
          Doorstep Pickup
        </span>
        <h3 className="text-base sm:text-xl font-bold font-heading mt-2 leading-snug">
          Sell Your Recyclables & Scrap at Best Rates
        </h3>
        <p className="text-xs text-white/80 mt-1 line-clamp-2">
          Hassle-free scrap collection directly from your doorstep with transparent electronic weighing.
        </p>
      </div>

      <div className="relative z-10 pt-3">
        <button
          onClick={onExploreClick}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-white text-[#B33A35] font-bold text-xs hover:bg-gray-100 transition-all shadow-xs active:scale-95"
        >
          <span>Schedule Pickup</span>
          <FiArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Decorative background elements */}
      <div className="absolute right-2 bottom-2 text-white/10 text-8xl font-black select-none pointer-events-none font-heading">
        ♻
      </div>
    </div>
  );
};

export default ScrapPromotionCard;
