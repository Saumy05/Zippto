import React, { useRef, memo, useEffect } from 'react';
import { gsap } from 'gsap';

const CategoryCard = memo(({ icon, title, onClick, hasSaleBadge = false, index = 0, bgStyle }) => {
  const cardRef = useRef(null);

  // Entrance animation
  useEffect(() => {
    if (cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        { y: 12, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.35,
          delay: index * 0.04,
          ease: 'power2.out',
        }
      );
    }
  }, [index]);

  return (
    <div
      ref={cardRef}
      className="flex flex-col items-center justify-center p-1 cursor-pointer relative category-card-container group transition-transform duration-300 ease-out active:scale-95 w-full"
      onClick={onClick}
      style={{ opacity: 0 }}
    >
      <div
        className="w-[64px] h-[64px] rounded-md flex items-center justify-center mb-1.5 relative border border-[#E5E7EB] flex-shrink-0 transition-all duration-300 group-hover:shadow-md group-hover:-translate-y-0.5 bg-white"
        style={{
          boxShadow: '0 8px 20px -6px rgba(0,0,0,0.06)',
          ...(bgStyle || {})
        }}
      >
        {icon || (
          <svg
            className="w-7 h-7 text-gray-400 group-hover:text-[#B33A35] transition-colors duration-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )}
        {hasSaleBadge && (
          <div
            className="absolute -top-1.5 -right-1.5 text-white text-[8.5px] font-black px-1.5 py-0.2 rounded-full shadow-xs z-10 border border-white"
            style={{
              background: 'linear-gradient(135deg, #B33A35 0%, #D56C67 50%, #9E2E2A 100%)',
            }}
          >
            SALE
          </div>
        )}
      </div>
      <span
        className="text-[11px] text-center text-gray-700 group-hover:text-[#B33A35] font-medium leading-tight tracking-tight mt-0.5 transition-colors duration-200 w-full line-clamp-2 px-1"
      >
        {title}
      </span>
    </div>
  );
});

CategoryCard.displayName = 'CategoryCard';

export default CategoryCard;
