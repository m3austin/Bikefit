# SportFit design docs

The brief for expanding BikeFit into SportFit, a multi-sport video
technique-analysis platform by Marshmallow Labs, plus a paid coach directory.
Design only; no code has changed. Read in order:

| Doc | What it covers |
|---|---|
| [00-Vision.md](00-Vision.md) | The product, free vs paid model, personas, scope, naming, trust/legal posture, open decisions |
| [01-Architecture.md](01-Architecture.md) | The shared analysis kernel + per-sport module pattern; how BikeFit refactors in; the local-first-consumer vs server-directory split; data model; security |
| [02-Sport-Modules.md](02-Sport-Modules.md) | Per-sport design specs: running, weightlifting, golf, swimming (all targets are placeholders) |
| [03-Directory-and-Credentials.md](03-Directory-and-Credentials.md) | Coach directory, Certified/Pro badges, assessment engine, subscriptions, CE attestation, and the trust/legal guardrails |
| [04-Brand-and-Voice.md](04-Brand-and-Voice.md) | Marshmallow Labs vs SportFit branding, per-sport palettes, the three-register voice, the mascot easter-egg system |
| [05-Build-Plan.md](05-Build-Plan.md) | Phased build (0-10) with rationale and paste-ready prompts |

Existing BikeFit docs (docs/PRD.md, UX-UI-Design.md, User-Flows.md, CLAUDE.md)
still govern the cycling module and the shared kernel; this set layers the
platform on top. Nothing here is built yet: it is the plan.
