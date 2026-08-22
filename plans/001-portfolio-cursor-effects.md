# 001 — Add cursor-tracking spotlight and magnetic hero CTAs to the portfolio

- **Status**: DONE (implemented, feel-check pending)
- **Commit**: 4a971ff
- **Severity**: LOW (additive — requested feature, not a defect)
- **Category**: 8. Missed opportunities
- **Estimated scope**: 4 files (1 new), ~120 lines

## Problem

The portfolio was redesigned to "Ethereal Glass" — cards are glass plates seated in machined trays (`.bezel` / `.bezel-core`, `frontend/src/index.css:190-217`). The metaphor is physical hardware under light, but no light ever moves. Cards are lit identically wherever the pointer is, so the surface reads as printed rather than lit.

There is currently no pointer-tracking motion anywhere in the codebase. Hover states are limited to background/opacity swaps, e.g.:

```jsx
/* frontend/src/portfolio/Sections.jsx:370 — current */
<article
  className={cx(
    'bezel reveal group transition-transform duration-700 ease-fluid hover:-translate-y-1',
    span
  )}
```

This is a **marketing surface** (the public portfolio at `/`), where decorative pointer motion is legitimate. It must never reach the CRM at `frontend/src/dashboard/**`, which is a dense operator tool viewed daily.

## Target

Two coordinated effects, both gated to fine pointers and disabled under reduced motion.

**A. Card spotlight.** A soft white orb tracks the cursor across `.bezel-core` surfaces on Work and Recognition cards, clipped to the card, fading in on enter.

```css
/* target — frontend/src/index.css, @layer utilities */
.spotlight {
  display: none;
}

@media (hover: hover) and (pointer: fine) {
  .spotlight {
    display: block;
    position: absolute;
    left: 0;
    top: 0;
    height: 22rem;
    width: 22rem;
    margin-left: -11rem;
    margin-top: -11rem;
    border-radius: 9999px;
    background: radial-gradient(closest-side, rgba(255, 255, 255, 0.1), transparent 100%);
    opacity: 0;
    pointer-events: none;
    transition: opacity 300ms var(--ease-out);
    will-change: transform;
  }

  [data-spotlight]:hover .spotlight {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .spotlight {
    display: none;
  }
}
```

Position is driven by writing `transform` **directly on the orb element** in JS — never by setting a CSS custom property on the card and reading it in a child, which recalculates styles for every child on every move.

```js
/* target */
glow.style.transform = `translate3d(${x}px, ${y}px, 0)`;
```

**B. Magnetic hero CTAs.** The two hero pills (`frontend/src/portfolio/Portfolio.jsx` → `<Pill href="#work">` / `<Pill tone="glass" href="#contact">`, rendered at `frontend/src/portfolio/Sections.jsx:158-161`) drift up to 6px toward the cursor while it is within 80px of them, and release back to rest.

```js
/* target — clamped displacement */
const MAX = 6;   // px
const RANGE = 80; // px beyond the element's bounds that still attracts
wrapper.style.transform = `translate3d(${clamp(dx * 0.35, -MAX, MAX)}px, ${clamp(dy * 0.35, -MAX, MAX)}px, 0)`;
/* release */
wrapper.style.transform = 'translate3d(0, 0, 0)';
wrapper.style.transition = 'transform 500ms var(--ease-fluid)';
```

**Critical detail:** the magnet transform goes on a **wrapper `<span>`, not on the `Pill` itself.** `Pill` already carries `active:scale-[0.98]` (`frontend/src/portfolio/Sections.jsx:72`), which is a Tailwind `transform` utility. An inline `style.transform` on the same element silently kills the press feedback. Wrapper for translation, button for scale.

Both effects are pointer-position-driven, so both must be **rAF-throttled**: store the latest event, schedule at most one frame of work.

## Repo conventions to follow

- **Easing tokens** live in `frontend/src/index.css:47-49` and are mirrored into Tailwind at `frontend/tailwind.config.js:73-76`. Use them; do not add new curves:
  - `--ease-fluid: cubic-bezier(0.32, 0.72, 0, 1)` → Tailwind `ease-fluid`
  - `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)` → Tailwind `ease-out`
- **Pointer/motion hooks** live in `frontend/src/lib/`. Exemplar to imitate — `frontend/src/lib/reveal.js`: a single observer for the whole page, a documented reason for the approach, cleanup returned from `useEffect`. Follow its shape and comment density exactly.
- **Component classes** (`.bezel`, `.eyebrow`, `.display-face`) live in `@layer components`; **utilities** (`.reveal`, `.skeleton`) in `@layer utilities` of `frontend/src/index.css`. `.spotlight` is a utility.
- **Reduced motion** is handled in one block at `frontend/src/index.css:389-406`. Extend that block; do not scatter new media queries.
- Portfolio decoration is documented in `DESIGN.md` under **Atmosphere** — add the spotlight there in the same voice (plain, first person, reasons stated).

