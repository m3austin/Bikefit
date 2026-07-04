# BikeFit - Product Requirements Document

Version 1.0 | 2026-07-03 | Status: Approved for build

---

## 1. Product summary

BikeFit is a free web app that gives everyday cyclists a professional-quality starting bike fit from their own body measurements. The rider follows a guided measurement wizard (inseam, torso, arm, shoulder width, flexibility), picks their bike type, and receives a personalised fit sheet: saddle height, saddle setback, reach and bar drop guidance, handlebar width, crank length, and cleat position, each expressed as an honest range with a recommended starting point and plain-language instructions for applying it to their bike.

**One-line pitch:** A $300 bike fit's starting point, free, in ten minutes, with nothing to install and no account required.

### Goals
- G1: A rider with a tape measure and a book gets a usable, safe starting fit in under 10 minutes.
- G2: The app feels premium: calm, precise, trustworthy. Closer to a Swiss instrument than a form.
- G3: $0/month to operate at hobby scale. Free for users forever, no ads, no paywall.
- G4: Privacy-first: measurements never leave the device unless the user explicitly opts into sync.
- G5: Maintainable by one person with Claude Code doing most of the work.

### Non-goals (v1)
- Not a substitute for a professional fit, and never claims to be.
- No photo/video joint-angle analysis (future candidate, see §10).
- No adjustment logbook / fit history timeline (v2 candidate).
- No pro-fitter client management mode.
- No native mobile apps. The web app must be excellent on mobile browsers instead.
- No monetisation of any kind in v1. An optional "buy me a coffee" link is acceptable later.

---

## 2. Target users

### Persona A: "First road bike" Fiona
Bought a road bike last year, gets numb hands and a sore knee on longer rides. Googled "saddle height formula" and found five contradictory answers. Wants one trustworthy answer and instructions she can follow with a hex key. Not fluent in bike jargon. On her phone in the garage.

### Persona B: "Self-sufficient" Sam
Rides 5,000 km/yr, owns three bikes, comfortable with jargon, sceptical of magic numbers. Wants to see the methodology, compare formulas, and tweak. Will use desktop, will export the fit sheet, will come back after buying a new bike.

Design rule: Fiona drives the default experience; Sam gets progressive disclosure ("Show the method" expanders), never the other way around.

---

## 3. Product principles

1. **Ranges, not oracle numbers.** Every output is a range with a recommended start. False precision destroys trust.
2. **Explain everything.** Each number ships with how to measure it, how to apply it, and what to feel for.
3. **Comfort overrides formula.** Copy always says: if it hurts, the formula loses.
4. **No gatekeeping.** Full functionality with zero sign-up. Sync is a convenience, never a wall.
5. **Local-first.** The browser is the database. The cloud is an optional mirror.
6. **Honest about limits.** Clear, friendly disclaimer: this is an educated starting point, not a medical or professional service.

---

## 4. Feature scope

### v1.0 (launch)
| # | Feature | Summary |
|---|---------|---------|
| F1 | Measurement wizard | Guided step-by-step capture of body measurements with illustrations, plausible-range validation, cm/in toggle |
| F2 | Fit engine | Pure TypeScript library converting measurements + bike type + flexibility into fit outputs (see §6) |
| F3 | Fit sheet (results) | Premium results page: each output as range + start point + apply instructions + troubleshooting |
| F4 | Saved fits | Name and save fits locally (e.g. "Gravel bike"). Multiple fits per browser. Edit and re-run |
| F5 | Export / print | Print-perfect fit sheet (browser print to PDF), plus JSON export/import for backup |
| F6 | Settings | Units (cm/in), theme (dark/light/system), data controls (export all, erase all) |
| F7 | Methodology page | The formulas, their sources, and their limits, in plain language. Trust anchor |

### v1.1 (fast follow)
| # | Feature | Summary |
|---|---------|---------|
| F8 | Optional account sync | Supabase email magic-link / OAuth. Local data uploads on first sign-in; last-write-wins sync; sign out never deletes local data |

### Shipped post-launch: Video Fit Analysis (v1.2, 2026-07)
| # | Feature | Summary |
|---|---------|---------|
| F9 | Video Fit Analysis | `/fit` chooses between Quick Fit (F1-F7, unchanged) and video analysis: a side-view trainer video (required) and a straight-on view (optional) are pose-tracked 100% client-side (MediaPipe lite, video never uploaded). Extracts sagittal joint angles per pedal stroke plus frontal knee tracking, symmetry, and hip drop; a deterministic rules engine surfaces one primary adjustment at a time with verdicts per metric. Governing rules live in the repo CLAUDE.md (video fit analysis section); flows are User-Flows.md Flows 9-11. CAVEAT: every target range and magnitude in `lib/fit-rules.ts` is a PLACEHOLDER pending owner-confirmed sourced values. |

