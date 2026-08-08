import React from 'react';
import { motion } from 'framer-motion';

/**
 * LogoLoader Component
 * @param {boolean} fullScreen - If true, shows a full-screen overlay (for initial app load). 
 *                               If false, shows an inline loader (for route transitions).
 * @param {boolean} overlay - If true with fullScreen, uses solid white background. 
 *                            If false, uses transparent background (doesn't hide BottomNav).
 * @param {string} size - Size classes for the logo
 */
const LogoLoader = ({ fullScreen = false, overlay = false, inline = false, size = "w-20 h-20" }) => {
  const containerClasses = fullScreen
    ? overlay
      ? "fixed inset-0 flex items-center justify-center bg-white z-[9999]"
      : "fixed inset-0 flex items-center justify-center bg-white/90 backdrop-blur-sm z-[100]"
    : inline
      ? "flex items-center justify-center"
      : "flex items-center justify-center w-full min-h-[60vh] pb-20";

  return (
    <div className={containerClasses}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0.8 }}
        animate={{
          scale: [0.9, 1.05, 0.9],
          opacity: [0.8, 1, 0.8],
        }}
        transition={{
          duration: 1.2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className={`relative ${size} flex items-center justify-center`}
      >
        <img
          src="/zippto_logo.png"
          alt="Loading Zippto..."
          className="w-full h-full object-contain rounded-2xl shadow-md p-1 bg-white border border-slate-100"
        />
        {/* Subtle ripple animation */}
        <motion.div
          className="absolute -inset-2 rounded-3xl border-2 border-amber-400/60"
          animate={{
            scale: [1, 1.25],
            opacity: [0.8, 0]
          }}
          transition={{
            duration: 1.1,
            repeat: Infinity,
            ease: "easeOut"
          }}
        />
      </motion.div>
    </div>
  );
};

export default LogoLoader;
