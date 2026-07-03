# Fit engine verification table

Engine version: **1.0.0** | Generated for Phase 2 review | Source of truth: `lib/engine/`

This is the hand-check surface for the golden test suite (`lib/engine/compute.test.ts`).
Every number below is produced by the PRD §6 formulas. Once you bless these
values, they are locked: any future change to a golden must be justified in its
PR description, and CI fails otherwise (CLAUDE.md, PRD §9).

To verify: take a calculator and PRD §6, recompute each profile, and confirm the
outputs match. The "working" lines show the arithmetic so you do not have to
reconstruct it.

---

## Conventions and rounding

- All lengths are **integer millimetres** except where noted.
- **Crank length** may be a 2.5 mm step (e.g. 172.5 mm) per PRD §6.7. This is the
  one length that is not an integer.
- **Frame size** is buyer-facing and quoted in **cm** (road-like) or **inches**
  (MTB), each to one decimal, per the PRD schema field names.
- **Rounding is half-up** (ties away from zero), so `71.5 -> 72` and, for a
  negative intermediate, `-14.25 -> -14`. The engine nudges by 1e-9 first so
  binary-float error never flips a tie the wrong way; a calculator and the code
  agree.

## Formula reference (PRD §6)

| Output | Formula | Range | Modifiers |
|---|---|---|---|
| Saddle height start | mean of LeMond `0.883·inseam` and Hamley `1.09·inseam − crank`, rounded | ±6 mm | bike: road 0, gravel −2, mtb −5, hybrid −5; priority: comfort −3, balanced −1, performance 0 |
| Saddle setback start | `0.245·inseam − 100` | ±10 mm | none |
| Frame (road/gravel/hybrid) | `0.665·inseam` (cm) | — | — |
| Frame (mtb) | `0.225·inseam` (inches) | — | — |
| Reach start | `(torso + arm)/2 + 40` | ±15 mm | priority: comfort −10, balanced 0, performance +10 |
| Bar drop (road/gravel) | band by flexibility: high 60–100, medium 30–60, low 0–30 | band | priority positions start: comfort=band low, performance=band high, balanced=midpoint |
| Bar width (road/gravel) | shoulder rounded to nearest 20 mm | — | — |
| Crank (if not given) | <750→165, 750–809→170, 810–859→172.5, ≥860→175 | — | — |

## Interpretation decisions (PRD is explicit unless flagged 🚩 for your veto)

1. **Bar drop direction.** Comfort = least drop = the numeric **low** end of the
   band; performance = most drop = the **high** end; balanced = midpoint. (PRD
   §6.5 says "comfort = top of band" meaning the bars sit higher, i.e. less drop.)
2. 🚩 **Hybrid frame size** uses the road/gravel cm formula (PRD §6.3 covers only
   road/gravel and MTB; hybrid geometry is road-like, so cm fits better than the
   MTB inch formula).
3. 🚩 **Hybrid bar drop and bar width are omitted** (undefined), like MTB. Hybrids
   run flat bars, so drop-bar width steps and a saddle-relative drop do not apply.
   PRD §6.6 explicitly excludes only MTB; this extends the same logic to hybrid.
4. **Caution flags** are computed by the engine from the plausible ranges (PRD §5):
   any measurement below its min or above its max is flagged. These are the same
   ranges the wizard challenges on, so "confirmed unusual" in the wizard lines up
   with an engine caution flag.
5. **`computedAt`** is injected by the caller (the engine is pure and never reads
   the clock); it is empty in these goldens.

---

## Inputs

| # | Profile | Bike | Priority | Flex | Height | Inseam | Torso | Arm | Shoulder | Foot | Crank input |
|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---|
| P1 | M | road | balanced | medium | 1780 | 820 | 600 | 640 | 420 | 275 | recommended |
| P2 | S | gravel | comfort | low | 1600 | 700 | 520 | 560 | 380 | — | 170 (given) |
| P3 | L | mtb | performance | high | 1850 | 860 | 640 | 680 | 450 | 290 | recommended |
| P4 | XL | hybrid | balanced | medium | 1950 | 900 | 700 | 720 | 480 | — | recommended |
| P5 | S | road | performance | high | 1680 | 740 | 560 | 600 | 400 | 260 | recommended |
| P6 | M | gravel | balanced | medium | 1720 | 780 | 580 | 620 | 410 | — | recommended |
| P7 | caution↑ | road | balanced | medium | 1900 | **1050** | 620 | 660 | 430 | 280 | recommended |
| P8 | caution↓ | mtb | comfort | low | 1550 | **580** | 480 | 540 | 350 | — | 165 (given) |

