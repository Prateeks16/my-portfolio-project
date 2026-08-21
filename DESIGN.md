# Design

The world was not invented here. The public portfolio already had a coherent editorial identity — warm paper, near-black ink, Playfair Display set large and tight against Manrope text — and that identity is preserved and extended, not replaced. This file records it, and records how it bends to serve a dense working tool.

## Two surfaces, one world

| | Portfolio (`/`) | CRM (`/dashboard/*`) |
|---|---|---|
| Mode | Experience → Persuade | Operate |
| Reader | Recruiters, engineering peers, scanning | One operator, in a task, daily |
| Display type | Playfair Display, large | **Manrope only** — one family |
| Ground | Paper `#ECEBE9` | Paper `#F4F2EF`, white panels, ink sidebar |
| Density | Generous, long scroll | Dense, fixed rem scale |
| Motion | One authored reveal | State feedback only, 150–220ms |

The rule that keeps them one world: same paper, same ink, same warmth in every neutral, same drawn-icon vocabulary. The rule that keeps them apart: **Playfair never appears in the CRM except in the wordmark.** A display serif on a data label is costume. The tool disappears into the task; the portfolio does not.

## Color

Contrast figures are measured against the paper ground `#ECEBE9` rather than white, because that is the darker of the two surfaces text actually sits on. Every neutral is warm-shifted — there is no cool gray anywhere in either surface. A neutral borrowed from a default Tailwind slate would read as a foreign object against this paper.

```css
/* Ground */
--paper:        #ECEBE9;  /* portfolio ground */
--paper-app:    #F4F2EF;  /* CRM ground, one step lighter */
--surface:      #FFFFFF;  /* panels, rows, inputs */
--surface-sunk: #FAF9F7;  /* table headers, inset wells */
--ink-panel:    #1C1A17;  /* sidebar — warm charcoal, never black */

/* Ink */
--ink:          #171512;  /* primary text       — 16.4:1 on paper */
--ink-secondary:#57514A;  /* secondary text     —  6.5:1 on paper */
--ink-tertiary: #6B6259;  /* meta, placeholders —  5.0:1 on paper */
--line:         #E3DED6;  /* hairlines */
--line-strong:  #CFC7BC;  /* input borders */

/* Semantic — muted to sit inside a paper world, all ≥4.5:1 on white */
--success: #3F6B4A;   --success-bg: #EDF3EE;
--warning: #8A5A11;   --warning-bg: #FBF3E4;
--danger:  #8C3A2E;   --danger-bg:  #FAEDEA;
--info:    #3A5A78;   --info-bg:    #EDF2F7;
```

Accent discipline: the CRM has **no decorative accent**. Primary actions are ink on paper. Color appears only to carry state — a follow-up overdue, an email sent, a send that failed. Where every badge is colored, none of them mean anything, so the pipeline stages run from neutral at `new` to saturated only at the two terminal stages.

## Typography

**Portfolio.** Playfair Display 400/500/600 for display, Manrope 300–600 for text. Display headings cap at 6rem, tracking `-0.04em`, `text-wrap: balance`. Prose measure 65–75ch.

**CRM.** Manrope alone, on a fixed rem scale — never fluid. A clamp-sized heading that shrinks inside a panel looks worse, not better, and this surface is viewed at one consistent DPI.

| Role | Size | Weight | Notes |
|---|---|---|---|
| Page title | 1.5rem | 600 | `-0.02em` |
| Panel title | 1.0625rem | 600 | |
| Body / rows | 0.875rem | 400–500 | |
| Label / meta | 0.75rem | 500 | |
| Micro | 0.6875rem | 600 | uppercase, `0.08em` — column headers only |

Ratio ≈1.15 between steps. Exaggerated contrast makes noise in a surface with this many type elements.

**All numerals in data contexts carry `font-variant-numeric: tabular-nums`** so figures align down a column and don't jitter as they update.

## Browser surfaces

The parts not drawn still belong to the design. Themed globally in `index.css`: text selection (ink on a warm highlight), the caret, scrollbar thumb and track, focus rings, and underline offset. Browser defaults here belong to no design system and are the cheapest tell that a page was assembled rather than built.

Focus is never removed — `:focus-visible` draws a 2px ink ring at 2px offset on every interactive element. The CRM is operated at speed and must be fully keyboard-navigable.

## Depth and shape

Shadows carry a real offset and a soft blur; a zero-offset colored halo is decoration, not depth.

```css
--shadow-row:   0 1px 2px rgba(23,21,18,0.05);
--shadow-panel: 0 1px 3px rgba(23,21,18,0.06), 0 8px 24px -12px rgba(23,21,18,0.10);
--shadow-over:  0 12px 32px -8px rgba(23,21,18,0.22);
```

Radii: 8px controls, 12px panels, 999px badges. One vocabulary — a save button looks identical on every screen it appears on.

## Composition

**Cards are not the page structure.** A grid of same-size icon-heading-text tiles is the lazy container, and nested cards are always wrong. The CRM Overview is a **split cockpit**: a wider left column carrying the actionable work queue (follow-ups due, drafts awaiting review, leads gone quiet), and a narrower right rail carrying live signal (visits, inbound messages, recent sends). Cause on the left, effect on the right. Numbers live inline in a single summary line beneath the greeting, never as a row of hero-metric tiles.

Tables are tables: sticky header, hairline rows, no zebra striping, right-aligned numerics, whole row is the hit target.

**Modals are a last resort.** Lead detail is a route, not an overlay. Composing an email is a full working surface. An overlay is used only where focus genuinely must be protected — destructive confirmation, and the send confirmation.

Responsive behaviour is structural, not fluid: the sidebar collapses to a drawer under `lg`, the cockpit stacks to one column under `xl`, and tables become stacked rows under `md`.

## States

Every interactive component ships default, hover, focus, active, disabled, loading, error. Half a set is not a set.

Loading is a **skeleton in the shape of the content**, never a spinner floating in the middle of a panel. This is a hard requirement rather than a refinement: the backend is on a free Render tier and cold-starts can take ~60 seconds, so the loading state is a state real users will sit in, and after roughly eight seconds the skeleton says so in words.

Empty states teach the interface — what this screen is for and the one action that fills it — never "No data." Analytics history begins at deploy, so an empty chart is the expected first experience and says so honestly.

## Motion

150–220ms on state transitions, exponential ease-out from an already-visible default. No orchestrated page-load choreography: the tool loads into a task and nobody wants to watch it arrive.

**The one authored moment is the stage change.** Moving a lead through the pipeline is the act the whole tool exists to produce, so it is the one place motion is composed rather than merely functional: the row lifts, its stage badge cross-fades, and the board column count settles. Everything else — hover, panel entry, drawer — is plain and quick.

The portfolio gets exactly one authored reveal, on the hero, and section content thereafter appears on scroll without a repeated identical entrance.

`prefers-reduced-motion: reduce` collapses every transition to an opacity change at 0.01ms.

## Voice

Plain, first person, no superlatives. Controls name their action (`Save draft`, not `Submit`). Errors name the problem and the recovery: *"No SMTP credentials are set, so this draft was saved but not sent. Add them in Settings to enable sending."* Every claim on the public site resolves to a shipped artefact, a measured number, or a placement.
