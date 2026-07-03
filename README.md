# BikeFit

A free, local-first web app that gives everyday cyclists a professional-quality starting bike fit from their own body measurements. No account required, no ads, measurements never leave your device unless you opt into sync.

## Status

v1.0 built (Phases 0-7 complete): local-first measurement wizard, a pure fit
engine with locked golden tests, results + print fit sheet, saved fits, settings
with export/import, offline PWA, an accessibility pass, and optional Supabase
sync. Ready to deploy per [docs/Launch.md](docs/Launch.md).

Run locally: `npm install`, then `npm run dev`. Gates: `npm run lint`,
`npx tsc --noEmit`, `npm run test`, `npm run build`, `npm run e2e`.

## Docs

| Doc | Role |
|-----|------|
| [docs/PRD.md](docs/PRD.md) | Product requirements: scope, personas, the fit engine formulas, data model, quality contract |
| [docs/UX-UI-Design.md](docs/UX-UI-Design.md) | Design standard: tokens, components, screens, states, accessibility, print |
| [docs/User-Flows.md](docs/User-Flows.md) | Canonical user flows with Mermaid diagrams; every branch must be built |
| [docs/Build-Plan.md](docs/Build-Plan.md) | Stack (free-tier only), repo structure, automation setup, and paste-ready prompts for each build phase |
| [CLAUDE.md](CLAUDE.md) | Rules every Claude Code session follows in this repo |

## Stack (all free tier)

Next.js + TypeScript strict, Tailwind v4 + shadcn/ui, pure-TS fit engine with golden tests, IndexedDB (Dexie) local-first storage, Vercel Hobby hosting, GitHub Actions CI, optional Supabase sync in v1.1.
