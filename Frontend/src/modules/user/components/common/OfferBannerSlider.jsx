import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
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

const OfferBannerSlider = ({ banners = [], onBannerClick }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const touchStartXRef = useRef(0);
  const touchEndXRef = useRef(0);

  // Filter out banners that don't have an imageUrl or image
  const validBanners = (banners || []).filter(
    (b) => b && (b.imageUrl || b.image)
  );

  const totalSlides = validBanners.length;

  // Auto-slide effect when there are 2 or more banners
  useEffect(() => {
    if (totalSlides <= 1 || isHovered) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % totalSlides);
    }, 4500);

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
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }
    touchStartXRef.current = 0;
    touchEndXRef.current = 0;
  };

  // Fallback: If no dynamic admin banners exist, show the default Zippto Home Pro CTA banner
  if (totalSlides === 0) {
    return (
      <section className="w-full min-h-[200px] sm:min-h-[240px] md:min-h-[280px] rounded-2xl relative overflow-hidden flex items-center p-4 sm:p-6 border border-[#E5E7EB] shadow-xs">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('/cat_3d/banner_tech.jpg')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-transparent" />
        <div className="relative z-10 max-w-md space-y-2 text-left">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-[#B33A35] flex items-center justify-center text-white text-[10px] font-black shadow-xs">
              Z
            </div>
            <span className="font-extrabold text-[11px] tracking-wider text-white uppercase">
              ZIPPTO HOME PRO
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

          <div className="pt-2">
            <button
              onClick={() => toast.success('Special offers applied to all home services!')}
              className="px-4 py-2 rounded-md bg-[#B33A35] hover:bg-[#9E2E2A] text-white font-bold text-xs shadow-md active:scale-95 transition-all cursor-pointer"
            >
              Book Service Now
            </button>
          </div>
        </div>
      </section>
    );
  }

  const currentBanner = validBanners[currentIndex];
  const imageSrc = toAssetUrl(currentBanner?.imageUrl || currentBanner?.image);

  return (
    <section
      className="w-full relative select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        onClick={() => onBannerClick && onBannerClick(currentBanner)}
        className="w-full relative overflow-hidden rounded-2xl border border-[#E5E7EB] bg-slate-100 shadow-sm cursor-pointer group transition-all duration-300 hover:shadow-md"
        style={{
          // Responsive aspect ratio matching high-resolution banner graphics
          aspectRatio: '21 / 9',
          minHeight: '160px',
          maxHeight: '320px'
        }}
      >
        <img
          key={imageSrc}
          src={imageSrc}
          alt={currentBanner?.text || 'Zippto Promotional Banner'}
          className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.01]"
          loading="eager"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = '/cat_3d/banner_tech.jpg';
          }}
        />

        {/* Optional text badge if banner has custom text */}
        {currentBanner?.text && (
          <div className="absolute bottom-3 left-4 z-10 bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg">
            <p className="text-white text-xs sm:text-sm font-bold tracking-wide">
              {currentBanner.text}
            </p>
          </div>
        )}

        {/* Subtle hover gradient */}
        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      </div>

      {/* Navigation Arrows (Visible on hover when multiple slides exist) */}
      {totalSlides > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prevSlide();
            }}
            aria-label="Previous Banner"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/90 backdrop-blur-sm text-slate-800 shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-white active:scale-95 transition-all duration-200 cursor-pointer"
          >
            <FiChevronLeft className="w-5 h-5 text-slate-900" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              nextSlide();
            }}
            aria-label="Next Banner"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/90 backdrop-blur-sm text-slate-800 shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-white active:scale-95 transition-all duration-200 cursor-pointer"
          >
            <FiChevronRight className="w-5 h-5 text-slate-900" />
          </button>

          {/* Indicator Dots */}
          <div className="absolute bottom-2.5 right-4 z-20 flex items-center gap-1.5 bg-black/35 backdrop-blur-xs px-2 py-1 rounded-full">
            {validBanners.map((_, idx) => (
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
                    ? 'w-5 h-1.5 bg-white shadow-xs'
                    : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/80'
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
