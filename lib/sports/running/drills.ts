/*
 * RunFit drill catalog: the gait analogue of cycling's adjustment guide.
 * Typed, testable content in the proven format (what and why, difficulty,
 * time, gear before the steps, pro tips, "when to see a professional").
 * Voice per docs/sportfit/04: plain-precise in the steps, warmth in the
 * framing, and a firmer-than-golf physio line, because gait problems that
 * hurt belong with a physiotherapist, not an app.
 */

import type { SportDrill } from "@/lib/sports/types";

export type RunDrillId =
  | "cadence"
  | "land-under-hips"
  | "posture"
  | "soft-steps"
  | "hip-strength";

export type RunDrill = SportDrill<RunDrillId>;

export const RUN_DRILLS: readonly RunDrill[] = [
  {
    id: "cadence",
    title: "Nudge your cadence (metronome runs)",
    why: "A slightly quicker step is the one change that quietly improves several things at once: landings drift back under your body, bounce flattens, braking shrinks. The trick is nudging it, not forcing it.",
    gear: [
      "A metronome app, or a playlist matched to your target steps per minute",
      "A watch or phone that shows cadence, if you have one",
    ],
    difficulty: "easy",
    time: "A few runs, five to ten minutes each",
    steps: [
      "Take your measured cadence and add five percent. That is your target; more than that invites new problems.",
      "Set the metronome to the target and run easy, matching one footfall to each beat.",
      "Hold it for two to three minutes, then run normally for a few minutes. Repeat three or four times.",
      "Sprinkle these intervals into easy runs for two weeks; the new rhythm will start showing up uninvited.",
      "Re-film and check your cadence against the last analysis.",
    ],
    tips: [
      "Quicker steps, not faster running. Effort stays the same; the step count changes.",
      "If five percent feels frantic, take half of it. Rhythm changes stick when they are barely noticeable.",
    ],
    coachNote:
      "Cadence work should never hurt. If pain shows up when you change your step, stop and see a physiotherapist before continuing; a gait change is not medicine.",
    glossaryIds: ["cadence", "gait"],
  },
  {
    id: "land-under-hips",
    title: "Land under your hips (wall drill)",
    why: "Landing with the foot far ahead of the body brakes every step and loads the knee with the leg at its straightest. Landing closer to under your hips turns the same effort into smoother forward motion.",
    gear: ["A wall or a fence", "Somewhere flat to run a few easy strides"],
    difficulty: "moderate",
    time: "10 minutes",
    steps: [
      "Stand facing a wall, palms on it, and lean into it from the ankles with your body in one line.",
      "Run in place against the wall, feet landing directly below your hips. Feel where the ground meets your foot.",
      "Step away and run twenty easy strides trying to keep that same under-you landing.",
      "Alternate wall and strides three or four times. The wall recalibrates the feel each round.",
      "Re-film from the side and compare your overstride number.",
    ],
    tips: [
      "A small cadence nudge makes this drill much easier; the two changes are the same change from different ends.",
      "Do not reach for a forefoot landing on purpose. Land closer, and let the foot do whatever it does.",
    ],
    coachNote:
      "If changing where you land causes calf, Achilles, or knee pain, stop. Persistent pain during normal running is a physiotherapist conversation, not a drill.",
    glossaryIds: ["overstride", "foot-strike", "cadence"],
  },
  {
    id: "posture",
    title: "Run tall (posture reset)",
    why: "Good running posture is length through the spine with a slight whole-body lean from the ankles. A fold at the waist points the engine down; a backward sit puts the brakes on. Tall and slightly forward points everything the way you are going.",
    gear: ["Nothing"],
    difficulty: "easy",
    time: "A minute, repeated during any run",
    steps: [
      "Mid-run, exhale and grow a centimetre taller: crown of the head up, shoulders easy, eyes on the horizon.",
      "From that tall line, tip the whole body a touch forward from the ankles, not the waist. It should feel like barely anything.",
      "Hold for thirty seconds, then forget about it and run. Repeat every few minutes.",
      "Re-film from the side and compare your trunk lean number.",
    ],
    tips: [
      "Tall first, lean second. A lean without length is just slouching with commitment.",
      "Fatigue undoes posture quietly; the reset matters more at the end of a run than the start.",
    ],
    coachNote:
      "If holding tall posture is uncomfortable or you cannot feel the difference, a physiotherapist or running coach can find the restriction faster than any cue.",
    glossaryIds: ["gait"],
  },
  {
    id: "soft-steps",
    title: "Quiet feet (soft landings)",
    why: "Loud footfalls usually mean a straight leg and a high bounce delivering your bodyweight all at once. Landing quietly forces a softer knee and a flatter path without thinking about either.",
    gear: ["A quiet stretch of pavement or a treadmill, so you can hear yourself"],
    difficulty: "easy",
    time: "5 to 10 minutes",
    steps: [
      "Run easy and just listen to your feet for thirty seconds. That is your baseline volume.",
      "Now run as quietly as you can for one minute, like running past a sleeping dog. Let the knees stay soft.",
      "Alternate normal and quiet minutes four or five times.",
      "Re-film and compare your knee-at-contact and bounce numbers.",
    ],
    tips: [
      "Quiet is a result, not a technique. Chase the sound and the mechanics sort themselves.",
      "Headphones off for this one. The feedback is the whole drill.",
    ],
    coachNote:
      "Softening landings should feel easier on the body, not harder. Any new pain is a stop sign and a physiotherapist question.",
    glossaryIds: ["vertical-oscillation", "foot-strike"],
  },
  {
    id: "hip-strength",
    title: "Steady hips (strength work)",
    why: "A hip that dips on every stance is rarely a technique problem; it is usually a strength one. The muscles on the side of the standing hip hold your pelvis level, and they respond to weeks of plain, boring work.",
    gear: ["A step or sturdy low platform", "A mat if you like comfort"],
    difficulty: "moderate",
    time: "10 minutes, three times a week",
    steps: [
      "Hip hikes: stand sideways on a step with one foot hanging off the edge. Let the free hip drop, then lift it level using the standing hip. Ten slow reps each side.",
      "Side plank: on your elbow, body in one line, hold thirty seconds each side. Rest and repeat.",
      "Single-leg balance: stand on one foot for thirty seconds a side, hips level, without holding on.",
      "Do this three times a week for four to six weeks, then re-film from behind and compare your pelvic drop.",
    ],
    tips: [
      "Slow reps beat many reps. The muscle you are after works quietly.",
      "Expect nothing for two weeks and steady change after four. Strength keeps its own calendar.",
    ],
    coachNote:
      "A strong visible dip on one side only, or one with pain around the hip or knee, deserves a physiotherapist assessment before a strength plan. This drill is for nudging, not rehab.",
    glossaryIds: ["pelvic-drop"],
  },
];

export function getRunDrill(id: RunDrillId): RunDrill {
  const found = RUN_DRILLS.find((d) => d.id === id);
  if (!found) throw new Error(`Unknown running drill: ${id}`);
  return found;
}
