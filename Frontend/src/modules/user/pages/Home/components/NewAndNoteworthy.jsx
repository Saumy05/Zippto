import React, { useRef, useEffect } from 'react';
import { createOptimizedScrollAnimation, createOptimizedStaggerAnimation } from '../../../../../utils/optimizedScrollTrigger';
import SimpleServiceCard from '../../../components/common/SimpleServiceCard';
import waterPurifierImage from '../../../../../assets/images/pages/Home/NewAndNoteworthy/water-purifiers.png';
import bathroomCleaningImage from '../../../../../assets/images/pages/Home/NewAndNoteworthy/bathroom-cleaning.png';
import hairStudioImage from '../../../../../assets/images/pages/Home/NewAndNoteworthy/hair-studio.png';
import acRepairImage from '../../../../../assets/images/pages/Home/NewAndNoteworthy/ac-repair.png';

const NewAndNoteworthy = React.memo(({ services, onServiceClick }) => {
  const sectionRef = useRef(null);
  const titleRef = useRef(null);
  const cardsRef = useRef(null);


  const serviceList = services || [];

  // Defer GSAP scroll animations until after initial render for better performance
  useEffect(() => {
    // Skip animations on initial load to improve performance
    const shouldAnimate = typeof window !== 'undefined' &&
      (window.requestIdleCallback || window.setTimeout);

    if (!shouldAnimate || !sectionRef.current || !titleRef.current || !cardsRef.current) {
      // Show content immediately without animation
      if (titleRef.current) titleRef.current.style.opacity = '1';
      if (cardsRef.current) {
        Array.from(cardsRef.current.children).forEach(card => {
          card.style.opacity = '1';
          card.style.transform = 'none';
        });
      }
      return;
    }

    // Defer animation initialization until browser is idle
    const initAnimations = () => {
      const cards = Array.from(cardsRef.current?.children || []);
      if (cards.length === 0) return;

      const cleanupFunctions = [];

      // Animate title
      const titleCleanup = createOptimizedScrollAnimation(
        titleRef.current,
        {
          from: { y: 30, opacity: 0 },
          to: { y: 0, opacity: 1 },
          duration: 0.6,
          ease: 'power2.out',
        },
        { rootMargin: '100px' }
      );
      if (titleCleanup) cleanupFunctions.push(titleCleanup);

      // Stagger animate cards
      const cardsCleanup = createOptimizedStaggerAnimation(
        cards,
        {
          from: { x: 50, opacity: 0, scale: 0.9 },
          to: { x: 0, opacity: 1, scale: 1 },
          duration: 0.5,
          stagger: 0.08,
          ease: 'back.out(1.7)',
        },
        { rootMargin: '150px' }
      );
      if (cardsCleanup) cleanupFunctions.push(cardsCleanup);

      return () => {
        cleanupFunctions.forEach(cleanup => cleanup?.());
      };
    };

    // Use requestIdleCallback if available, otherwise setTimeout
    if (window.requestIdleCallback) {
      const idleCallback = window.requestIdleCallback(initAnimations, { timeout: 2000 });
      return () => {
        if (idleCallback) window.cancelIdleCallback(idleCallback);
      };
    } else {
      const timeout = setTimeout(initAnimations, 500);
      return () => clearTimeout(timeout);
    }
  }, []); // Empty deps - only run once on mount

  if (serviceList.length === 0) {
    return null;
  }

  return (
    <div ref={sectionRef} className="mb-6">
      <div ref={titleRef} className="px-4 mb-5" style={{ opacity: 1 }}>
        <h2
          className="text-xl font-bold text-gray-900 tracking-tight"
        >
          New and noteworthy
        </h2>
      </div>

      <div ref={cardsRef} className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
        {serviceList.map((service, index) => (
          <div
            key={service.id || index}
            onClick={() => onServiceClick?.(service)}
            className="w-[124px] xs:w-[136px] sm:w-[155px] md:w-[220px] shrink-0 flex flex-col bg-white rounded-md overflow-hidden cursor-pointer group transition-all duration-300 hover:shadow-md border border-[#E5E7EB]"
            style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)' }}
          >
            <div className="relative w-full aspect-square overflow-hidden bg-gray-50">
              <div className="absolute top-1.5 left-1.5 bg-[#1F2937]/90 backdrop-blur-xs text-amber-400 text-[8.5px] font-bold px-1.5 py-0.5 rounded-sm shadow-xs z-10 flex items-center gap-1">
                <span>⚡</span>
                <span className="text-white text-[8px]">In 47 mins</span>
              </div>
              <img
                src={service.image}
                alt={service.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
            </div>
            <div className="p-2 flex flex-col flex-1">
              <h3 className="text-[11px] md:text-xs font-semibold text-gray-900 leading-snug line-clamp-2 min-h-[30px] font-heading">
                {service.title}
              </h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

NewAndNoteworthy.displayName = 'NewAndNoteworthy';

export default NewAndNoteworthy;

