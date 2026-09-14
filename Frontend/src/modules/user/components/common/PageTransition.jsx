import React, { useEffect, useState, cloneElement } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * PageTransition - Provides smooth page transitions without blocking navigation
 * Uses simple opacity fade for fast, non-intrusive page changes
 */
const PageTransition = ({ children }) => {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (location.pathname !== displayLocation.pathname || location.search !== displayLocation.search) {
      // Start transition immediately
      setIsTransitioning(true);

      // Quick fade out then swap content
      const timeout = setTimeout(() => {
        setDisplayLocation(location);
        setIsTransitioning(false);
        window.scrollTo(0, 0);
        if (document.documentElement) document.documentElement.scrollTop = 0;
        if (document.body) document.body.scrollTop = 0;
      }, 100); // Very quick transition (100ms)

      return () => clearTimeout(timeout);
    }
  }, [location.pathname, location.search, displayLocation.pathname, displayLocation.search]);

  return (
    <div
      style={{
        opacity: isTransitioning ? 0.7 : 1,
        transition: 'opacity 100ms ease-out',
        willChange: 'opacity',
      }}
    >
      {cloneElement(children, { location: displayLocation })}
    </div>
  );
};

export default PageTransition;
