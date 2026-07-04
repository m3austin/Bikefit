import { DrillGuide } from "@/components/kernel/drill-guide";
import { GOLF_DRILLS } from "@/lib/sports/golf/drills";

/*
 * The GolfFit drill guide (/golf/drills): the swing analogue of cycling's
 * adjustment guide, rendered by the kernel drill guide. Deep links from the
 * analysis target section ids matching drill ids.
 */
export function GolfDrillsGuide() {
  return (
    <DrillGuide
      kicker="GolfFit drill guide"
      title="Practice that actually moves the needle"
      intro="Each drill below matches a finding from the swing analysis. Pick the one your analysis pointed at, give it a week of short sessions, and re-film. One change at a time; the range will still be there."
      drills={GOLF_DRILLS}
      footer="Drills are guidance, not a lesson or medical advice. If a movement causes pain, stop; that is a conversation for a coach or a physician."
    />
  );
}
