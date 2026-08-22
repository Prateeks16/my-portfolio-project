# Design

The site runs one aesthetic across two surfaces: **Ethereal Glass**. Deepest OLED black as ground, a fixed radial mesh of emerald and violet behind everything, film grain over everything, and content carried on vantablack glass plates seated in machined trays. Wide geometric grotesk for display, humanist grotesk for text. Nothing sits flat, nothing moves on a default curve, nothing appears without arriving.

This replaces the earlier warm-paper editorial identity outright. Where the two disagreed — nested enclosures, orchestrated entrances, bento composition — the glass language wins, and this file records the new rules rather than the old ones.

## Two surfaces, one world

| | Portfolio (`/`) | CRM (`/dashboard/*`) |
|---|---|---|
| Mode | Experience → Persuade | Operate |
| Reader | Recruiters, engineering peers, scanning | One operator, in a task, daily |
| Ground | Void `#050505` | Void `#08080A` |
| Display type | Space Grotesk, to 8.5rem | Space Grotesk, wordmark and page titles only |
| Enclosure | `.bezel` — 2rem shell, 1.625rem core | `.bezel-sm` — 1.125rem shell, 0.875rem core |
| Density | Generous, `py-24`–`py-40` | Dense, fixed rem scale |
| Motion | Scroll interpolation throughout | State feedback, 150–500ms |

Same void, same mesh, same grain, same hairlines, same pill vocabulary. The tool is the quieter room in the same building: it keeps the enclosures and the physics, and trades the macro-whitespace for density.

## Color

Every value is measured against `--surface` `#0C0C0F`, the ground text actually sits on. The ink scale **inverts** from the paper era: `ink` is now the brightest foreground, `ink-tertiary` the quietest.

```css
/* Ground */
--paper:        #050505;  /* portfolio ground — deepest OLED black */
--paper-app:    #08080A;  /* CRM ground */
--surface:      #0C0C0F;  /* card cores, panels, rows */
--surface-sunk: #101014;  /* inset wells */
--ink-panel:    #08080B;  /* sidebar rail */

/* Ink — inverted for an OLED ground */
--ink:           #F4F4F7;  /* primary text    — 17.8:1 on surface */
--ink-secondary: #A4A4B0;  /*                 —  7.9:1 on surface */
--ink-tertiary:  #7C7C8A;  /* meta            —  4.8:1 on surface */
--on-accent:     #050505;  /* text on a light pill */

/* Hairlines are white at low alpha. Held as solid hex in the Tailwind theme so
   the opacity modifiers already used across the app (`border-line/40`) compile. */
--line:        rgba(255,255,255,0.08);   /* theme: #1E1E23 */
--line-strong: rgba(255,255,255,0.16);   /* theme: #2F2F38 */

/* Mesh — two orbs, fixed, never animated */
--orb-emerald: rgba(16,185,129,0.16);
--orb-violet:  rgba(139,92,246,0.15);

/* Semantic — lifted for a dark ground, all >=4.5:1 on surface */
--success: #5CD69A;  --success-bg: #0F2019;
--warning: #F2C260;  --warning-bg: #241C0D;
--danger:  #FB8B8B;  --danger-bg:  #251315;
--info:    #86CDF2;  --info-bg:    #0E1E28;
```

Accent discipline is unchanged and still absolute: **emerald and violet exist only in the background mesh.** They are never a fill, a border, a badge, or a button. Primary actions are a bright pill on void. Color inside the interface appears only to carry state — a follow-up overdue, a send that failed. The pipeline stages run a single white ramp, `color-mix` from hairline to bright, so progress is legible without assigning a decorative colour to every stage.

## Typography

**Space Grotesk** for display — wide, geometric, set tight (`-0.045em` at hero scale, `line-height: 0.88`). **Plus Jakarta Sans** for everything else. No serif anywhere; no Inter, Roboto, Helvetica, Arial, or Open Sans anywhere.

**Portfolio.** Hero caps at 8.5rem via `.display-xl`, `text-wrap: balance`. Section headings 2.5rem → 4rem via `.display-face`. Prose measure 68ch. Every major heading is preceded by an `.eyebrow` — a pill-shaped badge at `0.625rem`, `tracking: 0.2em`, uppercase.

**CRM.** Space Grotesk on the wordmark and page titles only; Plus Jakarta Sans everywhere else, on a fixed rem scale — never fluid.

