import { DrillGuide } from "@/components/kernel/drill-guide";
import type { FormFigure } from "@/components/kernel/form-cue";
import { RUN_DRILLS, type RunDrillId } from "@/lib/sports/running/drills";

/*
 * The RunFit drill guide (/running/drills), rendered by the kernel drill
 * guide. Posture and landing carry "what good looks like" figures; cadence
 * and the quiet-feet drills are about rhythm, so they render without one.
 */

const FIGURES: Partial<Record<RunDrillId, FormFigure>> = {
  posture: {
    pose: {
      head: { x: 0.55, y: 0.12 },
      shoulder: { x: 0.53, y: 0.24 },
      elbow: { x: 0.6, y: 0.36 },
      wrist: { x: 0.62, y: 0.46 },
      hip: { x: 0.5, y: 0.52 },
      knee: { x: 0.49, y: 0.72 },
      ankle: { x: 0.48, y: 0.92 },
      heel: { x: 0.42, y: 0.95 },
      toe: { x: 0.58, y: 0.95 },
    },
    highlight: { joints: ["head", "shoulder", "hip"], tone: "great" },
    caption: "Tall through the spine, a slight lean from the ankles.",
  },
  "land-under-hips": {
    pose: {
      head: { x: 0.54, y: 0.12 },
      shoulder: { x: 0.52, y: 0.24 },
      elbow: { x: 0.44, y: 0.34 },
      wrist: { x: 0.4, y: 0.44 },
      hip: { x: 0.5, y: 0.52 },
      knee: { x: 0.52, y: 0.71 },
      ankle: { x: 0.5, y: 0.9 },
      heel: { x: 0.44, y: 0.93 },
      toe: { x: 0.58, y: 0.92 },
    },
    highlight: { joints: ["hip", "ankle"], tone: "great" },
    caption: "Foot lands close to under your hips, knee soft.",
  },
};

export function RunDrillsGuide() {
  return (
    <DrillGuide
      kicker="RunFit drill guide"
      title="Small changes, given time to stick"
      intro="Each drill below matches a finding from the gait analysis. Pick the one your analysis pointed at, fold it into easy runs for two weeks, and re-film. One change at a time; the road will still be there."
      drills={RUN_DRILLS}
      figures={FIGURES}
      footer="Drills are guidance, not a lesson, a rehab plan, or medical advice. If you are running with pain, or a drill creates pain, stop and see a physiotherapist."
    />
  );
}
