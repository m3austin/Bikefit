/*
 * GolfFit drill catalog: the swing analogue of cycling's adjustment guide.
 * Typed, testable content in the proven format (what and why, difficulty,
 * time, gear before the steps, pro tips, "when to see a coach"). Voice per
 * docs/sportfit/04: plain-precise in the steps, warmth in the framing, no
 * invented numbers presented as fact.
 */

import type { GlossaryId } from "@/lib/glossary";

export type GolfDrillId =
  | "posture"
  | "head-still"
  | "tempo"
  | "turn"
  | "bump"
  | "structure";

export type Difficulty = "easy" | "moderate";

export type GolfDrill = {
  id: GolfDrillId;
  title: string;
  /** Plain language: what this fixes and why it matters. */
  why: string;
  gear: string[];
  difficulty: Difficulty;
  time: string;
  steps: string[];
  tips: string[];
  /** When self-coaching should hand over to a human. */
  coachNote: string;
  glossaryIds: GlossaryId[];
};

export const GOLF_DRILLS: readonly GolfDrill[] = [
  {
    id: "posture",
    title: "Hold your posture (chair drill)",
    why: "Standing up out of your tilt mid-swing is the most common contact killer. This drill teaches your body what keeping the angle feels like, without thinking about the ball at all.",
    gear: ["A chair, stool, or golf bag", "A mirror or your phone camera"],
    difficulty: "easy",
    time: "5 minutes, a few times a week",
    steps: [
      "Set up at address with your backside just touching a chair back or your golf bag.",
      "Make slow, half-speed practice swings keeping light contact with the chair from address to impact.",
      "If you lose contact, you stood up. Reset and go again, slower.",
      "Build to three sets of five slow swings, then try a few at normal speed.",
      "Re-film a swing and compare your spine angle change with the last analysis.",
    ],
    tips: [
      "Slow beats fast here. Speed hides the stand-up; slow motion exposes it.",
      "Film from down the line so the change is easy to see with your own eyes.",
    ],
    coachNote:
      "If holding posture causes back discomfort, stop and see a coach or a physician. Posture problems sometimes start in mobility, not technique.",
    glossaryIds: ["down-the-line", "address"],
  },
  {
    id: "head-still",
    title: "Quiet head",
    why: "A drifting head drags your low point around, and the low point decides the strike. Quieter is not frozen; it is calm.",
    gear: ["A doorway or a window frame, or a friend with a phone"],
    difficulty: "easy",
    time: "5 minutes",
    steps: [
      "Set up so your head lines up with a fixed vertical edge behind or in front of you (a doorway works).",
      "Make slow swings keeping your head inside a fist's width of that edge through impact.",
      "Add speed only while the head stays quiet.",
      "Re-film face-on and compare head drift with the last analysis.",
    ],
    tips: [
      "Keep your eyes level. Tilting eyes drag the head with them.",
      "A little natural movement is fine; you are taming drift, not freezing.",
    ],
    coachNote:
      "If keeping the head quiet feels physically restrictive rather than just unfamiliar, a coach can check whether the cause is setup or mobility.",
    glossaryIds: ["face-on"],
  },
  {
    id: "tempo",
    title: "Count your tempo",
    why: "Most rushed swings are rushed at the top, not at the ball. A counted rhythm smooths the transition where speed is actually lost.",
    gear: ["Nothing, or a metronome app if you enjoy gadgets"],
    difficulty: "easy",
    time: "10 minutes",
    steps: [
      "Without a ball, swing while counting evenly: one and two on the way back, three at the top, and let the downswing happen on the way to four.",
      "Keep the count identical for ten swings. The goal is the same rhythm every time, not slow motion.",
      "Add a ball only when the count survives contact.",
      "Re-film and check your tempo ratio against the last analysis.",
    ],
    tips: [
      "If the ball makes you rush, go back to no ball. The ball can smell fear.",
      "Swinging smoother often adds distance; rushing rarely does.",
    ],
    coachNote:
      "Tempo that will not settle after a couple of weeks of counting is worth one lesson; a coach will usually find the setup cue in minutes.",
    glossaryIds: ["tempo"],
  },
  {
    id: "turn",
    title: "Fill the turn",
    why: "A fuller shoulder turn gives the downswing room to build speed in order, instead of all at once from the top.",
    gear: ["A club held across your chest", "A mirror"],
    difficulty: "moderate",
    time: "10 minutes",
    steps: [
      "Cross your arms over a club held against your chest and take your address posture.",
      "Turn your chest away from the target until the club points roughly where the camera would stand for a face-on video, keeping your posture tilt.",
      "Feel where that turn ends. That is your top for now; forcing further is not the goal.",
      "Make ten slow rehearsals, then hit half-speed shots feeling the same fullness.",
    ],
    tips: [
      "Turn is earned through balance. If you tip or sway, shrink the turn until it is stable.",
      "The 2D turn number in your analysis is a proxy; trust the feel and the strike as much as the number.",
    ],
    coachNote:
      "Restricted turn is often hips or thoracic mobility, not effort. If the fuller turn will not come, a coach or physio screen beats forcing it.",
    glossaryIds: ["face-on", "x-factor"],
  },
  {
    id: "bump",
    title: "Turn, not sway (bump drill)",
    why: "Sliding the hips toward the target feels powerful and usually is not. A small bump then a turn keeps you behind the ball with power to spend.",
    gear: ["An alignment stick, an old club shaft, or your golf bag"],
    difficulty: "moderate",
    time: "10 minutes",
    steps: [
      "Plant a stick in the ground (or park your bag) just outside your lead hip at address.",
      "Swing to the top, then start down with a small move of the lead hip toward the stick WITHOUT touching it, and turn.",
      "Brushing the stick means you slid. Reset, feel the hip turn behind you instead.",
      "Ten slow reps, then re-film face-on and compare the hip slide number.",
    ],
    tips: [
      "The move is bump then turn, in that order, and the bump is small.",
      "Feel your weight finish on the lead heel, not the lead toe.",
    ],
    coachNote:
      "Chronic swaying sometimes traces to balance or footwear rather than intent. If the stick keeps getting bumped, let a coach watch one session.",
    glossaryIds: ["face-on", "address"],
  },
  {
    id: "structure",
    title: "Wide and calm (structure drill)",
    why: "A collapsing lead arm narrows the swing and forces a rescue on the way down. Width at the top makes the downswing simpler.",
    gear: ["A club", "A headcover you can tuck under your trail arm"],
    difficulty: "moderate",
    time: "10 minutes",
    steps: [
      "Tuck a headcover under your trail armpit and make smooth half swings that keep it in place.",
      "Feel the lead arm long, not locked. Straight enough is the goal, rigid is not.",
      "Grow toward three-quarter swings while the headcover stays put.",
      "Re-film face-on and compare the lead-arm angle at the top.",
    ],
    tips: [
      "Plenty of great golfers play with a soft lead arm. Chase better strikes, not a picture.",
      "If width costs you balance, take less width. Balance wins every argument.",
    ],
    coachNote:
      "If a straighter lead arm causes elbow or shoulder discomfort, stop; that is a conversation for a coach or a physician, not a drill.",
    glossaryIds: ["face-on"],
  },
];

export function getGolfDrill(id: GolfDrillId): GolfDrill {
  const found = GOLF_DRILLS.find((d) => d.id === id);
  if (!found) throw new Error(`Unknown golf drill: ${id}`);
  return found;
}