| Role | Size | Weight | Notes |
|---|---|---|---|
| Page title | 1.5rem | 600 | `.display-face`, `-0.02em` |
| Panel title | 1.0625rem | 600 | |
| Body / rows | 0.875rem | 400–500 | |
| Label / meta | 0.75rem | 500 | |
| Micro | 0.6875rem | 600 | uppercase, `0.08em` |
| Field label | 0.625rem | 500 | uppercase, `0.16em` |

**All numerals in data contexts carry `font-variant-numeric: tabular-nums`.**

## Atmosphere

Two fixed, `pointer-events-none` layers own the depth of the page, and neither ever repaints with the scroll:

- `body::before` — three baked radial gradients (emerald, violet, emerald). Gradients, not a blur filter, so the mesh costs nothing on a mobile GPU.
- `body::after` — an inlined SVG fractal-noise tile at `opacity: 0.035`, `z-index: 100`. It sits above every layer including modals, because it is the texture of the screen itself rather than of any one surface.

**The name magnifies under the cursor.** The hero name is split one span per character so a Dock-style bulge can travel along it: each letter's scale falls off from the cursor on a Gaussian, and each is pushed right by the width its predecessors gained, so magnified letters make room for each other instead of colliding. Letters anchor to their left baseline — growing from the centre drifts the line vertically. The letter springs are critically damped, unlike everything else here: bounce belongs to motion that carried momentum, and a cursor gliding across a word carries none. The spans are hidden from assistive tech and the wrapper carries the real string, so the name is still announced as a name.

**A pool of light follows the cursor.** Across the whole portfolio, a radial gradient in the mesh's own emerald and violet tracks the pointer on a spring, screen-blended so it *adds* light to the ground rather than veiling the content — white text screened with a tint stays white while the void behind it lifts. The element is sized to its gradient rather than the viewport on purpose: `mix-blend-mode` makes the browser re-composite everything beneath the blended box every frame, so bounding the box bounds the cost. It never appears in the CRM.

**Light moves on the portfolio.** A soft white orb tracks the cursor across the Work and Recognition cards, clipped to each card's core — the plates are lit glass, so the light should not be painted on. The hero's two glass plates — the portrait and the Elsewhere card — lean toward the cursor in 3D and magnify slightly while it is over them, at 7-10deg of tilt: past roughly ten the plate stops reading as hardware catching light and starts reading as a novelty. The two hero pills drift up to 6px toward the cursor and spring back when it leaves — Every one of them is integrated per frame through the same spring (stiffness 0.14, damping 0.74) rather than pinned to the cursor, because a position with no motion of its own reads as artificial. The lag on the way out and the small overshoot on release are the whole effect. Both are decoration, so both refuse to attach at all on a coarse pointer (a tap fires a false hover) or under `prefers-reduced-motion`, and neither exists anywhere in the CRM: that surface is a tool, and a tool should not react to being looked at. Position is written straight onto the moving element's `transform` and throttled to one write per frame; driving it through a custom property on the card would restyle every child on every move.

`backdrop-blur` appears only on fixed or sticky elements — the nav island, the menu overlay, the sidebar rail, the modal scrim. Never on a scrolling container.

## Depth and shape

Depth is an inner highlight plus a wide ambient fall. A hard dark shadow on a dark ground reads as dirt, and a zero-offset colored halo is decoration, not depth.

```css
--shadow-row:   inset 0 1px 0 rgba(255,255,255,0.04);
--shadow-panel: inset 0 1px 0 rgba(255,255,255,0.06), 0 24px 60px -28px rgba(0,0,0,0.9);
--shadow-over:  inset 0 1px 0 rgba(255,255,255,0.08), 0 40px 90px -24px rgba(0,0,0,0.95);
--edge:         inset 0 1px 1px rgba(255,255,255,0.15);   /* the core's top edge */
```

**The double bezel.** Nothing premium sits flatly on the ground. A card is a glass plate in an aluminium tray: an outer shell carrying the hairline and the ambient fall, an inner core carrying the content, its own `--edge` highlight, and a mathematically smaller radius so the curves stay concentric.

```
.bezel     2rem shell, 0.375rem padding   →  .bezel-core     calc(2rem - 0.375rem)
.bezel-sm  1.125rem shell, 0.25rem padding →  .bezel-sm-core  calc(1.125rem - 0.25rem)
```