All measurements in mm. P7 inseam is above the plausible max (1000); P8 inseam is
below the plausible min (600).

## Outputs

Saddle, setback, reach, bar drop and bar width in mm. Frame in cm (road-like) or
inches (mtb). Crank in mm.

| # | Saddle start (low–high) | LeMond / Hamley | Setback start (range) | Frame | Reach start (range) | Bar drop low/high/start | Bar width | Crank | Cleat | Caution |
|---|---|---|---|---|---|---|---|---:|:--:|---|
| P1 | **722** (716–728) | 724 / 721 | 101 (91–111) | 54.5 cm | 660 (645–675) | 30 / 60 / 45 | 420 | 172.5 | yes | — |
| P2 | **601** (595–607) | 618 / 593 | 72 (62–82) | 46.6 cm | 570 (555–585) | 0 / 30 / 0 | 380 | 170 | no | — |
| P3 | **756** (750–762) | 759 / 762 | 111 (101–121) | 19.4 in | 710 (695–725) | — | — | 175 | yes | — |
| P4 | **794** (788–800) | 795 / 806 | 121 (111–131) | 59.9 cm | 750 (735–765) | — | — | 175 | no | — |
| P5 | **648** (642–654) | 653 / 642 | 81 (71–91) | 49.2 cm | 630 (615–645) | 60 / 100 / 100 | 400 | 165 | yes | — |
| P6 | **681** (675–687) | 689 / 680 | 91 (81–101) | 51.9 cm | 640 (625–655) | 30 / 60 / 45 | 420 | 170 | no | — |
| P7 | **947** (941–953) | 927 / 970 | 157 (147–167) | 69.8 cm | 680 (665–695) | 30 / 60 / 45 | 440 | 175 | yes | inseam above |
| P8 | **482** (476–488) | 512 / 467 | 42 (32–52) | 13.1 in | 540 (525–555) | — | — | 165 | no | inseam below |

---

## Working (the arithmetic for each profile)

### P1 — road / balanced / medium, crank recommended
- Crank: inseam 820 in 810–859 → **172.5**
- LeMond 0.883·820 = 724.06 → 724; Hamley 1.09·820 − 172.5 = 721.3 → 721
- Mean (724.06 + 721.3)/2 = 722.68 → 723; + road 0 + balanced −1 = **722**; ±6 → 716–728
- Setback 0.245·820 − 100 = 100.9 → **101**; ±10 → 91–111
- Frame 0.665·820 = 545.3 → 545 mm → **54.5 cm**
- Reach (600 + 640)/2 + 40 = 660; + balanced 0 = **660**; ±15 → 645–675
- Bar drop medium band 30–60, balanced → midpoint **45**
- Bar width round(420/20)·20 = **420**

### P2 — gravel / comfort / low, crank given 170
- LeMond 0.883·700 = 618.1 → 618; Hamley 1.09·700 − 170 = 593 → 593
- Mean (618.1 + 593)/2 = 605.55 → 606; + gravel −2 + comfort −3 = **601**; ±6 → 595–607
- Setback 0.245·700 − 100 = 71.5 → **72** (half-up); ±10 → 62–82
- Frame 0.665·700 = 465.5 → 466 mm → **46.6 cm**
- Reach (520 + 560)/2 + 40 = 580; + comfort −10 = **570**; ±15 → 555–585
- Bar drop low band 0–30, comfort → band low **0**
- Bar width round(380/20)·20 = **380**

### P3 — mtb / performance / high, crank recommended
- Crank: inseam 860 ≥ 860 → **175**
- LeMond 0.883·860 = 759.38 → 759; Hamley 1.09·860 − 175 = 762.4 → 762
- Mean (759.38 + 762.4)/2 = 760.89 → 761; + mtb −5 + performance 0 = **756**; ±6 → 750–762
- Setback 0.245·860 − 100 = 110.7 → **111**; ±10 → 101–121
- Frame 0.225·860 = 193.5 → **19.4 in**
- Reach (640 + 680)/2 + 40 = 700; + performance +10 = **710**; ±15 → 695–725
- Bar drop and bar width: **omitted** (MTB)

### P4 — hybrid / balanced / medium, crank recommended
- Crank: inseam 900 ≥ 860 → **175**
- LeMond 0.883·900 = 794.7 → 795; Hamley 1.09·900 − 175 = 806 → 806
- Mean (794.7 + 806)/2 = 800.35 → 800; + hybrid −5 + balanced −1 = **794**; ±6 → 788–800
- Setback 0.245·900 − 100 = 120.5 → **121** (half-up); ±10 → 111–131
- Frame 0.665·900 = 598.5 → 599 mm → **59.9 cm** (hybrid uses the road formula 🚩)
- Reach (700 + 720)/2 + 40 = 750; + balanced 0 = **750**; ±15 → 735–765
- Bar drop and bar width: **omitted** (hybrid 🚩)

