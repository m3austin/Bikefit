# SportFit - Sport Module Design Specs

Design only. What each new sport measures, how it segments video, what it
recommends, and how it is filmed. Every numeric target, angle range, and
threshold named here is a **PLACEHOLDER** to be confirmed by a sport expert,
same discipline as `lib/fit-rules.ts`. These specs define the *shape* of each
module (per [01-Architecture.md](01-Architecture.md)); the real numbers come
later.

Build order (owner's call): **GolfFit first**, then RunFit, then LiftFit, then
SwimFit last. The sections below are ordered by technical family, not build
order; follow doc 05 for sequence. Module display names: BikeFit, GolfFit,
RunFit, LiftFit, SwimFit.

Shared pattern for every sport (from the kernel): capture video, track pose
on-device, segment into meaningful units, aggregate per-unit metrics with
min/max/mean/stdDev, flag high variance as a data-quality warning, verdict each
metric against target ranges, surface ONE primary change plus secondary ones,
and offer a drill guide (the sport's equivalent of BikeFit's adjustment guide),
with tappable glossary terms. Every sport carries the strengthened disclaimer.

---

## 1. Running gait (recommended first new module)

**Why first:** treadmill side-view is the most controlled new capture (fixed
camera, repeating strides, clear events), so it best validates the kernel on a
non-cycling sport with the least new risk.

**Capture views:** side-on (primary), rear-on (optional, for pelvic drop and
cross-over). Treadmill strongly preferred for a fixed frame; guidance covers
outdoor pans as a lower-quality fallback.

**Segmentation:** detect strides via the ankle's vertical/horizontal cycle
(directly analogous to the pedal-stroke BDC detector already built). Key events
per stride: **initial contact, midstance, toe-off**.

**Metrics (placeholder targets):**
- Cadence (steps/min) - the highest-value, most-cited cue.
- Overstride: horizontal distance from foot-strike to under-hip at contact.
- Knee flexion at initial contact.
- Vertical oscillation (hip rise/fall amplitude, normalized to leg length).
- Trunk lean from vertical.
- Foot-strike pattern (heel / mid / fore), reported, not judged.
- Pelvic drop (rear view): frontal-plane hip asymmetry, reuses the bike
  frontal hip-drop math.

**Recommendations/drills:** cadence-up cueing, posture drills, "land under
your hips" cues. Strong note: persistent pain or a real gait retraining need
belongs with a physiotherapist; this is a starting nudge, not gait therapy.

---

## 2. Weightlifting (bench, squat, deadlift; extensible)

**Why valuable + why careful:** huge audience and clear right/wrong form, but
the highest injury stakes in the set (spinal flexion under load). Safety copy
is front-and-center, not a footnote.

**Capture view:** side-on (primary) for all three lifts; the sagittal plane is
where bar path and spine angle live.

**Segmentation:** detect **reps** via the bar/hip vertical position cycle (the
stroke/stride detector generalizes again). Per-rep events: **setup, descent,
bottom/sticking point, lockout**. Aggregate across reps; flag when reps drift
(fatigue) as a data-quality and coaching signal.

**Extensibility:** a lift is a config entry inside the module (its events,
metrics, targets, cues), so adding overhead press, row, clean, etc. later is
additive, exactly like adding a bike variant.

**Per-lift metrics (placeholder targets):**
- **Squat:** depth (hip-crease vs knee-height), knee tracking (valgus, reuses
  frontal knee-deviation math if a front view is added), torso angle, bar over
  midfoot, heel lift.
- **Bench:** bar path (should be a shallow consistent arc), elbow flare angle,
  wrist stacked over elbow, touch point consistency.
- **Deadlift:** bar over midfoot at setup, hip height at setup, **lumbar
  neutrality (flexion detection under load)** as the marquee safety metric, bar
  path vertical and close, full lockout.

**Recommendations/cues:** one change at a time (e.g. "sit back a touch to bring
the bar over your midfoot"), each linked to a drill/cue. Safety framing is
explicit and repeated: this is not a spotter, not a coach; drop the weight and
stop if anything hurts; get a coach for heavy or contest lifting.

---

## 3. GolfFit: swing analysis + club-fitting info (first module built)

**Why:** very large, very analysis-hungry audience; people already film swings.
GolfFit carries **two tools**, mirroring how BikeFit has both the measurement
Quick Fit and the video analysis (the "a module can have multiple tools"
pattern from doc 01):

**Tool A - Club-fitting info (non-video).** Plain-language guidance and a light
calculator for starting club specs: static-chart guidance from height and
wrist-to-floor to club length, a lie-angle primer, grip size basics, shaft-flex
orientation. Informational and educational, in the drill-guide format, all
numbers PLACEHOLDER until a fitter confirms them, with the honest limit that a
real fitting uses a lie board and launch monitor. This is GolfFit's analogue of
BikeFit's Quick Fit.

**Tool B - Swing video analysis.** The pose pipeline, below.

**Capture views:** **down-the-line** (behind, along the target line) and
**face-on** (perpendicular). Like bike's side vs front, each view yields
different metrics; the module supports one or both.

**Segmentation:** a golf swing is a **single event sequence**, not a
repetition, so segmentation differs from strokes/reps: detect the swing phases
**address, takeaway, top of backswing, impact, follow-through** from wrist/club
and hip/shoulder motion peaks. This is the first module whose segmenter is
event-based rather than cyclic; the kernel's peak/velocity utilities support
both, but this is the one to prototype the event-sequence path.

**Metrics (placeholder targets):**
- Spine angle at address and its maintenance through the swing.
- Shoulder turn and hip turn at top (and the gap between them).
- Head stability (lateral/vertical drift through the swing).
- Lead-arm extension at top.
- Weight transfer / hip slide (face-on).
- Hip rotation at impact (face-on).

**Recommendations/drills:** classic drills mapped to findings (spine-angle
drills, turn drills, head-still drills). Note the limits honestly: 2D video
misses a lot a launch monitor or in-person pro sees; this is a helpful check,
not a lesson.

---

## 4. Swimming, front crawl (hardest; consider deferring)

**Flag up front - feasibility.** Filming swimming well is genuinely hard:
waterproof housing, refraction at the surface, splash and bubbles wrecking pose
confidence, and pose models trained mostly on land. **Above-water, side-on,
pool-edge** footage of the stroke is the tractable case; true underwater
tracking is unreliable with the current on-device model. Build this **last**,
set expectations loudly in the capture guidance and the confidence banner, and
be willing to ship it as "beta" or defer it if quality does not clear a bar.

**Capture view:** side-on from the pool deck, swimmer in a near lane, ideally a
few strokes in clear water.

**Segmentation:** stroke cycles via the arm/wrist rotation pattern; events
**catch, pull, exit, recovery** per arm.

**Metrics (placeholder targets, quality-permitting):**
- Stroke rate and stroke-length proxy.
- Body roll amplitude.
- Head position (looking down vs forward).
- Arm recovery height / elbow position.
- Breathing-side symmetry across cycles.

**Recommendations/drills:** catch-up drill, head-position cues, roll drills.
Heaviest data-quality caveats of any sport; the report leads with a confidence
read and openly says when the water beat the camera.

---

## 5. Cross-cutting module notes

- **Data-quality first.** Every sport reuses the sustained-low-confidence
  banner and the high-variance warning. When tracking is poor, the app says so
  plainly rather than inventing numbers.
- **Key frames.** Each sport defines its own timeline markers (events above),
  reusing BikeFit's marker + jump-to-next affordance.
- **Drill guides.** Each sport ships a drill/adjustment guide in the
  BikeFit-proven format: what/why, difficulty, time, gear needed, numbered
  steps, pro tips, safety callouts, "when to see a coach." Torque-style
  discipline generalizes: never invent a spec or a medical claim.
- **Placeholders everywhere.** All targets ship with `// PLACEHOLDER` and are
  gated behind expert confirmation before being presented as authoritative.
  The per-sport expert who confirms them is a natural first "SportFit Pro"
  relationship.
