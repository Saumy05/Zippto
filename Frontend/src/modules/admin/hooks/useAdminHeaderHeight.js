import { useState, useEffect } from 'react';

/**
 * Hook to calculate the height of the admin header.
 * Used to add padding-top to admin page content on mobile (fixed header).
 */
const useAdminHeaderHeight = () => {
  const [headerHeight, setHeaderHeight] = useState(80);

  useEffect(() => {
    // Desktop layout uses fixed Tailwind padding (lg:pt-24); skip measuring on desktop
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      return;
    }

    const calculateHeight = () => {
      const header = document.querySelector('header[class*="fixed"][class*="top-0"]') || document.querySelector('header.fixed');
      if (header) {
        const h = header.offsetHeight;
        if (h > 0) {
          setHeaderHeight(prev => (Math.abs(prev - h) > 2 ? h : prev));
        }
      }
    };

    calculateHeight();
    window.addEventListener('resize', calculateHeight);

    return () => {
      window.removeEventListener('resize', calculateHeight);
    };
  }, []);

  return headerHeight;
};

export default useAdminHeaderHeight;



