# BikeFit - UX/UI Design Standard

Version 1.0 | 2026-07-03 | Authoritative for all UI decisions. PRD wins on scope and fit-method facts; this document wins on UI.

---

## 1. Brand personality and the premium bar

BikeFit should feel like a **precision instrument, not a form**. Reference points: Swiss cycling computer UIs, Wahoo/Whoop onboarding, Linear's calm density, a well-set technical drawing. The premium feel comes from restraint executed perfectly, not from decoration.

The five things that make it feel premium (enforceable, not vibes):
1. **One accent colour, used sparingly.** If everything glows, nothing does.
2. **Tabular numerals and generous whitespace around every measurement.** Numbers are the product; give them typographic respect.
3. **Motion that acknowledges, never entertains.** 150–250 ms ease-out transitions, one springy moment reserved for the results reveal.
4. **Zero jank.** No layout shift, no spinner flashes under 300 ms, skeletons match final layout exactly.
5. **Copy that sounds like a calm expert.** Short sentences. Second person. No exclamation marks in instructions. No em dashes.

---

## 2. Design tokens

Implemented as CSS custom properties in `app/globals.css`, consumed via Tailwind v4 `@theme`. **No hardcoded colors, spacing, radii, or shadows anywhere in components.** Both themes are first-class; `system` is the default, persisted via a `theme` value in localStorage and mirrored to a cookie for SSR class application.

### 2.1 Colour: dark theme (values are the spec; tune only in a dedicated polish pass)
| Token | Value | Use |
|-------|-------|-----|
| `--bg` | `#0B0F14` | App background (near-black, blue-cast) |
| `--surface` | `#121821` | Cards, wizard panel |
| `--surface-2` | `#1A2230` | Raised elements, popovers |
| `--ink` | `#E8EDF4` | Primary text |
| `--ink-muted` | `#8A97A8` | Secondary text, labels |
| `--line` | `#232D3D` | Borders, dividers |
| `--accent` | `#3DDC97` | Primary actions, progress, the "start here" marker. A confident green (precision + go) |
| `--accent-ink` | `#062B1D` | Text on accent |
| `--warn` | `#E8B34B` | Caution flags, out-of-range confirms |
| `--danger` | `#E5645F` | Destructive actions only |

### 2.2 Colour: light theme
| Token | Value |
|-------|-------|
| `--bg` | `#F7F8FA` |
| `--surface` | `#FFFFFF` |
| `--surface-2` | `#EFF2F6` |
| `--ink` | `#101820` |
| `--ink-muted` | `#5A6676` |
| `--line` | `#DEE3EA` |
| `--accent` | `#0E9F6E` (darker green for contrast on white) |
| `--accent-ink` | `#FFFFFF` |

Contrast rule: every ink-on-surface pair ≥ 4.5:1; accent-ink on accent ≥ 4.5:1. Verify with a check in the polish phase.

### 2.3 Typography
- **UI + body:** Geist Sans (free, self-hosted via `next/font`, zero external requests).
- **Numbers/measurements:** Geist Mono with `font-variant-numeric: tabular-nums` for every measurement, range, and unit display. This single rule does more for the instrument feel than anything else.
- Scale (rem): display 2.5 / h1 2.0 / h2 1.5 / h3 1.25 / body 1.0 / small 0.875 / micro 0.75. Line-height 1.5 body, 1.2 headings.
- Measurement display pattern: large mono number + small muted unit, e.g. **72.4** cm.

### 2.4 Spacing, radius, elevation, motion
- Spacing scale: 4 px base (Tailwind default). Screen gutters: 16 px mobile, 24 px desktop. Card padding: 20–24 px.
- Radius: `--radius-sm: 8px` (inputs, chips), `--radius-md: 12px` (cards), `--radius-lg: 20px` (modals, hero panels). Fully round pills for step dots and unit toggles.
- Elevation: borders-first (`--line`), shadows only on overlays: `0 8px 30px rgb(0 0 0 / 0.35)` dark, `0 8px 30px rgb(16 24 32 / 0.12)` light.
- Motion tokens: `--ease: cubic-bezier(0.2, 0, 0, 1)`; durations 150 ms (hover/press), 200 ms (step transitions), 350 ms (results reveal, the one springy moment: numbers count up over ~600 ms with `prefers-reduced-motion` fallback to instant). All motion gated on `prefers-reduced-motion`.

---

## 3. Component rules

- All interactive controls come from `components/ui/*` (shadcn/Radix). **No raw `<button>` or `<input>` in feature code.**
- No native number inputs for measurements. Use the custom `MeasurementInput`.
- Custom components to build once and reuse everywhere:

| Component | Spec |
|-----------|------|
| `MeasurementInput` | Mono text field + unit suffix + stepper affordances; accepts "72.5", "72,5", "28 1/2 in"; stores mm internally; inline validation state (ok / challenge / confirmed-unusual) |
| `UnitToggle` | cm ⇄ in pill toggle, global, animates value re-render in place (no layout shift) |
| `StepProgress` | Wizard progress: N dots + fraction label + thin accent bar; each dot is a link for completed steps |
| `MeasureGuide` | Illustration panel per wizard step: simple SVG line-art figure + numbered how-to steps + common-mistake callout |
| `FitRange` | The signature results component: horizontal band showing low–high range, accent tick at recommended start, current-value marker if user has entered their existing setting; mono labels |
| `FitCard` | Results card: title, FitRange, "how to apply" collapsible, troubleshooting collapsible |
| `CautionBanner` | Appears when input carried a confirmed-unusual flag |
| `FitSheet` | Print-optimised composition of all FitCards (see §7) |

