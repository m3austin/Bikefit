# SportFit - Product Vision

Status: draft for review, 2026-07-04. Design only; no code has changed. This
doc set (docs/sportfit/*) is the brief for turning BikeFit into SportFit, a
multi-sport video technique-analysis platform, plus a paid coach directory.

Publisher: **Marshmallow Labs** (the Google Play developer account and parent
brand). Product: **SportFits** (name chosen 2026-07-04; `sportfits.org` is
available and will be bought once the project shows legs, so the domain
purchase is deferred and `sportfits-*.vercel.app` is the free production URL
until then). Each sport is a branded module: **BikeFit, GolfFit, RunFit,
LiftFit, SwimFit**. See Naming below.

---

## 1. The one-paragraph pitch

SportFit turns your phone video into a plain-language technique check for the
sport you love. Film yourself riding, swinging a golf club, running,
swimming, or lifting; the app measures your body's angles and timing on your
own device (the video never leaves it), checks them against sensible ranges,
and hands you the single highest-value change to try next, with a step-by-step
drill guide to make it. It is free, private, and friendly to total beginners.
When you want a human, SportFit's directory helps you find a vetted coach near
you. It is the free tool that makes every sport feel approachable, and a place
where good coaches get found.

## 2. Why this works as one product, not five apps

Every analysis is the same underlying problem: track a human body through
video, measure joint angles and key moments, compare to targets, coach one
change. BikeFit already solved the hard parts (client-side MediaPipe pose
tracking, the biomechanics math, the results and recommendation UI, the
adjustment/drill guide pattern, the glossary, offline PWA, the tip jar, the
Play packaging). SportFit reuses that kernel and adds a thin per-sport module
for each new sport. One codebase, one deploy, one brand, many sports. See
[01-Architecture.md](01-Architecture.md).

## 3. What is free vs paid (the business model)

Two sides, deliberately separated so neither corrupts the other:

**Consumer side (free, forever, the top of the funnel).**
- All video technique analysis for every sport. Runs on-device, no account
  needed, no ads. This is what gets popular and shared.
- The optional tip jar (already built) stays as the only consumer ask.

**Coach side (the revenue).**
- A searchable directory of real coaches, findable by sport and location, for
  in-person sessions.
- Coaches pay a **monthly subscription** to appear in the directory (this is
  advertising; it is the main revenue).
- Coaches can earn two credibility badges by passing **one-time paid
  assessments** SportFit designs: a **Certified** badge (baseline) and a
  harder **Pro** badge (advanced, plus an annual continuing-education
  attestation). See [03-Directory-and-Credentials.md](03-Directory-and-Credentials.md).

The wall between competence (badges, earned by assessment) and visibility
(listing, bought by subscription) must stay visible to users, so nobody reads
SportFit as "pay money to look qualified." This is a trust rule, detailed in
doc 03.

## 4. Who it is for

- **Weekend athletes and total beginners.** The core consumer. Want to get
  better and avoid hurting themselves without paying for a pro yet. The copy
  and design exist to make them feel welcome (doc 04).
- **Enthusiasts.** Data-curious, will read the method, will re-test. Served by
  progressive disclosure, same as BikeFit's Fiona/Sam split.
- **Coaches, fitters, instructors, trainers.** The paying side. Want to be
  found by nearby clients and to signal credibility. Personas and needs in
  doc 03.

## 5. Scope

### In scope (the platform vision)
- Sports at launch-ish, in likely build order: **cycling** (exists), then
  **running gait**, **weightlifting** (bench, squat, deadlift first, then more
  lifts), **golf swing**, and **swimming (front crawl)**. Per-sport design in
  [02-Sport-Modules.md](02-Sport-Modules.md).
- A main landing/hub that routes to each sport.
- The coach directory, badges, assessments, subscriptions, and CE attestation.
- The Marshmallow Labs mascot easter-egg system (doc 04).

### Explicitly out of scope (for now)
- Wearables, live/real-time analysis, or anything needing sensors beyond a
  phone camera.
- Coach booking/scheduling/payments between users and coaches. SportFit is a
  directory that hands off; it does not take a cut of sessions or hold
  bookings (this also keeps us out of a much heavier regulatory place).
- User-to-user social features, feeds, or comments.
- Team/club accounts. Possible later.

## 6. Naming (resolved)

- **Umbrella product: SportFits.** Plural on purpose (many fits). Domain
  `sportfits.org` is available; purchase deferred until the project proves
  itself. Do a quick trademark sanity check before spending on the domain, but
  it is chosen.
- **Modules are branded "[Sport]Fit":** BikeFit, GolfFit, RunFit, LiftFit,
  SwimFit. This makes "fit" a brand verb rather than a literal claim, which
  neatly sidesteps the old "fitter does not generalize" worry: RunFit and
  SwimFit are brand names, not assertions that a "fit" exists. It also lets
  GolfFit carry both club-fitting info and swing analysis under one name.
- **Route slugs stay short and literal** (`/cycling`, `/golf`, `/running`,
  `/lifting`, `/swimming`); the registry maps each slug to its display
  sub-brand (BikeFit, GolfFit, ...). Slugs are for URLs, sub-brands are for
  humans.
- **Coach badges: SportFits Certified / SportFits Pro** (umbrella-branded,
  sport-neutral), shown alongside each coach's own role word. Detail in doc 03.

Marshmallow Labs stays the parent/publisher throughout (footer signature, Play
listing, the mascot). SportFits is the product. Doc 04 covers the visual
relationship.

## 7. Trust, safety, and legal posture (read this early)

Expanding from "bike fit" to "how to squat and deadlift" and "your running
gait" raises the stakes. Non-negotiables that carry into every doc:

- **Never a substitute for a professional or a physician.** Every sport keeps
  BikeFit's disclaimer discipline, strengthened for load-bearing and
  injury-prone movements (lifting especially: spinal flexion under load;
  running: overuse injury). The app coaches gently and says "stop if it hurts,
  see a pro" plainly.
- **Calculator, not oracle.** Outputs are ranges and suggestions, never
  verdicts dressed as expertise. Same rule BikeFit already enforces.
- **All target numbers are placeholders until a sport expert confirms them.**
  Exactly like `lib/fit-rules.ts` today. No invented thresholds ship as fact.
- **The badges are SportFit's own standard, not a license.** They must be
  described honestly (passed our assessment; not a government or medical
  credential; CE is self-reported). The directory is paid advertising and must
  say so.
- **Get a lawyer.** Before the directory/badges/subscriptions go live, a real
  review of: the badge claims, the coach terms (coaches are independent;
  SportFit does not guarantee them), the paid-advertising disclosures, user
  liability waivers for following form advice, and privacy for the new
  server-stored data. I can draft plain-language versions; they are not legal
  advice.

## 8. Decisions (resolved 2026-07-04) and what is deferred

Resolved:
- Name: **SportFits**, modules "[Sport]Fit" (section 6).
- Badges: **SportFits Certified / Pro**.
- **First sport after the refactor: GolfFit** (owner's priority). Note: golf is
  event-sequence, not cyclic, so it builds the kernel's event-based segmenter
  first rather than getting a free validation from a cyclic sport; acceptable
  and it stress-tests the kernel's generality early. Doc 05 reflects this.
- Play app rebrands to **SportFits** (cycling becomes a section). Vercel project
  renamed bikefit -> sportfits; SITE_URL already follows automatically.
- Everything stays **free**: domain purchase deferred, monetization deferred.

Deferred until the app shows significant popularity (architected for, not built
now): the coach directory, assessments, badges, subscriptions, and CE
attestation (doc 03). The two-world split (doc 01) and Supabase auth already
leave clean room to add them later without rework.

Still to decide when that day comes: assessment and subscription pricing, and
the lawyer review in section 7.
