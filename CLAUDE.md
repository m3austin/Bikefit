# SportFits - rules for every Claude Code session

SportFits (by Marshmallow Labs) is a free, local-first, multi-sport video
technique-analysis platform. Each sport is a branded module (BikeFit, GolfFit,
RunFit, LiftFit, SwimFit) plugged into a shared analysis kernel. The platform
brief lives in `docs/sportfit/` (00-Vision through 05-Build-Plan); read it for
any platform-level work. The original BikeFit docs below still govern the
cycling module and the kernel's UX bones.

## Platform rules (kernel + modules)

- **The kernel is sport-agnostic.** `lib/kernel/*` (geometry, tracking, cycles,
  rules engine) and `lib/pose-model.ts` / `lib/pose-landmarker.ts` never import
  from a sport. Generic math changes need kernel tests; sport behavior changes
  never belong in the kernel.
- **A sport is a module.** `lib/sports/<slug>/*` holds its biomechanics, rules
  (PLACEHOLDER targets), drills, and copy; `lib/sports/registry.ts` is the one
  list the hub, routes, and future directory read. Adding a sport = a module
  folder + one registry entry. Routes live under `app/[sport]/*`; unknown or
  coming-soon slugs 404 in the segment layout.
- **BikeFit-era URLs are contractual.** `/fit/*` and `/adjust` redirect to
  `/cycling/*` (next.config) and the service worker maps them offline. Never
  break them; the Play deep link uses them.
- **Voice is three registers** (docs/sportfit/04): playful in chrome, plain-
  precise in instructions and numbers, dead-serious on safety (heaviest on
  lifting). Humor never rides into a rep, a result, or a disclaimer.
- **Monetization is deferred by decision** (docs/sportfit/05 appendix): no coach
  directory, assessments, badges, or subscriptions get built until the owner
  calls it, and all such surfaces must hide in the Play wrapper (?src=play).
- **Marshmallow Labs is the publisher brand**: footer signature and mascot
  easter eggs only, never on safety, results, or payment surfaces.

# BikeFit (cycling module) - original rules, still in force

BikeFit is the cycling module: a free, local-first experience giving everyday cyclists a professional-quality starting bike fit from body measurements. Read these docs before building anything:

- `docs/PRD.md` wins on scope, features, and fit-method facts (formulas, ranges, modifiers).
- `docs/UX-UI-Design.md` wins on all UI, design, component, and accessibility decisions.
- `docs/User-Flows.md` is the canonical source for flows. Build every branch and every empty/loading/error/offline state it shows. When behaviour changes, update the Mermaid diagram in the same PR. A flow that doesn't match the build is a defect.
- `docs/Build-Plan.md` defines the stack, repo structure, and the current phase's acceptance criteria.

## Non-negotiables

- **The engine is the contract.** `lib/engine/` is pure TypeScript, zero dependencies, no React/Next/DOM imports. Once the golden test suite is blessed, any change that alters a golden value must fail CI; changing golden values requires explicit justification in the PR description. Never "fix" a test by changing the expected number without flagging it.
- **Millimetres internally, always.** The engine and all storage use integer mm. cm/in exist only at the display layer via `lib/units.ts` and `lib/format.ts`. Never do unit math inline in a component.
- **Single sources of truth:** measurement display goes through `lib/format.ts`; conversion/parsing through `lib/units.ts`; all IndexedDB access through `lib/db.ts` (components never touch Dexie directly). Screen and print must format numbers identically.
- **Design tokens only.** No hardcoded colors, spacing, radii, or shadows. Both themes (dark/light/system) are first-class; verify both when touching UI. Print output is always light.
- **All controls from `components/ui/*`** (shadcn/Radix). No raw `<button>`/`<input>` in feature code. No native number inputs for measurements; use `MeasurementInput`.
- **Universal delete rule:** every destructive action gets (a) a confirmation dialog naming exactly what will be removed, destructive-verb button, Cancel focused by default, AND (b) a ~10s Undo toast that fully restores. All deletes route through the one shared `useConfirmDelete` utility. No exceptions.
- **Never hard-block input.** Out-of-plausible-range measurements get the amber challenge-and-confirm pattern (Flow 2), then proceed with a caution flag. Edge values are the user's call.
- **Local-first, never gated.** Every feature works with no account and no network (after first load). Sync (v1.1) is a mirror, not a dependency; its failures degrade to a status chip, never a modal or a block.
- **Privacy:** no measurement values, names, or result numbers in analytics, logs, or error reports, ever.
- **Copy rules (PRD §12):** calculator, not oracle; never claim to replace a professional fit; banned words: prescription, diagnosis, guaranteed, perfect, professional-grade. No em dashes in product copy. No exclamation marks in instructional copy. Disclaimer stays on results and print.
- **Accessibility floor:** keyboard-complete, labelled inputs, visible focus, `prefers-reduced-motion` respected, contrast per UX-UI-Design §2, touch targets ≥ 44px.

