# 002 — Give the CRM modal a real entrance and an exit

- **Status**: DONE (implemented, feel-check pending)
- **Commit**: 4a971ff
- **Severity**: HIGH
- **Category**: 4. Interruptibility / 8. Missed opportunities
- **Estimated scope**: 1 file, ~40 lines

## Problem

`Modal` unmounts the instant `open` flips false, so **there is no exit animation at all** — the dialog and its heavy scrim vanish in one frame. The entrance is only half-done: the panel fades, but the full-screen scrim (`bg-black/70 backdrop-blur-2xl`) snaps to full strength immediately, which is the most visually violent part of the transition.

```jsx
/* frontend/src/dashboard/components/ui.jsx:288-297 — current */
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-2xl">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx('bezel w-full animate-fadeIn shadow-over', width)}
      >
```

`animate-fadeIn` is also a **keyframe** animation (`frontend/src/index.css:271`), which restarts from zero if retriggered rather than retargeting from the current state.

This component backs **nine call sites**, including both surfaces where `DESIGN.md` says focus genuinely must be protected — destructive confirmation and send confirmation:

`frontend/src/dashboard/pages/Compose.jsx:459`, `:477`; `pages/Content.jsx:371`, `:432`; `pages/LeadDetail.jsx:374`; `pages/Leads.jsx:437`; `pages/Tasks.jsx:233`; `pages/Templates.jsx:157`, `:213`.

Modals are Occasional frequency, so a standard 200ms animation is in budget.

## Target

Keep the component mounted through the exit, drive both scrim and panel with **CSS transitions** (retargetable), and unmount only after the exit finishes.

```jsx
/* target — state shape */
const [render, setRender] = useState(open);   // is the DOM present
const [shown, setShown] = useState(false);    // are we in the settled state

useEffect(() => {
  if (open) {
    setRender(true);
    // one frame later so the browser paints the "from" state first
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }
  setShown(false);
  const timer = setTimeout(() => setRender(false), 150); // must match exit duration
  return () => clearTimeout(timer);
}, [open]);
```

```jsx
/* target — scrim */
className={cx(
  'fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-2xl',
  'transition-opacity ease-out',
  shown ? 'opacity-100 duration-200' : 'opacity-0 duration-150'
)}
```

```jsx
/* target — panel (replaces animate-fadeIn) */
className={cx(
  'bezel w-full shadow-over transition-all ease-out',
  shown ? 'translate-y-0 scale-100 opacity-100 duration-200' : 'translate-y-2 scale-[0.97] opacity-0 duration-150',
  width
)}
```

Values, fixed: enter 200ms, exit 150ms (exit is faster — the user has already decided), both on `ease-out` = `cubic-bezier(0.16, 1, 0.3, 1)`. Scale bottoms out at `0.97`, **never `scale(0)`**. `transform-origin` stays `center`: this is a modal, not a trigger-anchored popover, so centered growth is correct.

Reduced motion is already covered globally (`frontend/src/index.css:389-406` collapses every transition to 0.01ms), which leaves the opacity change intact and drops the movement — that is the desired behaviour, so **no per-component media query is needed**.

## Repo conventions to follow

- Easing tokens: `frontend/src/index.css:47-49`, mirrored to Tailwind at `frontend/tailwind.config.js:73-76`. `ease-out` = `cubic-bezier(0.16, 1, 0.3, 1)`; `ease-fluid` = `cubic-bezier(0.32, 0.72, 0, 1)`. Use the Tailwind class names, not arbitrary values.
- Class composition uses the `cx` helper from `frontend/src/lib/format.js`, already imported at `frontend/src/dashboard/components/ui.jsx:3`.
- Exemplar for a kept-mounted, transitioned overlay that already does this correctly in this repo: `frontend/src/dashboard/DashboardLayout.jsx:212-231` (mobile drawer + scrim, `pointer-events-none opacity-0` when closed, `transition-transform duration-700 ease-fluid`). Imitate that pattern; the modal differs only in also needing the delayed unmount, because it must not sit in the DOM permanently.

## Steps

1. In `frontend/src/dashboard/components/ui.jsx`, add the `render` / `shown` state and the `useEffect` above to `Modal`, replacing the bare `if (!open) return null;` at line 288 with `if (!render) return null;`.
2. Keep the existing Escape-key and `document.body.style.overflow = 'hidden'` effect (lines 279-287) keyed on `open` — body scroll must unlock the moment the user dismisses, not 150ms later.
3. Apply the scrim classes from the Target section to the outer `<div>` (line 290).
4. Replace `animate-fadeIn` on the dialog `<div>` (line 295) with the transition classes from the Target section.
5. Confirm no other component depends on `Modal` unmounting synchronously — grep `<Modal` across `frontend/src/dashboard/` and check that no call site does cleanup in a `useEffect` keyed on the modal being gone.

## Boundaries

- Do NOT change the modal's markup structure, ARIA attributes, header, or close button.
- Do NOT change any of the nine call sites — the fix is entirely inside `Modal`.
- Do NOT add `transform-origin` tracking; modals stay centered.
- Do NOT convert `animate-fadeIn` globally — other components (`ColdStartNote`, project Read-more) still use it and are out of scope here.
- Do NOT add a focus-trap, a portal, or a dependency. Motion only.
- If a step doesn't match the code you find (drift since 4a971ff), STOP and report.

## Verification

- **Mechanical**: from `frontend/`, `npx eslint .` exits 0; `npx vite build` succeeds.
- **Feel check**: `npm run dev`, sign in, open `/dashboard/tasks` → **New task**, then dismiss with Escape, with the close button, and by clicking the scrim. Confirm:
  - On open, the scrim's blur/darkness **ramps** rather than snapping, and the panel rises slightly while scaling up from 0.97.
  - On close, the panel and scrim animate out together and the DOM node disappears only after — no flash of a scrimless dialog, no dialog left behind.
  - Body scroll unlocks immediately on dismiss, not after the fade.
  - Rapidly toggling the modal open/closed retargets smoothly and never restarts from a hard `opacity: 0` snap.
  - DevTools → Animations panel at 10% playback: the panel scales from `0.97`, not from `0`, and moves at most a few px.
  - DevTools → Rendering → `prefers-reduced-motion: reduce`: the modal appears and disappears essentially instantly, with no movement — and critically, **still disappears** (the unmount timer must not depend on a transition event firing).
- **Done when**: all nine call sites animate in and out, `animate-fadeIn` no longer appears in `Modal`, and dismissal works via Escape, button, and scrim click.
