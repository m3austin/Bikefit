# BikeFit - Build Plan, Stack, and Phase Prompts

Version 1.0 | 2026-07-03 | How to build this with Claude Code doing most of the work.

---

## 1. Recommended stack (free to run, forever)

The design constraint: **local-first, client-heavy, no required server**. That's what makes "free forever" safe: if any provider changes its free tier, the app still works and can be rehosted in an afternoon.

| Layer | Choice | Why | Cost |
|-------|--------|-----|------|
| Framework | Next.js (App Router) + TypeScript strict | You already know it from DamageIQ, so conventions and muscle memory transfer. Client-heavy usage keeps it within free hosting limits | $0 |
| UI | Tailwind v4 + shadcn/ui + Lucide | Token-driven theming, accessible Radix primitives, same stack as DamageIQ | $0 |
| Fit engine | Pure TypeScript in `lib/engine/`, zero deps | Testable, portable, no runtime cost | $0 |
| Local data | IndexedDB via Dexie | Structured storage, survives refresh, offline-native | $0 |
| Hosting | Vercel Hobby | Free tier is generous for a mostly-static app; instant preview deploys per PR | $0 |
| Sync (v1.1) | Supabase Free | You know it; RLS pattern transfers from DamageIQ; magic-link auth client-side, no server code needed | $0 |
| CI | GitHub Actions (free for public repos) | Lint + typecheck + tests + build on every PR | $0 |
| Errors | None at launch; Sentry free tier if ever needed | A local-first app has few server errors to track | $0 |
| Analytics | None, or Vercel Web Analytics (cookieless) | Privacy is a feature; if enabled, page counts only | $0 |
| Fonts | Geist via `next/font`, self-hosted | Zero external requests | $0 |
| Domain | Optional | The only possible real cost (~$15/yr). `bikefit.vercel.app` is fine to start | $0–15/yr |

**Portability insurance:** keep the app free of Vercel-only APIs (no edge middleware requirements, no image optimisation dependence). Target: it could static-export or move to Cloudflare Pages in under a day. Make the repo public to keep GitHub Actions free (the code has no secrets; Supabase keys used client-side are publishable by design).

---

## 2. Repository structure

```
bikefit/
  CLAUDE.md                  # build rules for every Claude session (already written)
  docs/
    PRD.md                   # scope + engine facts (wins on scope)
    UX-UI-Design.md          # design standard (wins on UI)
    User-Flows.md            # canonical flows (build every branch)
    Build-Plan.md            # this file
  app/                       # Next.js App Router
    layout.tsx  page.tsx  globals.css
    fit/new/  fit/[id]/  fits/  settings/  method/
  components/
    ui/                      # shadcn primitives only
    fit/                     # MeasurementInput, FitRange, FitCard, StepProgress, MeasureGuide...
  lib/
    engine/                  # pure fit engine + golden tests (the contract)
    units.ts                 # mm <-> cm <-> in, parsing ("28 1/2 in")
    db.ts                    # Dexie schema + data access (components never touch Dexie directly)
    format.ts                # single source for displaying measurements
  content/
    method.mdx               # methodology page copy
  e2e/                       # Playwright smoke tests
  .github/workflows/ci.yml
  supabase/migrations/       # v1.1 only
```

---

## 3. Automating the build (do this once, in Phase 0)

These items are what let you progress with very little input per phase:

1. **CLAUDE.md is the contract.** Every new Claude Code session in this repo reads it automatically. It encodes the rules so you never re-explain them.
2. **Golden tests are the safety net.** Once the engine's golden table is locked (Phase 2), no session can silently change fit math; CI fails instead. You review golden-table diffs, nothing else needs your scrutiny.
3. **CI gates every PR.** `lint + tsc --noEmit + vitest + build` in GitHub Actions. If CI is green and the preview deploy looks right, merge. Your review burden shrinks to "does the preview feel right".
4. **Permission allowlist.** Add `.claude/settings.json` allowing the routine commands (`npm run *`, `npx vitest*`, `npx tsc*`, `git status/diff/log`, `npx playwright*`) so sessions don't stall waiting for you to approve safe commands.
5. **Per-phase acceptance criteria.** Each prompt below ends with explicit criteria. Tell Claude "verify every acceptance criterion and show me proof" and let it self-check with the preview tools before you look.
6. **One phase per session.** Start each phase in a fresh session with the short prompt below. Fresh context + docs-on-disk beats one giant session.
7. **Preview-verified UI.** Sessions should verify UI work in the running dev server (screenshots, console clean, states exercised) before reporting done. The prompts demand this.

