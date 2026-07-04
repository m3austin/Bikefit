# SportFit - Build Plan and Phase Prompts

Design only. The sequence to build SportFit from today's BikeFit, why this
order, and paste-ready prompts. Same working rhythm as the BikeFit build: one
phase per fresh session, stop at each phase, verify against acceptance
criteria, commit, move on. Read docs 00-04 first.

## Decisions baked into this plan (2026-07-04)

- Product **SportFits**; modules BikeFit / GolfFit / RunFit / LiftFit / SwimFit;
  route slugs `/cycling` `/golf` `/running` `/lifting` `/swimming`.
- **GolfFit is the first new sport** (owner priority). It also ships two tools:
  club-fitting info + swing video analysis (doc 02 section 3).
- The whole plan stays **free**. The Vercel project is renamed bikefit ->
  sportfits (dashboard, free); SITE_URL follows automatically. Domain deferred.
- **Monetization (directory, badges, subscriptions, CE) is deferred**, not
  built now. It lives in an appendix below; the architecture already leaves
  room so it drops in later without rework.

## Guiding order logic

1. **Refactor before you add.** Extract the shared kernel and make cycling the
   first module *without changing what cycling users see*. Prove the plugin
   architecture on the thing that already works.
2. **Build GolfFit next.** Because golf is event-sequence (not cyclic), this
   also builds the kernel's event-based segmenter, stress-testing the module
   contract early and hard. If the contract is wrong, we learn it on sport #2.
3. **Then breadth** (running, lifting) as parallel-shaped cyclic sports;
   **swimming last** and gated on quality.
4. **Delight + polish** concentrated at the end.
5. **Business layer only when the free app is popular** (appendix).

Each phase is demoable and independently shippable. Numbers stay placeholders
until an expert confirms them; nothing blocks on that.

---

### Phase 0: Rebrand to SportFits + extract the kernel (no behavior change)
Goal: the app is "SportFits by Marshmallow Labs," cycling lives at `/cycling/*`
with `/fit/*` redirecting, and the sport-agnostic kernel is factored out with
cycling (BikeFit) as the first `SportModule`. Everything cycling users do today
works identically; all tests stay green.

