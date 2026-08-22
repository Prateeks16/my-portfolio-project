import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * The portfolio is one page, but every section is a real URL.
 *
 * `/#contact` is what a one-page site produces by default, and it reads like a
 * jump link rather than an address -- it cannot be linked to cleanly, search
 * engines treat it as the same page, and pasting it into a message looks like a
 * fragment of something. `/contact` is an address. The page still never
 * reloads; only the URL and the scroll position move together.
 *
 * Listed in document order, which the scroll spy below depends on.
 */
export const SECTION_ROUTES = [
  { path: '/', id: 'top', label: 'Home', nav: false },
  { path: '/work', id: 'work', label: 'Work', nav: true },
  { path: '/about', id: 'about', label: 'About', nav: true },
  { path: '/experience', id: 'experience', label: 'Experience', nav: true },
  { path: '/achievements', id: 'achievements', label: 'Recognition', nav: true },
  { path: '/contact', id: 'contact', label: 'Contact', nav: true },
];

export const NAV_ROUTES = SECTION_ROUTES.filter((section) => section.nav);

/** How long a smooth scroll is assumed to take; `scrollend` is not portable yet. */
const SEEK_MS = 900;

/**
 * Keeps the URL and the scrolled-to section in agreement, in both directions.
 *
 * `ready` should go true once the API content has landed. Sections below the
 * fold have no stable position while the page is still skeletons, so a deep
 * link that arrives early would scroll to where the section will not be.
 */
export const useSectionRoute = (ready) => {
  const { pathname, hash } = useLocation();
  const navigate = useNavigate();

  // True while a programmatic scroll is in flight, so the spy does not rewrite
  // the URL to every section the page flies past on the way to the target.
  const seeking = useRef(false);
  const seekTimer = useRef(null);
  // The pathname the last automatic scroll was performed for. Without this,
  // `ready` flipping would yank a user who has since scrolled elsewhere.
  const scrolledFor = useRef(null);

  useEffect(() => () => window.clearTimeout(seekTimer.current), []);

  /* Links shared before this change still work: one redirect onto the route. */
  useEffect(() => {
    if (!hash) return;
    const match = SECTION_ROUTES.find((section) => section.id === hash.slice(1));
    if (match) navigate(match.path, { replace: true });
  }, [hash, navigate]);

  /* URL -> scroll position. */
  useEffect(() => {
    if (hash) return; // the redirect above lands us here again without one
    const target = SECTION_ROUTES.find((section) => section.path === pathname);
    if (!target) return;

    if (!ready && target.id !== 'top') return;
    if (scrolledFor.current === pathname) return;

    const element = document.getElementById(target.id);
    if (!element) return;
    scrolledFor.current = pathname;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.clearTimeout(seekTimer.current);
    seeking.current = true;
    element.scrollIntoView({
      behavior: reduced ? 'auto' : 'smooth',
      block: 'start',
    });
    seekTimer.current = window.setTimeout(
      () => {
        seeking.current = false;
      },
      reduced ? 60 : SEEK_MS
    );
  }, [pathname, hash, ready]);

  /* Scroll position -> URL. */
  useEffect(() => {
    const sections = SECTION_ROUTES.map((section) => ({
      ...section,
      element: document.getElementById(section.id),
    })).filter((section) => section.element);
    if (!sections.length) return undefined;

    // Only a thin band across the middle of the viewport counts as "current",
    // so one section owns the URL at a time regardless of how tall it is.
    const intersecting = new Map();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) =>
          intersecting.set(entry.target.id, entry.isIntersecting)
        );
        if (seeking.current) return;

        const current = sections.find((section) => intersecting.get(section.id));
        if (!current || current.path === window.location.pathname) return;

        // Marked as already handled so the effect above treats this as a URL
        // catching up with the page, not an instruction to scroll again.
        scrolledFor.current = current.path;
        navigate(current.path, { replace: true });
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
    );

    sections.forEach((section) => observer.observe(section.element));
    return () => observer.disconnect();
  }, [ready, navigate]);

  // Both directions end in a navigation, so the router's own location is
  // already the answer -- no second copy of it to keep in step.
  return pathname;
};
