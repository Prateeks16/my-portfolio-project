# 005 — Bridge the two CRM content swaps that teleport

- **Status**: DONE (implemented, feel-check pending)
- **Commit**: 4a971ff
- **Severity**: MEDIUM
- **Category**: 8. Missed opportunities (preventing a jarring change)
- **Estimated scope**: 3 files, ~30 lines

## Problem

Two conditionally-rendered CRM surfaces appear with no bridge at all. They share one fix pattern, so they share one plan.

**A. The Inbox reading pane.** Selecting a message mounts an entire second panel below the list; switching between messages replaces the body text in place, so a wall of text is swapped for a different wall of text with nothing connecting them.

```jsx
/* frontend/src/dashboard/pages/Inbox.jsx:124-127 — current */
          {selected && (
            <Panel>
              <header className="border-b border-line px-5 py-4">
                <h2 className="text-panel font-semibold text-ink">{selected.subject}</h2>
```

**B. Alert and flash notes.** `ErrorNote` and `Note` mount straight into the document flow and shove everything below them down, with no indication that something new arrived.

```jsx
/* frontend/src/dashboard/components/ui.jsx:239-244 — current */
export const ErrorNote = ({ children, onRetry }) =>
  children ? (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-control border border-danger/25 bg-danger-bg px-3.5 py-3 text-body text-danger"
    >
```

```jsx
/* frontend/src/dashboard/pages/Compose.jsx:260-262 — current */
      {flash && !error && (
        <div className="mb-5">
          <Note tone="success">
```

Both are Occasional frequency — an error, a send confirmation, opening a message — so a short entrance is in budget. Neither may become slow: this is an operator tool.

## Target

One shared entrance: fade plus a small rise, 150ms, `ease-out` = `cubic-bezier(0.16, 1, 0.3, 1)`. Reuse the existing `animate-fadeIn` utility, which is exactly this shape already.

```css
/* frontend/src/index.css:265-280 — existing, unchanged */
.animate-fadeIn { animation: fadeIn 0.28s var(--ease-fluid) forwards; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
```

Override the duration to 150ms per use so the operator surfaces stay snappier than the 280ms default:

```jsx
/* target — pattern for both */
className={cx('animate-fadeIn', …existing classes)}
style={{ animationDuration: '150ms' }}
```

**A. Inbox pane** additionally needs a `key` so that switching messages replays the entrance instead of silently swapping text:

```jsx
/* target */
{selected && (
  <div key={selected.id} className="animate-fadeIn" style={{ animationDuration: '150ms' }}>
    <Panel>
      …unchanged…
    </Panel>
  </div>
)}
```

The wrapper carries the animation rather than `Panel` itself, so the `.bezel-sm` tray and its hairline are not re-created on every selection.

**B. `ErrorNote` and `Note`** get the same two attributes on their existing root `<div>`s. Do not animate their height or margin — the layout shift below them is accepted; only the note itself fades and rises. Animating the surrounding gap would move unrelated content and cost more than it buys.

`ErrorNote` already carries `role="alert"`, so it is announced regardless of the animation. `Note` is decorative-adjacent and needs no ARIA change.

Reduced motion is covered globally at `frontend/src/index.css:389-406` (all animations collapse to 0.01ms), so no per-component media query is required.

## Repo conventions to follow

- `cx` from `frontend/src/lib/format.js` composes classes; already imported in all three target files.
- Inline `animationDuration` / `animationDelay` overrides on an existing animation utility are the established pattern in this repo — exemplar: `frontend/src/portfolio/Sections.jsx:145-148`.
- `ColdStartNote` (`frontend/src/dashboard/components/ui.jsx:207-211`) already uses bare `animate-fadeIn` on a CRM surface; that is the closest existing precedent for what these notes should feel like.
- Easing tokens: `frontend/src/index.css:47-49`, mirrored at `frontend/tailwind.config.js:73-76`.

## Steps

1. In `frontend/src/dashboard/pages/Inbox.jsx:124`, wrap the `<Panel>` in the keyed `<div>` from the Target section. Keep the `{selected && …}` condition and everything inside `Panel` unchanged.
2. In `frontend/src/dashboard/components/ui.jsx:239-247`, add `animate-fadeIn` and `style={{ animationDuration: '150ms' }}` to the `ErrorNote` root `<div>`. The class list is a plain string today — convert it to `cx('animate-fadeIn', '…')` or append the class inline, whichever matches the surrounding style.
3. In `frontend/src/dashboard/components/ui.jsx:252-266`, do the same for the `Note` root `<div>` (it uses `cx` already).
4. Do not edit `frontend/src/dashboard/pages/Compose.jsx` — its `flash` block renders `Note`, so it inherits the entrance from step 3. Verify this by reading `Compose.jsx:260-267` after the change; if the flash still appears instantly, the class landed on the wrong element.

## Boundaries

- Do NOT add exit animations to any of these. `ErrorNote` clears on retry and `Note` on state change; holding a stale error on screen while it fades is worse than removing it.
- Do NOT animate height, margin, or `padding` on the notes.
- Do NOT touch `LoadingPanel`, `SkeletonRows`, or the skeleton-to-content swap — fading real data in after a cold start is explicitly rejected; the operator wants the data in the frame it arrives.
- Do NOT add a stagger to the Inbox message list.
- Do NOT change `animate-fadeIn`'s definition — `Modal` and `ColdStartNote` depend on its default.
- Do NOT add dependencies.
- If a step doesn't match the code you find (drift since 4a971ff), STOP and report.

## Verification

- **Mechanical**: from `frontend/`, `npx eslint .` exits 0; `npx vite build` succeeds.
- **Feel check**: `npm run dev`, sign in, and confirm:
  - `/dashboard/inbox` — clicking a message fades the reading pane in; **clicking a second message replays the fade** rather than silently swapping the text. If it does not replay, the `key` is missing or on the wrong element.
  - The pane's entrance is quick enough that reading is not delayed — if it feels like waiting, the duration override did not apply.
  - Trigger an error (stop the backend, then hit **Retry** on any page): the red note fades and rises in rather than snapping.
  - `/dashboard/outreach/compose` — save a draft and confirm the green flash note animates identically to the error note.
  - DevTools → Animations at 10% playback: both notes rise ~6px, no scale, no blur.
  - DevTools → Rendering → `prefers-reduced-motion: reduce`: all three appear instantly and remain fully legible; the `role="alert"` note is still announced.
- **Done when**: the Inbox pane replays on every selection change, both note types animate at 150ms, and nothing about loading states changed.
