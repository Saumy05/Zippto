import React, { forwardRef } from 'react';

/**
 * Centralized Logo Component
 * Usage: <Logo className="h-9 w-auto" />
 */
const Logo = forwardRef(({ className = "h-9 w-auto", ...props }, ref) => {
  return (
    <img
      ref={ref}
      src="/zippto_logo.png"
      alt="Zippto Home Services"
      className={`${className} object-contain rounded-xl shadow-xs`}
      {...props}
    />
  );
});

Logo.displayName = 'Logo';

export default Logo;
