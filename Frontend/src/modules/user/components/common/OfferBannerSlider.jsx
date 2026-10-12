import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiChevronLeft, FiChevronRight, FiArrowRight } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

export const toAssetUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  if (url.includes('/uploads/')) {
    const uploadPath = url.substring(url.indexOf('/uploads/'));
    const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001').replace(/\/api\/?$/, '');
    return `${base}${uploadPath}`;
  }
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return url;
};

// Fallback 3 real high-res photography banners if database has no active banners configured
const DEFAULT_BANNERS = [
  {
    id: 'def-bnr-1',
    imageUrl: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=1200&auto=format&fit=crop&q=80',
    text: 'Certified Electricians • Instant Fixes & Repairs from ₹99',
    badge: 'TOP RATED',
    slug: 'electrician'
  },
  {
    id: 'def-bnr-2',
    imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=1200&auto=format&fit=crop&q=80',
    text: 'Beat The Heat • AC Deep Cleaning & Servicing from ₹499',
    badge: 'SUMMER SPECIAL',
    slug: 'ac-appliance-repair'
  },
  {
    id: 'def-bnr-3',
    imageUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200&auto=format&fit=crop&q=80',
    text: 'Sparkling Clean Homes • Intense Deep Cleaning & Sanitization',
    badge: 'POPULAR',
    slug: 'cleaning-service'
  }
];

const OfferBannerSlider = ({ banners = [], onBannerClick }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const touchStartXRef = useRef(0);
  const touchEndXRef = useRef(0);

  // Filter out invalid items
  const validBanners = (banners || []).filter(
    (b) => b && (b.imageUrl || b.image)
  );

  // If no banners from API, use the 3 curated default banners
  const displayBanners = validBanners.length > 0 ? validBanners : DEFAULT_BANNERS;
  const totalSlides = displayBanners.length;

  // Auto-slide effect (5000ms) with pause on hover
  useEffect(() => {
    if (totalSlides <= 1 || isHovered) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % totalSlides);
    }, 5000);

    return () => clearInterval(timer);
  }, [totalSlides, isHovered]);

  const goToSlide = (index) => {
    setCurrentIndex(index);
  };

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const handleTouchStart = (e) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartXRef.current || !touchEndXRef.current) return;
    const diff = touchStartXRef.current - touchEndXRef.current;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }
    touchStartXRef.current = 0;
    touchEndXRef.current = 0;
  };

  return (
    <section
      className="w-full relative select-none group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      aria-label="Promotional Banners Carousel"
    >
      {/* Carousel Container */}
      <div
        className="w-full relative overflow-hidden rounded-xl sm:rounded-2xl border border-slate-200/90 bg-slate-900 shadow-xs"
        style={{
          // Responsive aspect ratio: compact on mobile to keep categories above fold
          aspectRatio: '21 / 9',
          minHeight: '150px',
          maxHeight: '260px'
        }}
      >
        {/* Sliding Flex Track */}
        <div
          className="flex h-full transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {displayBanners.map((banner, index) => {
            const imageSrc = toAssetUrl(banner?.imageUrl || banner?.image);
            const badgeText = banner.badge || 'SPECIAL OFFER';

            return (
              <div
                key={banner.id || banner._id || index}
                onClick={() => onBannerClick && onBannerClick(banner)}
                className="w-full h-full flex-shrink-0 relative cursor-pointer overflow-hidden"
              >
                {/* Background Image */}
                <img
                  src={imageSrc}
                  alt={banner.text || `Promotion ${index + 1}`}
                  className="w-full h-full object-cover object-center transition-transform duration-700 ease-out hover:scale-[1.02]"
                  loading={index === 0 ? 'eager' : 'lazy'}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/cat_images/electrician.jpg';
                  }}
                />

                {/* Left Gradient Overlay to guarantee text readability */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-transparent pointer-events-none" />

                {/* Banner Content Overlay */}
                <div className="absolute inset-0 flex flex-col justify-between p-3.5 sm:p-5 md:p-6 z-10 text-white pointer-events-none">
                  {/* Top Badge */}
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 bg-red-600/90 text-white font-extrabold text-[9px] sm:text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full shadow-xs">
                      {badgeText}
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-bold text-white/80 tracking-wide uppercase hidden xs:inline">
                      Zippto Verified
                    </span>
                  </div>

                  {/* Main Headline & CTA */}
                  <div className="max-w-[75%] sm:max-w-md space-y-1.5 sm:space-y-2">
                    {banner.text && (
                      <h3 className="text-xs sm:text-base md:text-lg font-black text-white leading-snug tracking-tight drop-shadow-xs line-clamp-2 font-heading">
                        {banner.text}
                      </h3>
                    )}

                    <div className="pt-0.5">
                      <span className="inline-flex items-center gap-1 bg-white text-slate-900 font-extrabold text-[10px] sm:text-xs px-2.5 sm:px-3 py-1 rounded-md sm:rounded-lg shadow-sm hover:bg-slate-100 transition-all pointer-events-auto">
                        <span>Book Now</span>
                        <FiArrowRight className="w-3 h-3 text-red-600" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation Arrows (Visible on hover on desktop when > 1 slide) */}
      {totalSlides > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prevSlide();
            }}
            aria-label="Previous slide"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/90 backdrop-blur-xs text-slate-900 shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-white active:scale-95 transition-all duration-200 cursor-pointer"
          >
            <FiChevronLeft className="w-4 h-4 text-slate-900" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              nextSlide();
            }}
            aria-label="Next slide"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/90 backdrop-blur-xs text-slate-900 shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-white active:scale-95 transition-all duration-200 cursor-pointer"
          >
            <FiChevronRight className="w-4 h-4 text-slate-900" />
          </button>

          {/* Indicator Dots & Counter Pill */}
          <div className="absolute bottom-2.5 right-3 sm:right-4 z-20 flex items-center gap-1.5 bg-black/45 backdrop-blur-xs px-2 py-1 rounded-full border border-white/10">
            {displayBanners.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goToSlide(idx);
                }}
                aria-label={`Go to slide ${idx + 1}`}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  idx === currentIndex
                    ? 'w-4 sm:w-5 h-1 sm:h-1.5 bg-white shadow-xs'
                    : 'w-1 sm:w-1.5 h-1 sm:h-1.5 bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
};

export default OfferBannerSlider;