- Icons: Lucide only, 1.5 px stroke, 20 px default.
- Illustrations: inline SVG line art, single stroke colour `currentColor` so they theme automatically. No raster images for guides.

---

## 4. Screens

### 4.1 Landing (`/`)
- Hero: one sentence of promise, one supporting sentence, one primary CTA ("Start your fit", accent), one ghost link ("How it works").
- Below fold: 3-step explainer (Measure, Calculate, Apply) with line-art icons; methodology teaser linking to `/method`; honesty block (what this is and isn't).
- If saved fits exist locally: hero swaps to "Welcome back" with fit cards and a secondary "New fit" CTA. Landing must feel personal on return visits with zero sign-in.
- No cookie banner (no cookies needing consent). This is a feature; the footer says so.

### 4.2 Measurement wizard (`/fit/new`)
- One question per screen. Progress always visible. Back always works and never loses data (state persisted to IndexedDB draft on every step).
- Layout: mobile = guide illustration on top, input below, sticky Continue; desktop = two-pane (guide left, input right).
- Order: bike type → priority → height → inseam → torso → arm → shoulder → flexibility → foot length (skippable) → review.
- Review step: all values on one screen, tap any to jump back and edit, then "Calculate my fit".
- Validation: inline, on blur, never on keystroke. Challenge pattern for out-of-range: amber message + "Yes, that's right" confirm button.
- Keyboard: Enter advances, Esc nothing destructive, all inputs labelled.

### 4.3 Results / fit sheet (`/fit/[id]`)
- Reveal moment: brief compute pause (even though it's instant, a ~500 ms staged reveal reads as considered), numbers count up, then still.
- Order of cards: Saddle height (hero card, larger), Setback, Bar drop (if applicable), Bar width, Reach guidance, Crank length, Cleats (if provided), Frame size ("if you're shopping" card, visually separated).
- Each card: FitRange visual, recommended start emphasised, "How to apply" and "If it doesn't feel right" collapsibles (collapsed by default).
- Sticky footer bar: Save fit (name it), Print / PDF, Start over.
- Disclaimer block at the bottom, styled as part of the design, not fine print.
- "Show the method" expander per card for Sam-type users: the formula, the inputs used, the modifiers applied.

### 4.4 Saved fits (`/fits`)
- Card grid of saved fits: name, bike type chip, headline saddle height, created date, caution flag if any.
- Actions per card: open, rename, duplicate-and-edit, delete.
- Empty state: friendly illustration + "Start your first fit" CTA.
- Delete: confirmation dialog naming the fit + destructive-verb button + Cancel focused by default, and a ~10 s Undo toast that fully restores. Route through one shared `useConfirmDelete` utility.

### 4.5 Settings (`/settings`)
- Units (cm/in), theme (dark/light/system), data (export all as JSON, import, erase everything: double-confirm + undo not possible here so use typed confirmation "erase"), about + version.
- v1.1 adds Account section: sign in, sync status ("Synced just now"), sign out (keeps local data, says so).

### 4.6 Methodology (`/method`)
- Long-form readable page: each formula, its origin, what it's good at, where it breaks. This page is the trust engine; write it like a knowledgeable friend, not a paper.

---

## 5. States (every data-driven view, no exceptions)

| State | Rule |
|-------|------|
| Loading | Skeletons matching final layout; no spinners for < 300 ms operations (show nothing instead) |
| Empty | Designed empty states with next-action CTA; never a blank pane |
| Error | Human sentence + retry affordance; errors never masquerade as empty |
| Offline | Banner chip "Offline, everything still works" (and it must) |

---

## 6. Accessibility checklist (enforced at each phase's acceptance)
- Keyboard-complete wizard, visible focus ring (accent, 2 px offset).
- Step changes announced via `aria-live="polite"`.
- All inputs labelled; units included in accessible names ("Inseam in centimetres").
- Contrast per §2; both themes.
- Touch targets ≥ 44 px.
- `prefers-reduced-motion`: no count-ups, no slides, instant swaps.

---

## 7. Print / PDF fit sheet
- Print stylesheet renders the fit as a clean one-page A4/Letter document: BikeFit wordmark, rider first name (optional field at save time), date, all outputs in a tidy table with ranges and start values, the three key apply-instructions, disclaimer.
- Always light-styled for print regardless of app theme. Uses the same formatting utilities as the screen (numbers must match exactly).
- "Print / Save as PDF" uses the browser print dialog. No server-side PDF generation (keeps hosting free and simple).

---

## 8. Copy guidelines
- Second person, present tense. "Raise your saddle 4 mm" not "The saddle should be raised".
- Translate jargon on first use: "setback (how far your saddle sits behind the pedals)".
- Never blame the rider. "That measurement is unusual" not "Invalid input".
- Banned words for our own output: prescription, diagnosis, guaranteed, perfect, professional-grade.
- No em dashes in any product copy. No exclamation marks in instructional copy.
- Buttons are verbs: "Calculate my fit", "Save fit", "Print fit sheet".