### Explicitly deferred
Adjustment logbook, saddle/shoe product recommendations, community sharing, localisation beyond English.

---

## 5. Inputs

### Body measurements (wizard steps, in order)
| Input | Unit | Plausible range | How measured |
|-------|------|-----------------|--------------|
| Inseam | cm | 60–100 | Book against wall, floor to book spine, barefoot |
| Torso length | cm | 45–75 | Sternal notch to pubic bone reference point |
| Arm length | cm | 50–80 | Acromion (shoulder bone tip) to wrist crease |
| Shoulder width | cm | 32–50 | Acromion to acromion across the back |
| Height | cm | 140–210 | Standing, barefoot (used for sanity checks + frame size) |
| Foot length | cm | 22–33 | Heel to longest toe (cleat guidance, optional step) |

Inputs outside the plausible range are challenged inline ("That's unusually long. Double-check: the book should be snug against your saddle area.") but never hard-blocked; a confirmed out-of-range value proceeds with a caution flag carried onto the fit sheet.

### Context inputs
- **Bike type:** Road / Gravel / MTB (XC-trail) / Hybrid-commuter. (TT/tri deferred.)
- **Flexibility self-assessment:** 3-option toe-touch test: (a) palms flat on floor, (b) fingertips touch toes, (c) can't reach toes. Maps to flexibility = high / medium / low.
- **Riding priority:** Comfort / Balanced / Performance (single select, defaults Balanced).
- **Crank length (optional):** if the rider knows it; otherwise the engine recommends one and assumes it.

All measurements are stored internally in **millimetres** (integers). cm/in are display formats only. This is a hard rule: the engine never sees inches.

---

## 6. Fit engine specification

The engine is a pure, dependency-free TypeScript module (`lib/engine/`). Deterministic: same input, same output. All outputs in mm, converted at the display layer. Every public function is covered by golden tests (see §9).

### 6.1 Saddle height (BB centre to saddle top, along seat tube)
- LeMond method: `0.883 × inseam`
- Hamley-derived: `1.09 × inseam − crankLength`
- **Recommended start:** mean of the two methods, rounded to the nearest mm.
- **Range:** recommended ±6 mm.
- Bike-type modifiers applied to the recommendation: MTB −5 mm, Hybrid −5 mm, Gravel −2 mm, Road 0.
- Priority modifier: Comfort −3 mm, Performance +0, Balanced −1 mm.
- Copy notes shipped with the number: thick-soled shoes and flat pedals sit riders lower (drop ~3 mm); a fresh chamois or saddle change re-opens the question; the classic heel-on-pedal check as a cross-validation the rider can do.

### 6.2 Saddle setback
- Starting point: KOPS-informed guidance, expressed behaviourally, not as a single mm value: "Start with your saddle rails centred. With cranks level, your kneecap should sit roughly over the pedal axle."
- Numeric aid: estimated setback from BB = `0.245 × inseam − 100` mm (empirical starting band, presented as ±10 mm).
- Copy must state KOPS is a convention, not physics, and comfort adjustments of ±10 mm are normal.

### 6.3 Frame size (for buyers; informational card)
- Road/Gravel: seat tube (c-t) `0.665 × inseam` cm equivalent, presented alongside a stack/reach sentence explaining modern sizing.
- MTB: `0.225 × inseam` expressed in inches.
- Always framed as "if you're shopping" and clearly separated from adjustments to a bike they own.

### 6.4 Reach and top tube guidance
- Estimated top tube + stem total: `(torso + arm) / 2 + 40` mm-adjusted heuristic (classic touring formula modernised); presented as a band of ±15 mm.
- Priority modifier: Comfort −10 mm, Performance +10 mm.
- Because reach is the least formula-friendly output, the fit sheet leads with the behavioural check (elbow bend 15–20°, no locked arms, hood wrists neutral) and treats the number as secondary.

### 6.5 Handlebar drop (road/gravel only)
- Flexibility high: 60–100 mm below saddle; medium: 30–60 mm; low: 0–30 mm.
- Priority shifts within the band (Comfort = top of band, Performance = bottom).

### 6.6 Handlebar width
- Road/gravel: shoulder width rounded to nearest 20 mm (bars sold in 2 cm steps); MTB: informational only ("modern MTB bars are 740–780 mm; cut to comfort").

### 6.7 Crank length recommendation
| Inseam | Recommended crank |
|--------|-------------------|
| < 750 mm | 165 mm |
| 750–809 mm | 170 mm |
| 810–859 mm | 172.5 mm |
| ≥ 860 mm | 175 mm |
- Copy note: the industry trend is toward shorter cranks; going one step shorter than the chart is never wrong for comfort.