Radii otherwise: 10px controls, 16px panels, 999px pills and badges.

## Composition

**Portfolio — asymmetrical bento.** Work and Recognition run a six-column grid whose spans alternate wide/narrow (`4,2,2,4`), so no two rows read the same. Every card carries a plate so no cell reads as unfinished — `16/9` on wide cards, `4/3` on narrow. Backend and infrastructure work has nothing to screenshot and a grey box reads as a broken image, so a project without one gets a **drawn plate**: a hairline field (rings, diagonals, dot grid or rules) chosen deterministically from a hash of the title, a soft top-left glow, and the project's monogram cut out of the glass at 12% white. Same title always draws the same plate. Every span collapses to a single column below `md`, with `w-full` and `px-4`.

**CRM — split cockpit, unchanged.** A wider left column carrying the actionable work queue and a narrower right rail carrying live signal. Cause on the left, effect on the right. Numbers live inline in a single summary line beneath the greeting, never as a row of hero-metric tiles. Tables are tables: sticky header, hairline rows, no zebra striping, right-aligned numerics, whole row is the hit target.

**Modals are still a last resort.** Lead detail is a route. Composing an email is a full working surface. An overlay is used only for destructive confirmation and send confirmation.

Responsive behaviour is structural: the sidebar rail collapses to a drawer under `lg`, the cockpit stacks under `xl`, tables become stacked rows under `md`. Full-height sections use `min-h-[100dvh]`, never `h-screen`, so iOS Safari does not jump.

## Controls

**The island pill.** Primary actions are fully rounded pills that press — `active:scale-[0.98]` over 500ms. A trailing glyph never sits naked beside its label: it lives in its own circular well flush with the pill's right padding, and on hover the well translates diagonally and scales to 105% while the pill itself compresses. That internal tension is the whole gesture. `Pill` on the portfolio, `Button icon={…}` in the CRM.

**Icons are drawn, not stamped.** One base rule — `svg.lucide { stroke-width: 1.25px }` — makes every icon in the app an ultra-light precise line, so no call site repeats it and no thick default stroke survives.

Focus is never removed: `:focus-visible` draws a 2px light ring at 2px offset on every interactive element. Both surfaces must be fully keyboard-navigable.

## States

Every interactive component ships default, hover, focus, active, disabled, loading, error. Half a set is not a set.

Loading is a **skeleton in the shape of the content** — a slow sweep across glass, never a spinner. The backend is on a free Render tier and cold-starts can take ~60 seconds, so after eight seconds the skeleton says so in words. Empty states teach the interface — what the screen is for and the one action that fills it — never "No data."

## Motion

Everything moves on `--ease-fluid` `cubic-bezier(0.32,0.72,0,1)` or `--ease-out` `cubic-bezier(0.16,1,0.3,1)`. No `linear`, no `ease-in-out`, no instant state change.

**Portfolio — scroll interpolation.** Nothing appears statically. Elements rest in `.reveal` (`translateY(2.5rem)`, `blur(8px)`, `opacity 0`) and are promoted to `.is-revealed` over 900ms by a **single IntersectionObserver** for the whole page, then unobserved. Never a scroll listener: one fires every frame and forces reflow, which is exactly what kills entry animation on mobile. Groups stagger through a `--d` delay per child. The hero arrives on `.animate-riseIn` with its own delay ladder.

**Nav.** A floating glass island detached from the top edge, never a bar welded to it. The hamburger's two lines rotate and translate into a true X rather than swapping icons, and the overlay stays mounted so its links interpolate out as well as in — each fading up from `translate-y-12` on a 50ms stagger.

**CRM.** State feedback only, 150–500ms. The one authored moment is still the stage change: the row lifts, its badge cross-fades, the column count settles.

Only `transform`, `opacity` and `filter` are animated — never `top`, `left`, `width` or `height`. `will-change` is set on `.reveal` and released the moment it resolves.

`prefers-reduced-motion: reduce` collapses every transition to 0.01ms and resolves `.reveal` to its visible state immediately.

## Voice

Plain, first person, no superlatives. Controls name their action (`Save draft`, not `Submit`). Errors name the problem and the recovery: *"No SMTP credentials are set, so this draft was saved but not sent. Add them in Settings to enable sending."* Every claim on the public site resolves to a shipped artefact, a measured number, or a placement.