## Steps

1. **Create `frontend/src/lib/pointer.js`** exporting two hooks, written in the style of `frontend/src/lib/reveal.js`:

   - `useSpotlight(containerRef)` — attaches `pointermove` to the container (one listener, event delegation via `event.target.closest('[data-spotlight]')`), resolves the card's `.spotlight` child, and writes `transform` on it from `event.clientX/Y` minus the card's `getBoundingClientRect()`. rAF-throttled: keep `frame` and `latest` in refs, cancel the pending frame on cleanup.
   - `useMagnetic(ref, { max = 6, range = 80 })` — attaches `pointermove` to `window`, computes distance from the element's rect, applies the clamped translate on a wrapper element, and resets to `translate3d(0,0,0)` when the pointer leaves `range`.
   - Both hooks return early (attaching nothing) when
     `window.matchMedia('(prefers-reduced-motion: reduce)').matches` or
     `!window.matchMedia('(hover: hover) and (pointer: fine)').matches`.

2. **Add the `.spotlight` CSS** to `@layer utilities` in `frontend/src/index.css`, exactly as written in the Target section, and add `.spotlight { display: none; }` to the existing `@media (prefers-reduced-motion: reduce)` block at `frontend/src/index.css:389`.

3. **Wire the Work grid.** In `frontend/src/portfolio/Sections.jsx`:
   - In `Work`, put a ref on the grid `<div className="grid gap-5 md:grid-cols-6">` (line ~347) and call `useSpotlight(gridRef)`.
   - In `ProjectCard`, add `data-spotlight` to the `<article>` (line ~370), add `relative` to the `bezel-core` div's class list (line ~377 — it already has `overflow-hidden`, which is what clips the orb), and render `<span className="spotlight" aria-hidden="true" />` as its first child.

4. **Wire the Recognition grid.** Same three edits in `Achievements` (`frontend/src/portfolio/Sections.jsx:~520`): ref on the grid, `data-spotlight` on the `<article>`, and on its `bezel-core` div add **both** `relative` and `overflow-hidden` (unlike ProjectCard, this one does not currently clip), plus the `<span className="spotlight" />`.

5. **Wire the hero CTAs.** In `frontend/src/portfolio/Sections.jsx:154-162`, wrap each `<Pill>` in `<span ref={…} className="inline-block will-change-transform">` and call `useMagnetic` per wrapper ref. Do not alter the `Pill` component itself.

6. **Document it.** Add a short paragraph to the **Atmosphere** section of `DESIGN.md` describing the spotlight and the magnet, including the two gates (fine pointer, reduced motion) and the fact that neither exists in the CRM.

## Boundaries

- Do NOT touch anything under `frontend/src/dashboard/**`. The CRM gets no pointer effects, ever.
- Do NOT add a custom cursor, cursor-hiding, a trailing dot, or a blend-mode inversion — the native cursor stays.
- Do NOT animate `background-position`, `box-shadow`, or gradient stops to achieve the spotlight; only `transform` on the orb and `opacity` on hover.
- Do NOT add dependencies. No Framer Motion, no GSAP.
- Do NOT modify the `Pill` component's classes (`frontend/src/portfolio/Sections.jsx:68-91`).
- Do NOT put a `pointermove` listener on each card — one delegated listener per grid.
- If a step doesn't match the code you find (drift since 4a971ff), STOP and report instead of improvising.

## Verification

- **Mechanical**: from `frontend/`, `npx eslint .` exits 0 and `npx vite build` completes with no warnings about unused imports.
- **Feel check**: run `npm run dev`, open `http://localhost:5173/`, and confirm:
  - Moving across a Work card, the highlight follows the cursor and stays **clipped inside the card's rounded core** — no glow spilling over the bezel tray.
  - The glow fades in over ~300ms rather than snapping, and fades out when the pointer leaves.
  - Moving the cursor fast across all six cards does not visibly stutter. In DevTools → Performance, record 3s of fast sweeping: no long tasks over 50ms, frame rate stays at 60.
  - Hovering near a hero pill pulls it slightly toward the cursor and it settles back smoothly on exit — **and clicking it still visibly presses (scales down)**. If the press is gone, the magnet was applied to the button instead of the wrapper.
  - In DevTools → Rendering → emulate `prefers-reduced-motion: reduce`: no glow renders at all, magnets are inert, and the rest of the page still works.
  - In DevTools device toolbar (coarse pointer): no glow element is painted and no `pointermove` listener is attached.
- **Done when**: the spotlight tracks on both portfolio grids, the two hero pills magnetize without losing press feedback, nothing in `frontend/src/dashboard/**` changed, and `DESIGN.md` describes the effect.
