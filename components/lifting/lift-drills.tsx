import { DrillGuide } from "@/components/kernel/drill-guide";
import type { FormFigure } from "@/components/kernel/form-cue";
import { LIFT_DRILLS, type LiftDrillId } from "@/lib/sports/lifting/drills";

/*
 * The LiftFit cues and drills guide (/lifting/drills), rendered by the kernel
 * drill guide. Each positional drill carries a "what good looks like" side-
 * view figure; the bench-groove drill is about bar path over time, so it has
 * none. Deep links from the analysis target section ids matching drill ids.
 */

const FIGURES: Partial<Record<LiftDrillId, FormFigure>> = {
  "brace-and-hinge": {
    pose: {
      head: { x: 0.68, y: 0.26 },
      shoulder: { x: 0.62, y: 0.34 },
      elbow: { x: 0.6, y: 0.5 },
      wrist: { x: 0.56, y: 0.66 },
      hip: { x: 0.42, y: 0.52 },
      knee: { x: 0.48, y: 0.72 },
      ankle: { x: 0.48, y: 0.93 },
      heel: { x: 0.42, y: 0.96 },
      toe: { x: 0.58, y: 0.96 },
    },
    highlight: { joints: ["shoulder", "hip"], tone: "great" },
    caption: "Hinge from the hips with a flat back before the bar moves.",
  },
  "setup-height": {
    pose: {
      head: { x: 0.67, y: 0.28 },
      shoulder: { x: 0.6, y: 0.36 },
      elbow: { x: 0.55, y: 0.55 },
      wrist: { x: 0.5, y: 0.72 },
      hip: { x: 0.4, y: 0.5 },
      knee: { x: 0.46, y: 0.7 },
      ankle: { x: 0.47, y: 0.93 },
      heel: { x: 0.41, y: 0.96 },
      toe: { x: 0.57, y: 0.96 },
    },
    highlight: { joints: ["shoulder", "hip"], tone: "great" },
    caption: "Back flat, hips set, bar over your midfoot.",
  },
  "box-depth": {
    pose: {
      head: { x: 0.5, y: 0.14 },
      shoulder: { x: 0.52, y: 0.26 },
      elbow: { x: 0.46, y: 0.34 },
      wrist: { x: 0.42, y: 0.3 },
      hip: { x: 0.44, y: 0.56 },
      knee: { x: 0.58, y: 0.6 },
      ankle: { x: 0.5, y: 0.86 },
      heel: { x: 0.44, y: 0.9 },
      toe: { x: 0.6, y: 0.9 },
    },
    highlight: { joints: ["hip", "knee"], tone: "great" },
    caption: "Hip crease to about knee height, under control.",
  },
  "heels-down": {
    pose: {
      head: { x: 0.5, y: 0.12 },
      shoulder: { x: 0.5, y: 0.24 },
      elbow: { x: 0.5, y: 0.38 },
      wrist: { x: 0.5, y: 0.5 },
      hip: { x: 0.47, y: 0.52 },
      knee: { x: 0.55, y: 0.68 },
      ankle: { x: 0.5, y: 0.9 },
      heel: { x: 0.42, y: 0.93 },
      toe: { x: 0.62, y: 0.93 },
    },
    highlight: { joints: ["heel", "ankle", "toe"], tone: "great" },
    caption: "Whole foot planted, weight through the midfoot.",
  },
  "lockout-finish": {
    pose: {
      head: { x: 0.5, y: 0.1 },
      shoulder: { x: 0.5, y: 0.22 },
      elbow: { x: 0.5, y: 0.37 },
      wrist: { x: 0.5, y: 0.5 },
      hip: { x: 0.5, y: 0.52 },
      knee: { x: 0.5, y: 0.74 },
      ankle: { x: 0.5, y: 0.93 },
      heel: { x: 0.44, y: 0.96 },
      toe: { x: 0.6, y: 0.96 },
    },
    highlight: { joints: ["shoulder", "hip", "knee"], tone: "great" },
    caption: "Standing tall, hips through, ribs down.",
  },
};

export function LiftDrillsGuide() {
  return (
    <DrillGuide
      kicker="LiftFit cues and drills"
      title="Fix one thing, with the weight you can control"
      intro="Each drill below matches a finding from the form analysis. Take the one your analysis pointed at, drop the weight, and rebuild the pattern before you load it again. The bar will still be there next week."
      drills={LIFT_DRILLS}
      figures={FIGURES}
      footer="These are cues, not coaching, and not medical advice. LiftFit is not a spotter and cannot catch a failed rep. If a movement hurts, or your back rounds even at light weight, stop and see a qualified strength coach or a physiotherapist before lifting that way again."
    />
  );
}