### 6.8 Cleat position (optional, if foot length provided)
- Fore-aft: ball of foot over pedal spindle as the start; note that midfoot-ward = more endurance-friendly.
- No numeric output pretending precision; behavioural instructions with an illustration.

### 6.9 Output schema (engine contract)
```ts
type FitResult = {
  meta: { engineVersion: string; computedAt: string; cautionFlags: CautionFlag[] };
  saddleHeight: RangeMm;      // { low, high, start, methods: {lemond, hamley} }
  saddleSetback: RangeMm;
  frameSize: { roadCm?: number; mtbInches?: number };
  reachBand: RangeMm;
  barDrop?: RangeMm;          // undefined for MTB/hybrid
  barWidthMm?: number;        // undefined for MTB
  crankLengthMm: number;
  cleat?: { note: true };     // presence signals foot length was provided
};
```
The exact schema may evolve during build, but: versioned (`engineVersion`), mm-only, and serialisable to JSON without loss.

---

## 7. Data model and persistence

### Local (source of truth)
IndexedDB via a thin wrapper (Dexie or idb). Entities:
- `profile` (single row): body measurements (mm), flexibility, updatedAt.
- `fits[]`: id (crypto.randomUUID), name, bikeType, priority, input snapshot, FitResult snapshot, createdAt, updatedAt.
- `settings`: units, theme.

Fits store an **input snapshot + result snapshot**, so old fits never silently change when the engine or profile changes. Re-running a fit creates a new result against the current engine version.

### Cloud (v1.1, optional mirror)
Supabase free tier. Tables `profiles` and `fits` mirroring the local schema, RLS `user_id = auth.uid()` on every table, no service-role usage from the client, no anon access to data tables. Sync strategy: on sign-in, upload local records that don't exist remotely; conflict resolution last-write-wins on `updatedAt`; deletions propagate via a `deleted_at` tombstone. Sign-out leaves local data intact.

---

## 8. Non-functional requirements

- **Performance:** Landing LCP < 1.5 s on 4G mobile; wizard step transitions < 100 ms; total JS on landing < 150 kB gz. Engine runs client-side, instantly.
- **Offline:** After first load, the wizard, engine, saved fits and settings all work offline (client-side everything; add PWA manifest + service worker in polish phase).
- **Accessibility:** WCAG 2.1 AA. Full keyboard operability of the wizard; visible focus; labelled inputs; announced step changes; `prefers-reduced-motion` respected; contrast ≥ 4.5:1 body text in both themes.
- **Privacy:** No measurement values, names, or result numbers in any analytics event, ever. Analytics (if enabled at all) are cookieless page counts + coarse funnel events (`wizard_started`, `fit_completed`) with zero payload beyond bike type.
- **Mobile-first:** Every screen designed at 375 px first. The garage/tape-measure context makes phones the primary device.
- **Browser support:** evergreen Chrome/Safari/Firefox/Edge, iOS Safari 16+.

---

## 9. Quality contract

- The fit engine ships with a **golden test suite**: a table of complete input sets and their exact expected outputs, hand-verified once, then locked. Any engine change that alters a golden value fails CI and requires deliberately updating the table in the same PR with justification in the PR description.
- Unit conversion (mm↔cm↔in) has exhaustive round-trip tests.
- Every data-driven view has loading, empty, and error states.
- Lint, typecheck (strict), unit tests, and build must pass in CI before merge.

---

## 10. Future candidates (parking lot, not commitments)
Adjustment logbook per bike; TT/tri bike type; saddle pressure discomfort troubleshooter; share-a-fit read-only links; multi-language. (Video joint-angle analysis shipped as F9; remaining video candidates: persisting video analyses to the garage, discomfort-aware rules, per-leg key frames for the front view.)

---

## 11. Risks

| Risk | Mitigation |
|------|------------|
| Formula disputes ("LeMond is outdated!") | Methodology page states sources and limits; ranges not absolutes; comfort-first copy |
| Riders treat output as medical advice | Persistent, friendly disclaimer on results + print output; no pain-diagnosis claims |
| Free-tier rug pulls (Supabase/Vercel) | Local-first design means the app degrades to fully functional without the backend; static-exportable architecture keeps hosting portable |
| Solo-maintainer bus factor | Golden tests + CI + this doc set keep the project resumable by any future Claude session |

---

## 12. Copy and legal rules

- The app never uses the words "prescription", "diagnosis", "guaranteed", "perfect fit", or "professional fit" to describe its own output.
- Required disclaimer (results page footer + printed sheet): "BikeFit gives you an educated starting point based on published fitting methods. It is not medical advice or a substitute for a professional bike fit. Adjust gradually, and if you feel pain, stop and consult a professional."
- Tone: warm, precise, confident, jargon-translated. No exclamation marks in instructional copy. No em dashes anywhere in product copy; use commas, colons, or parentheses instead.