Suggested `.claude/settings.json` starter (create in Phase 0):

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run:*)", "Bash(npm install:*)", "Bash(npx vitest:*)",
      "Bash(npx tsc:*)", "Bash(npx playwright:*)", "Bash(npx shadcn:*)",
      "Bash(git status)", "Bash(git diff:*)", "Bash(git log:*)", "Bash(git add:*)"
    ]
  }
}
```

### Working rhythm per phase
1. Open a terminal in `bikefit`, run `claude`.
2. Paste the phase prompt.
3. Let it plan (say "plan first" if it doesn't), skim the plan, say go.
4. It builds, self-verifies, shows proof (test output + screenshots).
5. You spend 2 minutes on the preview URL or local dev server. If good: "commit and open a PR". Merge when CI is green.
6. Next phase, next session.

---

## 4. Build phases and paste-ready prompts

Phases are ordered so the riskiest, most valuable thing (the engine) is locked early, and every phase ends in a working, demoable app.

---

### Phase 0: Scaffold and rails
**Goal:** empty but production-shaped app; CI; tokens; fonts; theming skeleton.

**Prompt to paste:**
> Read CLAUDE.md and docs/ (PRD, UX-UI-Design, Build-Plan). Execute Phase 0 from docs/Build-Plan.md: scaffold a Next.js App Router + TypeScript strict app in this directory. Install Tailwind v4 and shadcn/ui, wire the design tokens from UX-UI-Design §2 as CSS custom properties consumed via Tailwind `@theme` (dark, light, and system themes; class strategy on html; persisted per UX-UI-Design). Self-host Geist Sans and Geist Mono via next/font with tabular-nums utility for measurements. Create the route skeletons (/, /fit/new, /fit/new, /fit/[id], /fits, /settings, /method) each with a placeholder that uses the tokens. Set up vitest, Playwright (one smoke test: home renders), and .github/workflows/ci.yml running lint, tsc --noEmit, vitest run, and build. Create .claude/settings.json with the permission allowlist from Build-Plan §3. Initialise git if needed, commit as you complete logical chunks. Acceptance: `npm run dev` shows a themed placeholder on every route in both themes with zero console errors; all four CI steps pass locally; verify in the browser preview and show me a screenshot of / in dark and light.

---

### Phase 1: Design system components
**Goal:** the custom components that define the product's feel, built in isolation.

**Prompt to paste:**
> Read CLAUDE.md, docs/UX-UI-Design.md §3, and docs/PRD.md §5. Execute Phase 1 from docs/Build-Plan.md: build the custom components: MeasurementInput (parses "72.5", "72,5", "28 1/2 in"; stores mm; ok/challenge/confirmed-unusual states), UnitToggle, StepProgress, FitRange, FitCard, CautionBanner, MeasureGuide (with one placeholder SVG line-art illustration to establish the style). Also build lib/units.ts (mm/cm/in conversion + input parsing, exhaustive round-trip unit tests) and lib/format.ts (single source of measurement display). Create a hidden /dev/components gallery page rendering every component in every state in both themes. Acceptance: unit tests for units.ts and MeasurementInput parsing pass; gallery page shows all components and states in both themes with no console errors and no layout shift on unit toggle; verify in the browser preview and show screenshots of the gallery in both themes.

---

### Phase 2: The fit engine (the contract)
**Goal:** pure engine, golden tests locked. **This is the phase where your 30 minutes of review matter most.**

**Prompt to paste:**
> Read CLAUDE.md and docs/PRD.md §5, §6, §9 carefully. Execute Phase 2 from docs/Build-Plan.md: implement lib/engine/ as a pure, dependency-free TypeScript module exactly per PRD §6: saddle height (LeMond + Hamley mean, ±6mm, bike-type and priority modifiers), setback band, frame size, reach band, bar drop by flexibility, bar width, crank length table, cleat presence, the FitResult schema with engineVersion, mm-only integers. Write a golden test suite: at least 8 complete rider profiles (vary sex-agnostic sizes S/M/L/XL, all 4 bike types, all 3 flexibility levels, all 3 priorities, one out-of-range caution case) with exact expected outputs computed from the PRD formulas, each documented with the hand calculation in a comment. Then produce a human-readable verification table (markdown, in the PR description or a docs/engine-verification.md) showing each golden case's inputs and outputs so I can hand-check them. Do not build any UI in this phase. Acceptance: 100% of engine branches covered by tests; golden suite green; verification table produced for my review; engine has zero imports from React, Next, or the DOM.

**Your job after this phase:** spend 30 minutes hand-checking the verification table (a calculator and PRD §6 is all you need). Once you bless it, the numbers are locked forever and no future session can drift them.

---

### Phase 3: Measurement wizard
**Goal:** the golden path input experience, Flow 1 and Flow 2 complete.

**Prompt to paste:**
> Read CLAUDE.md, docs/User-Flows.md Flows 1-2, docs/UX-UI-Design.md §4.2, docs/PRD.md §5. Execute Phase 3 from docs/Build-Plan.md: build the measurement wizard at /fit/new using the Phase 1 components: one question per screen in the PRD §5 order, MeasureGuide illustrations per step (line-art SVG, currentColor), StepProgress, blur validation with the challenge pattern (never hard-block), draft persisted to IndexedDB on every step via lib/db.ts (Dexie; set up the schema from PRD §7; components go through lib/db.ts, never Dexie directly), refresh-safe resume, review step with jump-back editing, mobile layout first then desktop two-pane. Wire "Calculate my fit" to the Phase 2 engine and route to /fit/[id] with the result stored. Acceptance: complete Flow 1 and Flow 2 exactly as diagrammed including every branch (unparseable input, challenge-confirm, skip foot length, refresh mid-wizard resumes, back preserves data); keyboard-complete per UX-UI-Design §6; verify by driving the full wizard in the browser preview at mobile and desktop sizes and show screenshots of three representative steps plus the review screen.

---

### Phase 4: Results and fit sheet
**Goal:** the payoff screen, Flow 3, plus print. The premium moment.

**Prompt to paste:**
> Read CLAUDE.md, docs/User-Flows.md Flow 3, docs/UX-UI-Design.md §4.3 and §7, docs/PRD.md §6 copy notes and §12. Execute Phase 4 from docs/Build-Plan.md: build /fit/[id]: staged reveal with count-up (instant under prefers-reduced-motion; instant when opened from /fits), fit cards in the specified order with FitRange visuals, "How to apply" / "If it doesn't feel right" / "Show the method" collapsibles with real copy written per the PRD's copy notes and §12 rules (run the banned-word check), CautionBanner when flags exist, sticky action bar (Save with name dialog, Print, Start over with confirm), not-found state for unknown ids, and the print stylesheet producing a clean one-page light-themed fit sheet per UX-UI-Design §7. Acceptance: Flow 3 complete including every branch; screen and print show identical numbers via lib/format.ts; disclaimer present on screen and print; verify in the browser preview (show screenshots of results in both themes and the print preview) and confirm zero console errors.

---

### Phase 5: Saved fits, settings, landing
**Goal:** the full v1 loop closes. Flows 4, 5, 6 complete.

**Prompt to paste:**
> Read CLAUDE.md, docs/User-Flows.md Flows 4-6, docs/UX-UI-Design.md §4.1, §4.4, §4.5. Execute Phase 5 from docs/Build-Plan.md: build /fits (card grid, rename inline, duplicate-and-edit into the wizard review step, delete via a shared useConfirmDelete utility implementing confirm-dialog + 10s undo exactly per the universal delete rule), /settings (units, theme, export/import JSON with schema-version validation and merge-or-replace choice, erase-everything with typed confirmation), and the real landing page per UX-UI-Design §4.1 including the welcome-back variant when local fits exist. Every view gets loading, empty, and error states per UX-UI-Design §5. Acceptance: Flows 4, 5 and 6 complete with every branch (undo restores fully, invalid import changes nothing, erase lands on fresh /); delete anywhere in the app routes through the one shared utility; verify in the browser preview exercising rename, duplicate, delete+undo, export, import, and erase, with screenshots of /fits populated and empty and the landing welcome-back state.

---

### Phase 6: Polish, offline, a11y, methodology
**Goal:** the premium pass and the trust page. v1.0 ship candidate.

**Prompt to paste:**
> Read CLAUDE.md, docs/UX-UI-Design.md (all), docs/User-Flows.md Flow 8, docs/PRD.md §8. Execute Phase 6 from docs/Build-Plan.md: (1) write and build the /method page from PRD §6 in the §8 copy voice; (2) add PWA manifest + service worker so the loaded app works fully offline with the offline chip per Flow 8, plus the IndexedDB-unavailable fallback; (3) an accessibility pass against UX-UI-Design §6 (fix everything found); (4) a motion pass: reveal count-up, step transitions, reduced-motion fallbacks; (5) a performance pass to the PRD §8 budgets (landing JS < 150kB gz, LCP target); (6) SEO/meta: titles, descriptions, OG image (generated SVG-based, no external service); (7) error boundaries per Flow 8; (8) run the banned-word copy check across all UI text. Acceptance: Lighthouse (or equivalent) accessibility and performance both 95+; airplane-mode walkthrough of wizard-to-results works; reduced-motion verified; show me screenshots and the audit numbers.

---

### Phase 7 (v1.1): Optional account sync
**Goal:** Flow 7, Supabase, still $0.

**Prompt to paste:**
> Read CLAUDE.md, docs/User-Flows.md Flow 7, docs/PRD.md §7. Execute Phase 7 from docs/Build-Plan.md: create the Supabase project schema via versioned migrations in supabase/migrations/ (profiles + fits mirroring the local schema, deleted_at tombstones, RLS user_id = auth.uid() on every table, no anon access); implement magic-link sign-in client-side; sync engine per Flow 7 (first-sign-in upload, two-way last-write-wins by updatedAt, tombstone deletes, offline queue with status chip); account section in /settings with sync status and a sign-out that keeps local data and says so. Everything must keep working signed-out and when Supabase is unreachable (degrade to local + chip, never a modal). Acceptance: Flow 7 complete including conflict and offline branches; RLS verified by attempting cross-user reads in a test; sign-out leaves local data; sync failure simulated (block the network) degrades gracefully; show me proof of each.

---

### Phase 8: Launch
**Goal:** live on the internet.

**Prompt to paste:**
> Execute Phase 8 from docs/Build-Plan.md: prepare for deploy on Vercel Hobby: production env check (Supabase publishable keys only, nothing secret in the client, no NEXT_PUBLIC_ misuse), a final full-app walkthrough of every flow in docs/User-Flows.md acting as a first-time user on mobile viewport, fix anything that fails, then give me a launch checklist with the exact Vercel setup steps (I'll click the Vercel/GitHub connect steps myself) and a post-launch smoke checklist.

---

## 5. Maintenance mode (after launch)

- **Monthly, one short session:** "Update dependencies, run all tests and the Playwright smoke, fix anything that broke, show me proof." Golden tests make this safe.
- **Bug reports:** paste the report into a session with "reproduce this in the preview first, then fix, then prove it's fixed".
- **Cost watch:** Vercel and Supabase dashboards both email before limits; local-first design means even a hard cutoff of Supabase only disables sync.
- **Backups:** the app's own JSON export is the user-side backup; for the cloud side, Supabase free tier includes daily backups (7 days).

## 6. What you personally must do (the short list)

1. Phase 0: create the GitHub repo (public) and connect Vercel once.
2. Phase 2: hand-verify the golden table. This is the highest-leverage 30 minutes of the whole project.
3. Each phase: 2-minute preview check, then merge.
4. Phase 7: create the Supabase project (free tier) and paste the URL + publishable key into env.
5. Phase 8: click through Vercel's domain settings if you buy a domain.

Everything else is Claude's job.
