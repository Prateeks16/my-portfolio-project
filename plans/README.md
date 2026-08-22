# Animation plans

Written by `improve-animations plan` against commit `4a971ff`, after the Ethereal Glass redesign.

Every plan is self-contained: exact file paths, current code excerpts, exact curves and durations, and a feel check. An executor with no context should be able to run any one of them in isolation.

**All six are implemented** in README order (002 → 005 → 003 → 004 → 006 → 001). Lint and build are green; the feel checks in each plan still want a pass in the browser.

One deviation from plan 002 as written: React 19's `react-hooks/set-state-in-effect` rule rejects a synchronous `setState` in an effect body, so the modal's entrance uses `@starting-style` plus a `data-state` attribute instead of a `shown` mount flag. Same values, same feel, less state — and it is the pattern the plan's own Target section preferred anyway.

Follow-up on plan 001, after the fact: the magnets were direct-tracked as specified, then swapped to a spring integrator (stiffness 0.14, damping 0.74, no dependency). Direct tracking gave the element a position but no motion of its own; the spring is what makes the pull read as magnetic. The CSS release transition is gone — the spring handles both directions.

## Plans

| # | Title | Severity | Surface | Status |
|---|---|---|---|---|
| [001](001-portfolio-cursor-effects.md) | Cursor-tracking spotlight + magnetic hero CTAs | LOW (additive) | Portfolio | DONE |
| [002](002-modal-enter-exit.md) | Modal entrance and exit (9 call sites) | HIGH | CRM | DONE |
| [003](003-project-readmore-height.md) | Stop the project card snapping height | MEDIUM | Portfolio | DONE |
| [004](004-contact-success-swap.md) | Bridge the contact form success swap | MEDIUM | Portfolio | DONE |
| [005](005-crm-content-entrances.md) | Inbox reading pane + note entrances | MEDIUM | CRM | DONE |
| [006](006-tasks-row-exit.md) | Completed task leaves the list | MEDIUM | CRM | DONE |

## Recommended order

1. **002** first, alone. It is the only HIGH, it fixes a missing exit rather than adding polish, and it changes a component that nine pages depend on — land and verify it before anything else moves.
2. **005** next. Same file as 002 (`components/ui.jsx`), so doing it second avoids re-reading a file that just changed under it.
3. **003** and **004** in either order. Both are portfolio-only, both touch a single file each, no overlap.
4. **006** last of the corrective work. Self-contained in one page.
5. **001** whenever. It is the requested feature rather than a fix, and it is the largest single diff — keep it out of the same commit as the others so a regression is easy to attribute.

## Dependencies

- **002 → 005** share `frontend/src/dashboard/components/ui.jsx`. Sequential, not parallel.
- **003 and 004** share `frontend/src/portfolio/` but not a file. Safe in parallel.
- **001** adds `frontend/src/lib/pointer.js` and edits `Sections.jsx`, which **003** also edits. Run 003 first, or expect a conflict in `ProjectCard`.
- Nothing depends on 006.

## Shared constraints, all plans

- Easing tokens are already defined at `frontend/src/index.css:47-49` and mirrored to Tailwind at `frontend/tailwind.config.js:73-76`. Use `ease-out` (`cubic-bezier(0.16, 1, 0.3, 1)`) and `ease-fluid` (`cubic-bezier(0.32, 0.72, 0, 1)`). **Do not introduce a third curve.**
- `prefers-reduced-motion` is handled once, globally, at `frontend/src/index.css:389-406`. Do not add per-component media queries; do confirm each change still works with it enabled.
- Animate `transform` and `opacity` only. Plan 003's `grid-template-rows` is the single documented exception and its reasoning is in the plan.
- No new dependencies in any plan. No Framer Motion, no GSAP.
- Verify with `npx eslint .` (exit 0) and `npx vite build` from `frontend/` before calling a plan done.

## Explicitly rejected — do not "improve" these

Recorded so a future pass does not re-propose them:

- **Route transitions between CRM pages.** Core navigation, 100+/day. Never animate.
- **Skeleton → content fade** (`components/ui.jsx` `LoadingPanel`). The backend cold-starts for ~60s; a user who waited that long gets the data in the frame it arrives.
- **Chart entrance animations** (`pages/Analytics.jsx` area chart, `pages/Overview.jsx` sparkline). Functional data being read.
- **Number tickers on `SummaryLine`.** `tabular-nums` exists in this design precisely so digits do not move.
- **Leads table row hover / re-sort.** Dense operator UI at tens-to-hundreds of interactions per day.
- **More portfolio section entrances.** `.reveal` already covers it; more would be over-animation.
