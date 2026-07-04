import { DrillGuide } from "@/components/kernel/drill-guide";
import type { FormFigure } from "@/components/kernel/form-cue";
import { GOLF_DRILLS, type GolfDrillId } from "@/lib/sports/golf/drills";

/*
 * The GolfFit drill guide (/golf/drills), rendered by the kernel drill guide.
 * The posture drill carries a "what good looks like" figure; the rest are
 * about swing rhythm and movement, which a single static pose cannot show.
 */

const FIGURES: Partial<Record<GolfDrillId, FormFigure>> = {
  posture: {
    pose: {
      head: { x: 0.63, y: 0.22 },
      shoulder: { x: 0.58, y: 0.3 },
      elbow: { x: 0.57, y: 0.46 },
      wrist: { x: 0.55, y: 0.6 },
      hip: { x: 0.46, y: 0.5 },
      knee: { x: 0.5, y: 0.72 },
      ankle: { x: 0.5, y: 0.92 },
      heel: { x: 0.44, y: 0.95 },
      toe: { x: 0.6, y: 0.95 },
    },
    highlight: { joints: ["shoulder", "hip"], tone: "great" },
    caption: "Tilt from the hips, spine long, and hold it through the swing.",
  },
};

export function GolfDrillsGuide() {
  return (
    <DrillGuide
      kicker="GolfFit drill guide"
      title="Practice that actually moves the needle"
      intro="Each drill below matches a finding from the swing analysis. Pick the one your analysis pointed at, give it a week of short sessions, and re-film. One change at a time; the range will still be there."
      drills={GOLF_DRILLS}
      figures={FIGURES}
      footer="Drills are guidance, not a lesson or medical advice. If a movement causes pain, stop; that is a conversation for a coach or a physician."
    />
  );
}