### P5 — road / performance / high, crank recommended
- Crank: inseam 740 < 750 → **165**
- LeMond 0.883·740 = 653.42 → 653; Hamley 1.09·740 − 165 = 641.6 → 642
- Mean (653.42 + 641.6)/2 = 647.51 → 648; + road 0 + performance 0 = **648**; ±6 → 642–654
- Setback 0.245·740 − 100 = 81.3 → **81**; ±10 → 71–91
- Frame 0.665·740 = 492.1 → 492 mm → **49.2 cm**
- Reach (560 + 600)/2 + 40 = 620; + performance +10 = **630**; ±15 → 615–645
- Bar drop high band 60–100, performance → band high **100**
- Bar width round(400/20)·20 = **400**

### P6 — gravel / balanced / medium, crank recommended
- Crank: inseam 780 in 750–809 → **170**
- LeMond 0.883·780 = 688.74 → 689; Hamley 1.09·780 − 170 = 680.2 → 680
- Mean (688.74 + 680.2)/2 = 684.47 → 684; + gravel −2 + balanced −1 = **681**; ±6 → 675–687
- Setback 0.245·780 − 100 = 91.1 → **91**; ±10 → 81–101
- Frame 0.665·780 = 518.7 → 519 mm → **51.9 cm**
- Reach (580 + 620)/2 + 40 = 640; + balanced 0 = **640**; ±15 → 625–655
- Bar drop medium band 30–60, balanced → midpoint **45**
- Bar width round(410/20)·20 = round(20.5)·20 = 21·20 = **420** (half-up)

### P7 — CAUTION (above): road / balanced / medium, crank recommended
- Inseam 1050 > 1000 max → caution `{ inseam, above }`
- Crank: 1050 ≥ 860 → **175**
- LeMond 0.883·1050 = 927.15 → 927; Hamley 1.09·1050 − 175 = 969.5 → 970
- Mean (927.15 + 969.5)/2 = 948.325 → 948; + road 0 + balanced −1 = **947**; ±6 → 941–953
- Setback 0.245·1050 − 100 = 157.25 → **157**; ±10 → 147–167
- Frame 0.665·1050 = 698.25 → 698 mm → **69.8 cm**
- Reach (620 + 660)/2 + 40 = 680; + balanced 0 = **680**; ±15 → 665–695
- Bar drop medium band 30–60, balanced → **45**; bar width round(430/20)·20 = round(21.5)·20 = 22·20 = **440**

### P8 — CAUTION (below): mtb / comfort / low, crank given 165
- Inseam 580 < 600 min → caution `{ inseam, below }`
- LeMond 0.883·580 = 512.14 → 512; Hamley 1.09·580 − 165 = 467.2 → 467
- Mean (512.14 + 467.2)/2 = 489.67 → 490; + mtb −5 + comfort −3 = **482**; ±6 → 476–488
- Setback 0.245·580 − 100 = 42.1 → **42**; ±10 → 32–52
- Frame 0.225·580 = 130.5 → **13.1 in**
- Reach (480 + 540)/2 + 40 = 550; + comfort −10 = **540**; ±15 → 525–555
- Bar drop and bar width: **omitted** (MTB)

---

## Coverage of the required matrix

- **Bike types:** road (P1, P5, P7), gravel (P2, P6), mtb (P3, P8), hybrid (P4). ✓
- **Priorities:** comfort (P2, P8), balanced (P1, P4, P6, P7), performance (P3, P5). ✓
- **Flexibility:** low (P2, P8), medium (P1, P4, P6, P7), high (P3, P5). ✓
- **Sizes:** S (P2, P5), M (P1, P6), L (P3), XL (P4). ✓
- **Crank table:** 165 (P5), 170 (P6), 172.5 (P1), 175 (P3, P4, P7) via recommendation; given crank (P2, P8). ✓
- **Foot given / absent:** given (P1, P3, P5, P7), absent (P2, P4, P6, P8). ✓
- **Caution:** none (P1–P6), above (P7), below (P8). ✓
- **Bar-drop start positioning:** comfort→low (P2), balanced→mid (P1, P6, P7), performance→high (P5). ✓

Engine branch/statement/function/line coverage: **100%** (`npm run test:coverage`).
