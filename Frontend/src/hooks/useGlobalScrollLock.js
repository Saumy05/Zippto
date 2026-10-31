import { useEffect } from 'react';

/**
 * Stops the page behind a popup from scrolling while any full-screen overlay is open.
 *
 * Popups in this app are `fixed inset-0` layers rendered by many different components, so instead of
 * wiring a lock into each one this watches the DOM once:
 *  - while a visible full-screen overlay exists, <body> scrolling is locked;
 *  - wheel / touch scrolling is blocked unless the popup's own content (or a scrollable element inside
 *    it) can scroll in that direction, so long popups still scroll and nothing leaks to the page behind.
 * Decorative full-screen layers (pointer-events-none) are ignored.
 */

const OVERLAY_SELECTOR = '.fixed.inset-0';

const isOverlay = (el) => {
  const cs = window.getComputedStyle(el);
  if (cs.position !== 'fixed' || cs.display === 'none' || cs.visibility === 'hidden' || cs.pointerEvents === 'none') {
    return false;
  }
  const rect = el.getBoundingClientRect();
  return rect.width >= window.innerWidth * 0.9 && rect.height >= window.innerHeight * 0.9;
};

const hasOpenOverlay = () => Array.from(document.querySelectorAll(OVERLAY_SELECTOR)).some(isOverlay);

// Can `el` scroll further in the direction of `delta` (positive = content moving up / scrolling down)?
const canScrollInDirection = (el, delta) => {
  const overflowY = window.getComputedStyle(el).overflowY;
  if ((overflowY !== 'auto' && overflowY !== 'scroll') || el.scrollHeight <= el.clientHeight) return false;
  return delta < 0 ? el.scrollTop > 0 : el.scrollTop + el.clientHeight < el.scrollHeight - 1;
};

// Walks up from the event target to the nearest fixed layer looking for something that can scroll
const insideScrollableLayer = (target, delta) => {
  let el = target instanceof Element ? target : null;
  while (el && el !== document.body) {
    if (canScrollInDirection(el, delta)) return true;
    if (window.getComputedStyle(el).position === 'fixed') return false;
    el = el.parentElement;
  }
  return false;
};

const useGlobalScrollLock = () => {
  useEffect(() => {
    let overlayOpen = false;
    let ownsBodyLock = false;
    let frame = 0;
    let touchStartY = 0;

    const lockBody = () => {
      if (document.body.style.overflow === 'hidden') return;
      const scrollbar = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`; // avoid layout shift
      ownsBodyLock = true;
    };

    const unlockBody = () => {
      if (!ownsBodyLock) return;
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      ownsBodyLock = false;
    };

    const sync = () => {
      frame = 0;
      overlayOpen = hasOpenOverlay();
      if (overlayOpen) lockBody();
      else unlockBody();
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(sync);
    };

    const onWheel = (e) => {
      if (!overlayOpen || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (!insideScrollableLayer(e.target, e.deltaY)) e.preventDefault();
    };

    const onTouchStart = (e) => {
      touchStartY = e.touches[0]?.clientY ?? 0;
    };

    const onTouchMove = (e) => {
      if (!overlayOpen) return;
      const delta = touchStartY - (e.touches[0]?.clientY ?? touchStartY); // finger up => scroll down
      if (!insideScrollableLayer(e.target, delta)) e.preventDefault();
    };

    const observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
    window.addEventListener('resize', schedule);
    document.addEventListener('wheel', onWheel, { passive: false });
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    schedule();

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', schedule);
      document.removeEventListener('wheel', onWheel);
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      if (frame) window.cancelAnimationFrame(frame);
      unlockBody();
    };
  }, []);
};

export default useGlobalScrollLock;
