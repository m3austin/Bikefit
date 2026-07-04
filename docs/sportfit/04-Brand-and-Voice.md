# SportFit - Brand, Voice, and the Marshmallow Easter Egg

Design only. How SportFit sounds, how it looks across sports, how Marshmallow
Labs shows up, and the mascot delight system. Extends BikeFit's UX standard
(docs/UX-UI-Design.md); where they differ, this doc wins for SportFit-wide
surfaces, and the UX standard still governs the precision of the instrument
itself.

---

## 1. Two brands, one family

- **Marshmallow Labs** is the publisher / parent (the Play developer account,
  the company). Soft, cute, curious-scientist personality. It appears as a
  quiet signature, not the headline: a footer "A Marshmallow Labs experiment,"
  the Play publisher name, and the mascot easter egg. Palette: lavender
  `#B79CF5` to `#9A78EE`, bubblegum `#FF6FB5`, cream `#FFFDF9`, plum ink
  `#40304F` (straight from the logo).
- **SportFits** is the product / headline brand (plural: many fits). It keeps
  BikeFit's precision-instrument bones (calm layout, tabular numerals, honest
  ranges) but warms up the personality (see voice). SportFits gets its own
  confident neutral base (dark navy-black and light, as today) and a
  **per-sport accent color** for wayfinding.
- **Module sub-brands are "[Sport]Fit":** BikeFit, GolfFit, RunFit, LiftFit,
  SwimFit. Each is a wordmark in its sport's accent, with "Fit" as the shared
  brand syllable, so the family reads as one system. The umbrella wordmark
  "SportFits" appears on the hub and in the header; the active sport's
  sub-brand appears within that sport's pages.

The relationship: think "Marshmallow Labs presents SportFits." Users mostly see
SportFits and the sport sub-brands; Marshmallow Labs is the friendly maker they
discover and grow fond of (then buy a plush of).

## 2. Per-sport accent palette (wayfinding)

Each sport gets one accent, so you always know where you are. The kernel reads
the active `SportModule.accent`; everything else stays on the shared tokens.
Placeholders to refine in a design pass, chosen for distinctness and contrast
in both themes:

| Sport | Accent (working) | Feel |
|---|---|---|
| Cycling | `#3DDC97` green (existing) | keep; it is already shipped |
| Running | warm coral / orange | energy, road |
| Weightlifting | amber / iron gold | heavy, grounded |
| Golf | teal (NOT grass green, to avoid clashing with cycling) | precise, calm |
| Swimming | azure blue | water, obvious and welcome here |

Rule unchanged from BikeFit: one accent used sparingly per screen; contrast >=
4.5:1 both themes; the state-chip pattern uses tinted background + ink text
(the fix already made). Marshmallow lavender/pink are reserved for the mascot
and Marshmallow Labs signature, so the easter egg reads as a distinct, delightful
thread across every sport's color.

## 3. Voice: fun and warm, but the instrument never jokes

The brief is "lighthearted, humorous, plain-language, makes every sport feel
attainable, while staying credible." The way to have both is to **put the
personality in the chrome and the precision in the payload.** Concretely, a
three-register system:

- **Playful register** - navigation, hero copy, empty states, loading
  messages, button microcopy, the 404, celebration moments, marketing. Warm,
  a little funny, plain. Exclamation marks allowed here (a change from
  BikeFit's blanket ban). Example hero: "Point your phone at yourself doing the
  thing. We'll tell you the one tweak worth trying. No lab coat required."
- **Plain-precise register** - the actual instructions, steps, measurements,
  and results. Clear, second person, calm, no jokes getting between the rider
  and the number. This is BikeFit's existing instructional voice, unchanged.
  Example: "Raise your saddle 3 to 5 mm, then ride a short loop before judging."
- **Dead-serious register** - safety, injury, medical, and badge-meaning copy.
  No humor, no ambiguity, ever. Example: "Sharp or lasting pain is a stop sign.
  See a physician or a qualified coach."

Rule of thumb: **the closer the words are to a barbell on someone's spine or a
number they will act on, the less they joke.** Humor lives at the edges to make
the door feel open; it never rides along into the rep.

Cross-sport tone: every sport's welcome copy makes it feel attainable for
beginners ("You do not need to be fast, flexible, or fancy"). Persistent rules:
no em dashes anywhere (your standing preference); banned oracle words stay
banned (prescription, diagnosis, guaranteed, perfect, professional-grade); the
copy-lint test extends to every sport's copy.

### Loading-message personality (a small, high-delight surface)
The analysis "computing" moment is a chance for character, kept honest and
never over-dramatic on safety-adjacent sports. Examples: cycling "Measuring
your pedal circles"; running "Counting your steps"; lifting "Watching your bar
path (nice reps)"; golf "Reading your swing plane"; swimming "Untangling the
splash." Keep them boring-but-warm when a topic is injury-adjacent.

## 4. The Marshmallow easter-egg system

A tiny marshmallow-scientist mascot (from the beaker logo) doing each sport:
marshmallow on a bike, mid-golf-swing, running, swimming front crawl, and
deadlifting. It is the recurring joy that ties differently-colored sport
sections together and seeds merch.

**Design of the mascot set:** one simple, consistent marshmallow character
(the logo's face + proportions), re-posed per sport, line-art friendly so it
themes and scales; cream body, plum ink outline, a dab of bubblegum, matching
the Marshmallow Labs palette regardless of the sport's accent.

**Placement: subtle first, escalating with delight, never in the way.**
- Tier 1 (quiet, everywhere): a small static mascot in the footer near "A
  Marshmallow Labs experiment," posed for the current sport.
- Tier 2 (moments): the sport-posed mascot appears in empty states (no saved
  analyses yet), on the 404, and as the loading/computing character.
- Tier 3 (earned delight): after a genuinely good analysis (everything in
  range), a tiny celebratory mascot pose. Rare, so it stays special.
- Tier 4 (hidden): a real easter egg, e.g. a Konami-style tap sequence on the
  logo, or the mascot occasionally doing something silly (a marshmallow
  faceplant) at a low random rate on a non-critical screen. Never on results,
  safety, or payment surfaces.

**Guardrails:** the mascot never appears on safety copy, injury warnings,
disclaimers, results numbers, or payment/coach flows. Delight lives in the
chrome, seriousness owns the payload, same principle as the voice. Respect
`prefers-reduced-motion` for any animated pose.

**Merch groundwork (cheap to leave room for now):** keep the mascot poses as
clean standalone SVGs in an assets folder, each named by sport; that alone
makes stickers/shirts trivial later. No store now; just do not paint yourself
out of it.

## 5. What to hand a designer vs generate

The mascot set deserves a real illustrator eventually (five cohesive poses +
the base). For build-time, the existing approach works: clean SVG line-art
mascots authored as assets, themed via currentColor where possible, with the
cream/plum/pink fills locked to the Marshmallow palette. The logo files you
provided are the source of truth for proportions and color.
