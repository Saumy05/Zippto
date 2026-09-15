import { useState, useEffect } from 'react';

/**
 * Hook to calculate the height of the admin header.
 * Measures the fixed header dynamically across all screen sizes with ResizeObserver.
 */
const getInitialHeaderHeight = () => {
  if (typeof window === 'undefined') return 96;
  return window.innerWidth < 640 ? 72 : 96;
};

const useAdminHeaderHeight = () => {
  const [headerHeight, setHeaderHeight] = useState(getInitialHeaderHeight);

  useEffect(() => {
    const calculateHeight = () => {
      const header =
        document.querySelector('header[class*="fixed"][class*="top-0"]') ||
        document.querySelector('header.fixed') ||
        document.querySelector('header');
      if (header) {
        const h = header.offsetHeight;
        if (h > 0) {
          setHeaderHeight(prev => (Math.abs(prev - h) > 1 ? Math.round(h) : prev));
        }
      }
    };

    calculateHeight();
    window.addEventListener('resize', calculateHeight);

    let ro;
    const header =
      document.querySelector('header[class*="fixed"][class*="top-0"]') ||
      document.querySelector('header.fixed') ||
      document.querySelector('header');
    if (header && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(entries => {
        for (const entry of entries) {
          const h = entry.borderBoxSize?.[0]?.blockSize || entry.contentRect?.height;
          if (h && h > 0) {
            setHeaderHeight(prev => (Math.abs(prev - h) > 1 ? Math.round(h) : prev));
          }
        }
      });
      ro.observe(header);
    }

    return () => {
      window.removeEventListener('resize', calculateHeight);
      if (ro) ro.disconnect();
    };
  }, []);

  return headerHeight;
};

export default useAdminHeaderHeight;



