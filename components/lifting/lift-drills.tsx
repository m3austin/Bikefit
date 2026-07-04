import { DrillGuide } from "@/components/kernel/drill-guide";
import { LIFT_DRILLS } from "@/lib/sports/lifting/drills";

/*
 * The LiftFit cues and drills guide (/lifting/drills), rendered by the
 * kernel drill guide. Deep links from the analysis target section ids
 * matching drill ids. The footer carries the sport's firmest safety line.
 */
export function LiftDrillsGuide() {
  return (
    <DrillGuide
      kicker="LiftFit cues and drills"
      title="Fix one thing, with the weight you can control"
      intro="Each drill below matches a finding from the form analysis. Take the one your analysis pointed at, drop the weight, and rebuild the pattern before you load it again. The bar will still be there next week."
      drills={LIFT_DRILLS}
      footer="These are cues, not coaching, and not medical advice. LiftFit is not a spotter and cannot catch a failed rep. If a movement hurts, or your back rounds even at light weight, stop and see a qualified strength coach or a physiotherapist before lifting that way again."
    />
  );
}
