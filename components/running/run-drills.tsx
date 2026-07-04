import { DrillGuide } from "@/components/kernel/drill-guide";
import { RUN_DRILLS } from "@/lib/sports/running/drills";

/*
 * The RunFit drill guide (/running/drills), rendered by the kernel drill
 * guide. Deep links from the analysis target section ids matching drill ids.
 */
export function RunDrillsGuide() {
  return (
    <DrillGuide
      kicker="RunFit drill guide"
      title="Small changes, given time to stick"
      intro="Each drill below matches a finding from the gait analysis. Pick the one your analysis pointed at, fold it into easy runs for two weeks, and re-film. One change at a time; the road will still be there."
      drills={RUN_DRILLS}
      footer="Drills are guidance, not a lesson, a rehab plan, or medical advice. If you are running with pain, or a drill creates pain, stop and see a physiotherapist."
    />
  );
}
