import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Global ScrollToTop Component
 * 
 * Ensures that whenever a route or query parameter changes:
 * 1. Disables browser automatic scrollRestoration so it does not fight navigation.
 * 2. Instantly resets window, documentElement, and body scroll to (0, 0).
 * 3. Handles hash anchors (e.g., #faq) by scrolling smoothly to the target element if present.
 * 4. Multi-stage execution (0ms, requestAnimationFrame, 100ms, 250ms) to ensure
 *    PageTransition delays (100ms fade) and React Suspense/lazy-loaded async content
 *    do not preserve old scroll positions.
 * 5. Resets any nested layout scroll containers (such as AdminLayout <main>).
 */
const ScrollToTop = () => {
  const location = useLocation();
  const { pathname, search, hash } = location;

  // 1. Disable browser automatic scroll restoration once on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  // 2. Perform scroll reset on every route / query change
  useEffect(() => {
    // If navigating to a specific in-page anchor (e.g. /page#section)
    if (hash) {
      const targetId = hash.replace("#", "");
      const timer = setTimeout(() => {
        const element = document.getElementById(targetId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
      return () => clearTimeout(timer);
    }

    const executeScrollTop = () => {
      // Temporarily override smooth scrolling so navigation scroll is instant and crisp
      const originalScrollBehavior = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = "auto";

      // Reset window & document coordinates
      window.scrollTo(0, 0);
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;

      // Reset any inner layout scroll containers (e.g. Admin layout <main>, etc.)
      const scrollableContainers = document.querySelectorAll("main, [data-scroll-container]");
      scrollableContainers.forEach((container) => {
        if (container && container.scrollTop !== 0) {
          container.scrollTop = 0;
        }
      });

      // Restore original scroll behavior in next frame
      requestAnimationFrame(() => {
        document.documentElement.style.scrollBehavior = originalScrollBehavior || "";
      });
    };

    // Stage 1: Immediate reset at route trigger
    executeScrollTop();

    // Stage 2: In next animation frame after React layout paint
    const rafId = requestAnimationFrame(executeScrollTop);

    // Stage 3: At 110ms to align with PageTransition (100ms delay before swapping displayLocation)
    const t1 = setTimeout(executeScrollTop, 110);

    // Stage 4: At 260ms to handle Suspense lazy chunk render & async data expansions
    const t2 = setTimeout(executeScrollTop, 260);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [pathname, search, hash]);

  return null;
};

export default ScrollToTop;
