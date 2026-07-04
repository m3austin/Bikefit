import { DrillGuide } from "@/components/kernel/drill-guide";
import { SWIM_DRILLS } from "@/lib/sports/swimming/drills";

/*
 * The SwimFit drill guide (/swimming/drills), rendered by the kernel drill
 * guide. Deep links from the analysis target section ids matching drill ids.
 */
export function SwimDrillsGuide() {
  return (
    <DrillGuide
      kicker="SwimFit drill guide"
      title="Quiet fixes for a noisy stroke"
      intro="Each drill below matches a finding from the stroke analysis. Pick the one your analysis pointed at, give it a few easy swims, and re-film. One change at a time, and remember the numbers here are rough by nature; trust the feel of the water too."
      drills={SWIM_DRILLS}
      footer="Drills are guidance, not a lesson or medical advice. Never swim alone where you cannot safely stop, and if a change causes shoulder pain, stop and see a coach or a physiotherapist."
    />
  );
}
