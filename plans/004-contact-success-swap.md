# 004 — Bridge the contact form's swap to its success state

- **Status**: DONE (implemented, feel-check pending)
- **Commit**: 4a971ff
- **Severity**: MEDIUM
- **Category**: 8. Missed opportunities (delight, rare tier)
- **Estimated scope**: 1 file, ~15 lines

## Problem

Submitting the contact form replaces the entire form with the success block in a single frame. This is the one conversion the public site exists to produce — a recruiter deciding to make contact — and it lands completely flat. The panel also changes height sharply as a tall form is swapped for a short confirmation.

```jsx
/* frontend/src/portfolio/Portfolio.jsx:249-251 — current */
              {state === 'sent' ? (
                <div className="flex items-start gap-3.5 rounded-panel border border-success/25 bg-success-bg px-5 py-6">
                  <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-success" />
```

`state` is `'idle' | 'sending' | 'sent'` (`frontend/src/portfolio/Portfolio.jsx:180`); `'sent'` is set at line 192 after the POST resolves, and the **Send another** button at line 262 returns it to `'idle'`, so the swap runs in both directions.

Frequency is Rare / first-time — this is exactly where the delight budget is allowed to be spent.

## Target

Mount the success block on entry with a short rise-and-fade. A 400ms beat is permitted here because it is a rare, high-emotion moment, not repeated UI.

```jsx
/* target — success block wrapper */
<div
  className="animate-riseIn flex items-start gap-3.5 rounded-panel border border-success/25 bg-success-bg px-5 py-6"
  style={{ animationDuration: '400ms' }}
  role="status"
  aria-live="polite"
>
```

`animate-riseIn` already exists (`frontend/src/index.css:283-299`): `translateY(2.5rem)` + `blur(10px)` + `opacity: 0` → settled, on `--ease-fluid`. Its default 900ms is a hero-scale duration; override to **400ms** for this panel-scale moment. Blur stays at 10px, comfortably under the 20px ceiling where blur gets expensive.

The `role="status"` / `aria-live="polite"` addition is deliberate: once the confirmation animates in rather than appearing instantly, screen-reader users need it announced explicitly.

Do **not** animate the form's exit. The form is unmounted by the ternary; adding an exit would require holding the submitted form on screen after the user is done with it, and would delay the confirmation they are waiting for.

Reduced motion is covered globally at `frontend/src/index.css:389-406`, which collapses the animation to 0.01ms — the confirmation still appears, just without the movement.

## Repo conventions to follow

- Motion utilities live in `@layer utilities` of `frontend/src/index.css`; `animate-riseIn` is already the repo's entrance animation and is used with per-element delay overrides throughout the hero — exemplar: `frontend/src/portfolio/Sections.jsx:145-148`, which sets `style={{ animationDelay: '120ms' }}` on an `animate-riseIn` element. Overriding `animationDuration` inline follows the same established pattern.
- Easing tokens: `frontend/src/index.css:47-49`. `animate-riseIn` already uses `var(--ease-fluid)`; do not add a curve.
- Voice for any new copy: plain, first person, no superlatives (`DESIGN.md` → **Voice**). No new copy is required by this plan.

## Steps

1. In `frontend/src/portfolio/Portfolio.jsx:250`, add `animate-riseIn` to the success `<div>`'s class list, plus `style={{ animationDuration: '400ms' }}`, `role="status"` and `aria-live="polite"`.
2. Leave the `state` machine, the POST handler (lines 185-199), the `trackEvent('contact_submit', …)` call, and the **Send another** button untouched.
3. Confirm the error path is unaffected: the `error` paragraph at line 270 is inside the form branch and is covered by plan 005, not this one.

## Boundaries

- Do NOT animate the form's exit or hold the form mounted after submit.
- Do NOT add a spinner, confetti, checkmark-draw, or any celebratory flourish beyond the rise-and-fade. The design language is restrained glass; the delight budget here buys one gentle entrance, not a moment.
- Do NOT change `animate-riseIn`'s definition in `frontend/src/index.css` — the hero depends on its 900ms default.
- Do NOT touch the CRM.
- Do NOT add dependencies.
- If a step doesn't match the code you find (drift since 4a971ff), STOP and report.

## Verification

- **Mechanical**: from `frontend/`, `npx eslint .` exits 0; `npx vite build` succeeds.
- **Feel check**: `npm run dev`, open `http://localhost:5173/#contact`. The backend must be reachable for a real success; if it is not, temporarily force the branch by editing nothing and instead using React DevTools to set `state` to `'sent'`. Confirm:
  - The confirmation rises and sharpens into place over roughly a third of a second — noticeably gentler than the rest of the page's UI feedback, but not slow enough to make the user wait to read it.
  - Clicking **Send another** returns to the form, and submitting again replays the entrance (it should — the element remounts).
  - The panel's height change is visible but not violent; the surrounding bezel does not shudder.
  - DevTools → Animations at 10% playback: the block starts blurred and 2.5rem low, and lands with no overshoot.
  - DevTools → Rendering → `prefers-reduced-motion: reduce`: the confirmation appears immediately, sharp and in place.
  - With a screen reader (or Chrome's Live Expression on `document.activeElement` plus an ARIA inspector), the confirmation is announced when it appears.
- **Done when**: the success block animates in at 400ms, announces itself politely, and the form's behaviour is otherwise byte-identical.
