import { useState, useEffect } from 'react';

/**
 * Centrally detects if the mobile virtual keyboard is open.
 * Uses a robust multi-tiered strategy:
 * 1. window.visualViewport API (modern Chromium, Safari iOS 13+, Edge)
 * 2. Focus tracking on editable text inputs / textareas on touch devices
 * 3. navigator.virtualKeyboard API (Chromium)
 * 4. Window innerHeight shrinkage fallback
 * 
 * Synchronizes 'keyboard-open' class on document.body for instant CSS suppression.
 */
export function useKeyboardVisible() {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isTouchDevice =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

    let baselineHeight = window.innerHeight;

    const isTextInput = (element) => {
      if (!element) return false;
      const tag = element.tagName ? element.tagName.toLowerCase() : '';
      if (tag === 'textarea' || element.isContentEditable) return true;
      if (tag === 'input') {
        const type = (element.type || 'text').toLowerCase();
        const nonTextTypes = [
          'checkbox',
          'radio',
          'button',
          'submit',
          'reset',
          'file',
          'color',
          'range',
          'image',
        ];
        return !nonTextTypes.includes(type);
      }
      return false;
    };

    const checkKeyboard = () => {
      // 1. Chromium VirtualKeyboard API
      if (
        navigator.virtualKeyboard &&
        navigator.virtualKeyboard.boundingRect &&
        navigator.virtualKeyboard.boundingRect.height > 0
      ) {
        return true;
      }

      // 2. Visual Viewport API (Standard on iOS Safari 13+ and Chrome Android)
      if (window.visualViewport) {
        const vvHeight = window.visualViewport.height;
        const currentInnerHeight = window.innerHeight;
        // Significant shrinkage indicates keyboard (keyboards are typically >= 150px)
        if (currentInnerHeight - vvHeight > 150) {
          return true;
        }
      }

      // 3. Android innerHeight resize fallback (on touch devices)
      if (isTouchDevice && baselineHeight - window.innerHeight > 150) {
        return true;
      }

      // 4. Active text input focused on touch/mobile device
      if (isTouchDevice && isTextInput(document.activeElement)) {
        return true;
      }

      return false;
    };

    const updateState = () => {
      const open = checkKeyboard();
      setIsKeyboardOpen(open);
      if (open) {
        document.body.classList.add('keyboard-open');
      } else {
        document.body.classList.remove('keyboard-open');
      }
    };

    const handleFocusIn = (e) => {
      if (isTouchDevice && isTextInput(e.target)) {
        // Immediate trigger + delayed check to sync with viewport animation
        setIsKeyboardOpen(true);
        document.body.classList.add('keyboard-open');
        setTimeout(updateState, 100);
        setTimeout(updateState, 300);
      }
    };

    const handleFocusOut = () => {
      // Delay check slightly so next focused element or blur completes
      setTimeout(updateState, 100);
      setTimeout(updateState, 300);
    };

    const handleOrientationChange = () => {
      // Reset baseline height when orientation changes
      setTimeout(() => {
        baselineHeight = window.innerHeight;
        updateState();
      }, 300);
    };

    window.addEventListener('focusin', handleFocusIn, { passive: true });
    window.addEventListener('focusout', handleFocusOut, { passive: true });
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', updateState, { passive: true });

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateState, { passive: true });
      window.visualViewport.addEventListener('scroll', updateState, { passive: true });
    }

    if (navigator.virtualKeyboard) {
      navigator.virtualKeyboard.addEventListener('geometrychange', updateState);
    }

    // Initial check
    updateState();

    return () => {
      window.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('focusout', handleFocusOut);
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', updateState);

      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateState);
        window.visualViewport.removeEventListener('scroll', updateState);
      }

      if (navigator.virtualKeyboard) {
        navigator.virtualKeyboard.removeEventListener('geometrychange', updateState);
      }

      document.body.classList.remove('keyboard-open');
    };
  }, []);

  return isKeyboardOpen;
}

export default useKeyboardVisible;
