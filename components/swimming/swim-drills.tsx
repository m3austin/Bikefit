import { DrillGuide } from "@/components/kernel/drill-guide";
import type { FormFigure } from "@/components/kernel/form-cue";
import { SWIM_DRILLS, type SwimDrillId } from "@/lib/sports/swimming/drills";

/*
 * The SwimFit drill guide (/swimming/drills), rendered by the kernel drill
 * guide. Front crawl is horizontal, so the "what good looks like" figures are
 * authored on their side: head-position (head in line with the spine) and
 * high-elbow (the recovery arm). Roll and catch-up are about motion over
 * time, so they render without a figure.
 */

const FIGURES: Partial<Record<SwimDrillId, FormFigure>> = {
  "head-position": {
    pose: {
      head: { x: 0.32, y: 0.5 },
      shoulder: { x: 0.5, y: 0.5 },
      elbow: { x: 0.24, y: 0.48 },
      wrist: { x: 0.13, y: 0.47 },
      hip: { x: 0.72, y: 0.53 },
      knee: { x: 0.85, y: 0.55 },
      ankle: { x: 0.96, y: 0.57 },
      heel: { x: 0.98, y: 0.6 },
      toe: { x: 0.99, y: 0.54 },
    },
    highlight: { joints: ["head", "shoulder", "hip"], tone: "great" },
    caption: "Eyes down, head in line with your spine.",
  },
  "high-elbow": {
    pose: {
      head: { x: 0.34, y: 0.52 },
      shoulder: { x: 0.5, y: 0.5 },
      elbow: { x: 0.42, y: 0.34 },
      wrist: { x: 0.31, y: 0.42 },
      hip: { x: 0.72, y: 0.53 },
      knee: { x: 0.85, y: 0.55 },
      ankle: { x: 0.96, y: 0.57 },
      heel: { x: 0.98, y: 0.6 },
      toe: { x: 0.99, y: 0.54 },
    },
    highlight: { joints: ["shoulder", "elbow", "wrist"], tone: "great" },
    caption: "Lead the recovery with a high elbow, hand relaxed.",
  },
};

export function SwimDrillsGuide() {
  return (
    <DrillGuide
      kicker="SwimFit drill guide"
      title="Quiet fixes for a noisy stroke"
      intro="Each drill below matches a finding from the stroke analysis. Pick the one your analysis pointed at, give it a few easy swims, and re-film. One change at a time, and remember the numbers here are rough by nature; trust the feel of the water too."
      drills={SWIM_DRILLS}
      figures={FIGURES}
      footer="Drills are guidance, not a lesson or medical advice. Never swim alone where you cannot safely stop, and if a change causes shoulder pain, stop and see a coach or a physiotherapist."
    />
  );
}