> Read docs/sportfit/00-Vision.md, 01-Architecture.md, 04-Brand-and-Voice.md,
> and the current CLAUDE.md. Execute Phase 0: introduce the shared analysis
> kernel and the SportModule pattern from 01-Architecture without changing any
> cycling behavior. Move generic geometry to lib/kernel/geometry.ts, generalize
> the rules-engine shape to lib/kernel/rules.ts, and move bike-specific
> biomechanics/rules/drills/glossary into lib/sports/cycling/*. Add
> lib/sports/registry.ts with a SportModule descriptor for cycling (slug
> "cycling", sub-brand "BikeFit", accent green). Introduce app/[sport] routing
> driven by the registry with cycling as the only live module, and keep
> app/fit/* as redirects to app/cycling/* so shipped links and the Play deep
> link survive. Rebrand chrome to SportFits with a "A Marshmallow Labs
> experiment" footer signature and the BikeFit sub-brand within cycling pages.
> Update CLAUDE.md to encode the kernel/module rules and the extended
> non-negotiables from 01-Architecture section 7. Do NOT add new sports, the
> mascot, or anything from the deferred monetization appendix. Acceptance: every
> existing cycling flow and all unit + e2e tests pass unchanged; /fit/*
> redirects work; the registry drives cycling; lint, typecheck, build, and
> Playwright all green. Verify in the browser preview in both themes; show
> screenshots of /, /cycling, and a cycling video analysis. Then commit, push,
> and continue to Phase 1 (see the standing instructions in the kickoff message).

### Phase 1: Main hub landing
Goal: `/` becomes the sport picker and the what-SportFits-is page, in voice.

> Read docs/sportfit/00-Vision.md and 04-Brand-and-Voice.md. Execute Phase 1:
> build the main hub at / as a sport picker driven by the registry (cycling /
> BikeFit live; GolfFit, RunFit, LiftFit, SwimFit shown as "coming soon"), with
> the playful hero and the honest what-this-is / what-this-is-not block, the
> Marshmallow Labs footer signature, and a first quiet mascot placement (Tier 1
> from doc 04) if the mascot SVG exists yet, otherwise leave a labeled slot.
> Apply the three-register voice to hero, empty, and loading copy. Acceptance:
> hub routes to cycling; coming-soon sports are clearly marked, not dead links;
> banned-word/em-dash lint passes; both themes; screenshots. Commit, push,
> continue to Phase 2.

### Phase 2: GolfFit (first new sport: club-fitting info + swing analysis)
Goal: a full new module end to end, validating the SportModule contract, and
building the kernel's event-sequence segmenter.

> Read docs/sportfit/01-Architecture.md and 02-Sport-Modules.md section 3.
> Execute Phase 2: build the GolfFit module under lib/sports/golf/* and its
> routes via the registry (slug /golf, sub-brand GolfFit, teal accent), with two
> tools. Tool A: club-fitting info, a plain-language guide plus a light
> calculator (height and wrist-to-floor to starting club length, lie-angle and
> grip primers), all numbers PLACEHOLDER, in the drill-guide format, with the
> honest "a real fitting uses a lie board and launch monitor" limit. Tool B:
> swing video analysis reusing the kernel for capture, tracking, results,
> drills, and glossary, with down-the-line and face-on views, event-based phase
> detection (address, takeaway, top, impact, follow-through), and the
> placeholder metrics/targets/rules from doc 02. Add the event-sequence
> segmentation path to lib/kernel without disturbing the cyclic path cycling
> uses. Golden vitest suites with synthetic-landmark fixtures for the new
> biomechanics and rules; the copy-lint covers the new copy. Acceptance: phases
> detect on a real swing clip; both views selectable; club-fitting tool renders
> and calculates; all states present; unit + e2e green; both themes; screenshots
> and a note on what a real swing clip showed. Commit, push, continue to Phase 3.

### Phase 3: RunFit (running gait)
> Read docs/sportfit/02-Sport-Modules.md section 1. Execute Phase 3: build the
> RunFit module (slug /running, coral accent) reusing the kernel and the cyclic
> segmenter, with stride segmentation, the placeholder metrics/targets from doc
> 02 (cadence as the hero metric), side-view primary and optional rear view, a
> running drill guide, and the strengthened disclaimer. Golden suites.
> Acceptance: a real treadmill clip yields sane cadence and stride segmentation;
> all states present; tests green; both themes; screenshots. Commit, push,
> continue to Phase 4.

### Phase 4: LiftFit (bench, squat, deadlift; extensible)
> Read docs/sportfit/02-Sport-Modules.md section 2 and the safety posture in
> 00-Vision.md section 7. Execute Phase 4: build the LiftFit module (slug
> /lifting, amber accent) with a per-lift config (bench, squat, deadlift), rep
> segmentation via the bar/hip vertical cycle, per-lift placeholder
> metrics/targets (including deadlift lumbar-flexion detection as the marquee
> safety metric), a cues/drills guide, and the strongest safety copy in the app
> (dead-serious register, never jokes). A lift must be a config entry so more
> lifts are additive. Golden suites per lift. Acceptance: reps segment on real
> clips of each lift; safety copy is unmissable; adding a hypothetical 4th lift
> is demonstrably config-only; tests green; screenshots. Commit, push, continue
> to Phase 5.

### Phase 5: SwimFit (front crawl; hardest, gated on quality)
> Read docs/sportfit/02-Sport-Modules.md section 4 including the feasibility
> flag. Execute Phase 5: build the SwimFit module (slug /swimming, azure accent)
> for above-water side-on pool footage, stroke-cycle segmentation, placeholder
> metrics, and the heaviest data-quality caveats in the app. Prototype on a real
> clip early; if pose confidence cannot clear a usable bar, ship it labeled beta
> or recommend deferring, and say so with evidence. Acceptance: either a usable
> beta with loud caveats or a documented defer recommendation with clip
> evidence; tests green for whatever ships. Commit, push, continue to Phase 6.

### Phase 6: Mascot delight + cross-sport polish
> Read docs/sportfit/04-Brand-and-Voice.md section 4. Execute Phase 6: build the
> marshmallow mascot easter-egg system (Tiers 1-4) with the guardrails (never on
> safety, results, or any payment/coach surface; reduced-motion respected), the
> five sport poses as named standalone SVGs for future merch, and a cross-sport
> accessibility + copy-lint sweep. Update docs/Google-Play.md and the store
> assets for the SportFits name and icon if not already done. Acceptance: mascot
> appears per the tier rules and nowhere forbidden; a11y and copy lints green
> across all sports; screenshots of each mascot pose. Commit and push.

---

## Deferred appendix: the monetization layer (build only when popular)

Not built now. Architected for in doc 01 (the two-world split, Supabase auth)
and specified in doc 03. When the free app has real traction, these become
phases, in this order, each gated by the doc 00 section 7 lawyer review:

- **M1 Coach accounts + read-only directory** (free): coaches table, RLS,
  profile dashboard, public /coaches search by sport + location.
- **M2 Assessments + Certified badge**: quiz engine, Stripe Checkout one-time
  fee, server-side scoring, badge issuance, honesty popovers.
- **M3 Directory subscriptions**: Stripe Billing gates listing visibility;
  verified webhooks; lapse hides listing but keeps badges.
- **M4 Pro tier + CE attestation**: harder assessment, Pro badge, annual
  self-reported CE with lapse/renew states.

All coach/payment surfaces hide in the Play wrapper (?src=play), and all
server paths get the DamageIQ-grade security review (RLS, webhook signature
verification, server-authoritative state).

## What you provide along the way (kept minimal)

- Real sample clips per sport (a swing, a treadmill run, the three lifts, a
  pool lap) to validate each module. Building proceeds on synthetic fixtures
  meanwhile; a clip is only needed to confirm a module feels right.
- Eventually, expert-confirmed target numbers per sport (placeholders unblock
  everything until then).
- The mascot pose art (an illustrator, ideally). A labeled slot ships until it
  exists, so the mascot phase does not block the sports.

## Repo and deploy
Evolve the existing repo in place (keeps the engine, tests, deploy, Play setup).
The product becomes SportFits; BikeFit becomes the cycling module and a
sub-brand. Consumer app stays local-first and static-friendly; only the deferred
monetization layer adds server routes, which Vercel already supports. Rename the
Vercel project bikefit -> sportfits in the dashboard (free); SITE_URL follows via
VERCEL_PROJECT_PRODUCTION_URL automatically.
