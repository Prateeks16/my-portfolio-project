# 006 — Let a completed task leave the list instead of vanishing

- **Status**: DONE (implemented, feel-check pending)
- **Commit**: 4a971ff
- **Severity**: MEDIUM
- **Category**: 8. Missed opportunities (feedback)
- **Estimated scope**: 1 file, ~30 lines

## Problem

Checking a task off removes its row from the rendered list in the same frame as the click. The list jumps closed, and nothing confirms which row the checkbox actually applied to — the only feedback is that something disappeared.

The row is filtered out because `visible` is derived, and `toggle` optimistically flips `is_done` before the request resolves:

```jsx
/* frontend/src/dashboard/pages/Tasks.jsx:45-53 — current */
  const toggle = async (task) => {
    const next = !task.is_done;
    setData(tasks.map((row) => (row.id === task.id ? { ...row, is_done: next } : row)));
    try {
      await api.patch(`/crm/tasks/${task.id}/`, { is_done: next });
    } catch (caught) {
      setData(tasks);
      window.alert(apiError(caught));
    }
```

```jsx
/* frontend/src/dashboard/pages/Tasks.jsx:66 — current */
  const visible = showDone ? done : open;
```

```jsx
/* frontend/src/dashboard/pages/Tasks.jsx:128-136 — current */
          <ul className="divide-y divide-line">
            {visible.map((task) => {
              …
              return (
                <li key={task.id} className="flex items-start gap-3 px-4 py-3.5">
```

This is a **Tens/day** interaction for the single operator who uses this tool. That tier permits only near-imperceptible motion: fast, subtle, and never something they wait through.

## Target

Hold the row for 160ms while it fades and slides a short distance, then let the derived filter remove it. 160ms on `ease-out` = `cubic-bezier(0.16, 1, 0.3, 1)` — the press-feedback budget, deliberately at the bottom of the range.

```jsx
/* target — state */
const [leaving, setLeaving] = useState(null); // task id currently animating out

/* target — inside toggle, before the optimistic setData */
setLeaving(task.id);
setTimeout(() => setLeaving(null), 160);
```

```jsx
/* target — keep the leaving row in the list for one beat */
const visible = useMemo(() => {
  const base = showDone ? done : open;
  if (leaving === null) return base;
  const held = tasks.find((row) => row.id === leaving);
  return held && !base.some((row) => row.id === leaving) ? [...base, held] : base;
}, [showDone, done, open, leaving, tasks]);
```

```jsx
/* target — row classes */
<li
  key={task.id}
  className={cx(
    'flex items-start gap-3 px-4 py-3.5 transition-all duration-[160ms] ease-out',
    leaving === task.id ? 'translate-x-1.5 opacity-0' : 'translate-x-0 opacity-100'
  )}
>
```

Fixed values: `160ms`, `ease-out`, `translateX(6px)` (`translate-x-1.5`), opacity to 0. **No height collapse** — the row's height snapping shut after the fade is acceptable and far cheaper than animating layout on a list the operator hits all day.

The held row is appended rather than spliced into position, which is correct: it is on its way out, and the surviving rows should already have closed ranks behind it by the time it finishes fading.

If the PATCH fails, `setData(tasks)` restores the row (line 51) and `leaving` has already cleared, so the row simply reappears — no special rollback path is needed.

Reduced motion is handled globally at `frontend/src/index.css:389-406`: transitions collapse to 0.01ms, so the row leaves immediately. The 160ms `setTimeout` still runs, which means a ~160ms delay before removal under reduced motion — acceptable, and not worth branching on `matchMedia` for.

## Repo conventions to follow

- Easing tokens: `frontend/src/index.css:47-49`, mirrored at `frontend/tailwind.config.js:73-76`. Use Tailwind's `ease-out`; `duration-[160ms]` is an arbitrary value because 160 is not on Tailwind's default scale — that is expected here.
- `cx` from `frontend/src/lib/format.js` is already imported at `frontend/src/dashboard/pages/Tasks.jsx`.
- The repo's precedent for a single authored row-level moment is `animate-stageSettle` (`frontend/src/index.css:310-326`), used at `frontend/src/dashboard/pages/Leads.jsx:258` and `pages/LeadDetail.jsx:154`. **Do not reuse it here** — it is reserved for the pipeline stage change, which `DESIGN.md` names as the one authored moment in the CRM. This exit must feel plainer than that.
- `useMemo` is already used in this file's derivations; match the existing style.

## Steps

1. In `frontend/src/dashboard/pages/Tasks.jsx`, add the `leaving` state alongside the existing state declarations.
2. In `toggle` (line 45), set `leaving` to the task id and schedule the 160ms clear **before** the optimistic `setData` call. Do not await anything before the visual change starts.
3. Replace the `visible` derivation at line 66 with the `useMemo` version from the Target section. Import `useMemo` if it is not already imported.
4. Apply the row classes from the Target section to the `<li>` at line 136.
5. Confirm the empty-state branch (lines 111-127) still triggers correctly — when the last open task is checked, the list should briefly show the fading row, then the `EmptyState`.

## Boundaries

- Do NOT animate the row's height, padding, or margin.
- Do NOT add a stagger, a strike-through animation, or a checkbox flourish.
- Do NOT reuse `animate-stageSettle`.
- Do NOT change the optimistic-update or error-rollback behaviour in `toggle`.
- Do NOT apply this pattern to `Leads`, `Outreach`, `Templates`, or `Content` — their list mutations are out of scope.
- Do NOT add dependencies.
- If a step doesn't match the code you find (drift since 4a971ff), STOP and report.

## Verification

- **Mechanical**: from `frontend/`, `npx eslint .` exits 0 (watch for an exhaustive-deps warning on the new `useMemo` — satisfy it, do not suppress it); `npx vite build` succeeds.
- **Feel check**: `npm run dev`, sign in, open `/dashboard/tasks`, and confirm:
  - Checking a task makes that row fade and drift slightly right, then close. The motion is short enough that it never feels like waiting.
  - Checking several tasks in quick succession works — each row leaves on its own and none get stuck visible. If a row sticks, `leaving` is being overwritten; it holds one id at a time by design, so confirm rapid clicks still resolve.
  - Toggling **Show done** still lists completed tasks correctly, and unchecking one there animates it out the same way.
  - Checking the last open task shows the fading row, then the `No open tasks` empty state — not a flash of empty followed by the row.
  - With the backend stopped, checking a task shows the fade, then the alert, then the row returns.
  - DevTools → Animations at 10% playback: the row moves ~6px, no scale, no height change.
- **Done when**: rows leave with a 160ms fade-and-drift, rapid completions all resolve, and the failure path still restores the row.
