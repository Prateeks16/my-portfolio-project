import { useEffect } from 'react';

/**
 * Scroll interpolation for the public portfolio.
 *
 * One IntersectionObserver for the whole page rather than a scroll listener:
 * a listener fires on every frame of every scroll and forces reflow, which is
 * what kills entry animations on mobile. Elements rest in `.reveal` and are
 * promoted to `.is-revealed` once, then unobserved.
 *
 * `deps` re-scans after async content lands — projects and experience arrive
 * from the API well after first paint.
 */
export const useReveal = (deps = []) => {
  useEffect(() => {
    const nodes = document.querySelectorAll('.reveal:not(.is-revealed)');
    if (!nodes.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.08 }
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};
