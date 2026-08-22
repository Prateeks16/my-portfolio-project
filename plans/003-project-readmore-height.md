# 003 — Stop the project card snapping height on "Read more"

- **Status**: DONE (implemented, feel-check pending)
- **Commit**: 4a971ff
- **Severity**: MEDIUM
- **Category**: 8. Missed opportunities (preventing a jarring change)
- **Estimated scope**: 2 files, ~20 lines

## Problem

Expanding a project's long description fades the text in, but the card's height changes in a single frame. Because the cards sit in a CSS grid (`md:grid-cols-6` with alternating spans), the row's height jumps and **every neighbouring card in that row resizes instantly** underneath the fade. The animation draws attention to exactly the thing that is teleporting.

```jsx
/* frontend/src/portfolio/Sections.jsx:405-409 — current */
          {open && project.description && (
            <p className="prose-measure mt-4 animate-fadeIn whitespace-pre-line text-base leading-relaxed text-ink-secondary">
              {project.description}
            </p>
          )}
```

`animate-fadeIn` is 280ms of opacity + a 6px rise (`frontend/src/index.css:265-280`); nothing bridges the height.

Frequency is Rare — a recruiter reading one or two project descriptions — so this is squarely in budget.

## Target

Animate the row using `grid-template-rows: 0fr → 1fr`, which interpolates to the content's natural height without ever hardcoding or measuring a pixel value. The element stays mounted so the transition can run in both directions.

```jsx
/* target */
{project.description && (
  <div
    className={cx(
      'grid transition-all duration-300 ease-fluid',
      open ? 'mt-4 grid-rows-[1fr] opacity-100' : 'mt-0 grid-rows-[0fr] opacity-0'
    )}
  >
    <p className="prose-measure overflow-hidden whitespace-pre-line text-base leading-relaxed text-ink-secondary">
      {project.description}
    </p>
  </div>
)}
```

Fixed values: 300ms on `ease-fluid` = `cubic-bezier(0.32, 0.72, 0, 1)`. `overflow-hidden` belongs on the **inner** `<p>`, not the grid wrapper — that is what lets the row collapse. The margin animates with it (`mt-4` → `mt-0`) so the gap does not persist while collapsed.

Note this animates `grid-template-rows`, which is a layout property. That is a deliberate, documented exception: it is the only technique that reaches natural height without JS measurement, it runs on a single card, and it is triggered at Rare frequency. Do not "optimise" it into a `max-height` guess — a wrong `max-height` either clips long descriptions or adds dead easing time on short ones.

The `open` state and the toggle button stay exactly as they are (`frontend/src/portfolio/Sections.jsx:368`, `:429-440`).

## Repo conventions to follow

- Easing tokens: `frontend/src/index.css:47-49`, mirrored at `frontend/tailwind.config.js:73-76`. Use the Tailwind class `ease-fluid`; do not write an arbitrary `ease-[cubic-bezier(...)]` value.
- `cx` from `frontend/src/lib/format.js` composes conditional classes; already imported at `frontend/src/portfolio/Sections.jsx:10-17`.
- Exemplar of a kept-mounted, class-toggled transition in this repo: `frontend/src/portfolio/Portfolio.jsx:143-171` (the mobile nav overlay stays mounted and swaps `opacity`/`translate` classes so it interpolates in both directions).
- Reduced motion is handled globally at `frontend/src/index.css:389-406`; no per-component query.

## Steps

1. In `frontend/src/portfolio/Sections.jsx`, replace the block at lines 405-409 with the Target markup. Note the condition changes from `open && project.description` to `project.description` — the element must stay mounted for the collapse to animate.
2. Check the surrounding spacing still reads correctly: the element above it is `<p className="prose-measure mt-3 …">` (line 402) and below it is the tech `<ul className="mt-5 …">` (line 411). The wrapper contributes `mt-4` when open and `mt-0` when closed, so no double gap appears in the collapsed state.
3. Leave the toggle button (lines 429-440) and its `trackEvent('project_expand', …)` call untouched.

## Boundaries

- Do NOT use `max-height`, `scrollHeight` measurement, `ResizeObserver`, or a JS height animation.
- Do NOT touch the `Achievements` cards — their descriptions are always visible and are out of scope.
- Do NOT change the bento grid spans (`SPANS`, `frontend/src/portfolio/Sections.jsx:343`) or the card's hover lift.
- Do NOT remove `animate-fadeIn` from `frontend/src/index.css` — `ColdStartNote` and `Modal` still reference it.
- Do NOT add dependencies.
- If a step doesn't match the code you find (drift since 4a971ff), STOP and report.

## Verification

- **Mechanical**: from `frontend/`, `npx eslint .` exits 0; `npx vite build` succeeds.
- **Feel check**: `npm run dev`, open `http://localhost:5173/#work`, and confirm:
  - Clicking **Read more** grows the card smoothly; neighbouring cards in the same grid row resize along with it instead of jumping.
  - Clicking **Show less** collapses just as smoothly — this is the direction the old code could not do at all.
  - Toggling rapidly retargets mid-flight and never snaps to a hard open/closed state.
  - No text is clipped at the end of the expansion on the longest project description, and no empty gap remains under the short description when collapsed.
  - DevTools → Animations at 10% playback: the height interpolates continuously; there is no single-frame jump at the start or end.
  - DevTools → Rendering → `prefers-reduced-motion: reduce`: the description appears and disappears instantly, still fully readable.
- **Done when**: expanding and collapsing both animate, at 300ms, with no measured pixel heights anywhere in the diff.