## Video fit analysis (architecture rules)

BikeFit has two fit flows: **Quick Fit** (the original height-based wizard at `/fit/new`, unchanged) and **Video Fit Analysis** (`/fit/video`), which measures joint angles from a pedaling video. `/fit` is the chooser between them.

Video Fit Analysis takes up to two camera views: the **side view is required** (sagittal-plane angles: knee, hip, elbow, torso) and a **front or rear view is optional** (frontal plane: knee tracking, left-right symmetry, hip drop). The two views cannot be told apart automatically, so each has its own labeled upload slot. Never run facing-side detection (`detectFacingSide`) on the front view: it infers the side from one side being occluded, which is false head-on. Each on-screen video owns its own PoseLandmarker instance (VIDEO mode is stateful; two streams must never share one).

- **100% client-side video processing.** The rider's video file is never uploaded to any server, ever: no `fetch`/`XHR` of the video, no server route that touches it. Pose detection runs in-browser via `@mediapipe/tasks-vision` (`PoseLandmarker`, lite model, `VIDEO` running mode). The model weights and WASM runtime are fetched from Google's public CDN on first use of this feature (a one-time, cacheable download of ML model assets, not user data), which is a different thing from uploading the rider's video and is fine.
- **All geometry math lives in `lib/biomechanics.ts`**, as pure functions with unit tests (synthetic landmark fixtures, no browser/DOM/MediaPipe runtime needed to test). Landmark index constants and the skeleton connection topology live in `lib/pose-model.ts` (data, not math) and are imported by both `lib/biomechanics.ts` and the drawing code.
- **All fit thresholds and recommendation rules live in `lib/fit-rules.ts`.** Every threshold value carries a `// PLACEHOLDER:` comment. Never invent, silently tune, or replace a placeholder value; only the user replaces these, with a sourced value.
- **No em dashes anywhere**, including code comments, not just UI copy.

## Engineering standards

- TypeScript `strict: true`. No `any`, `as any`, `@ts-ignore`, or empty `catch {}`.
- IDs via `crypto.randomUUID()`, never `Math.random()`.
- Server components fetch and gate; push `"use client"` as low as possible (this app is client-heavy by design, but keep the shell server-rendered).
- Tailwind v4: custom utilities use `@utility`, not plain classes in `@layer utilities` (v4 silently drops those). Verify utilities actually apply in the browser.
- Cross-directory imports use `@/`; relative paths only for same-folder siblings.
- Keep the app portable: no Vercel-only APIs. It must remain static-export-friendly.
- v1.1 only: all Supabase schema/RLS via versioned migrations in `supabase/migrations/`, RLS on every table (`user_id = auth.uid()`), no service-role in the client, publishable keys only.

## Gates before merging any change

- `npx vitest run` green (engine goldens + unit tests).
- `npx tsc --noEmit` green.
- `npm run lint` green.
- `npm run build` succeeds.
- UI changes: verified in the running dev server in BOTH themes, mobile viewport first, with zero console errors, and every state (loading/empty/error) exercised.
- Work one Build-Plan phase item at a time; meet its acceptance criteria before moving on.
