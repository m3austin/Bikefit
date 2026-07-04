/*
 * SwimFit drill catalog. Voice per docs/sportfit/04: plain-precise steps,
 * warmth in the framing, and honesty about beta limits. The water carries
 * its own safety weight, so the coachNote lines take open water and fatigue
 * seriously without the load-bearing gravity of LiftFit.
 */

import type { SportDrill } from "@/lib/sports/types";

export type SwimDrillId = "head-position" | "high-elbow" | "roll" | "catch-up";

export type SwimDrill = SportDrill<SwimDrillId>;

export const SWIM_DRILLS: readonly SwimDrill[] = [
  {
    id: "head-position",
    title: "Look down (head position)",
    why: "The head is heavy, and where it goes the hips follow. Looking forward lifts the head and sinks the legs, dragging a bag of water behind you. A neutral, down gaze lets the whole body ride higher.",
    gear: ["A pool", "Optionally a snorkel, to remove breathing from the puzzle"],
    difficulty: "easy",
    time: "A few lengths within an easy swim",
    steps: [
      "Swim easy and aim your eyes at the bottom of the pool, roughly straight down, not ahead.",
      "Feel your hips and legs rise as the head settles. That lift is the whole point.",
      "To breathe, turn your head to the side with the roll rather than lifting it forward.",
      "A front snorkel lets you hold the head still for a few lengths and feel neutral before adding breathing back.",
      "Re-film side on and compare your head-position reading.",
    ],
    tips: [
      "A small waterline just breaking the top of your head usually means you are about right.",
      "Breathing is where head position falls apart. Practice the gaze first, then guard it through the breath.",
    ],
    coachNote:
      "If neck stiffness makes a neutral head painful, ease off and ask a coach; forcing the position is not the goal. In open water, sighting forward is a safety need, so this is a pool-technique cue.",
    glossaryIds: [],
  },
  {
    id: "high-elbow",
    title: "High elbow (recovery and catch)",
    why: "A high elbow over the water sets the arm up to reach forward and catch water early, with the forearm facing back. A dropped, swinging arm arrives late and slips.",
    gear: ["A pool", "Optionally fins, to hold speed while you think about arms"],
    difficulty: "moderate",
    time: "10 minutes within a swim",
    steps: [
      "Recover with the elbow leading and high, hand relaxed and dragging close to the surface (fingertip-drag is a classic cue).",
      "Reach forward and enter fingertips first, then set the forearm and press water back toward your feet.",
      "Feel the difference between pressing water back and pushing it down; you want back.",
      "Fins keep you moving so you can spend attention on the arm shape.",
      "Re-film side on and compare your recovery-elbow reading.",
    ],
    tips: [
      "Slow and exaggerated first. The shape has to become familiar before it becomes fast.",
      "Shoulder niggle on the high recovery usually means reaching across your centreline. Keep the entry in front of the same shoulder.",
    ],
    coachNote:
      "Shoulder pain in freestyle is common and worth taking seriously. If it persists, see a coach for stroke mechanics or a physiotherapist for the shoulder.",
    glossaryIds: [],
  },
  {
    id: "roll",
    title: "Roll hip to hip",
    why: "Front crawl is swum on the sides, not flat on the belly. A gentle roll lets you reach further, breathe without lifting the head, and use the bigger muscles of the back. This is the app's weakest reading, so trust the feel most.",
    gear: ["A pool"],
    difficulty: "moderate",
    time: "10 minutes",
    steps: [
      "Swim easy and feel your body turn toward each hand as it reaches forward, like rolling from one side to the other.",
      "Let the hips lead the roll, not just the shoulders; the whole line turns together.",
      "Keep the head steady and looking down while the body rolls underneath it.",
      "Aim for a smooth, moderate roll, not a dramatic one; over-rotating causes as many problems as staying flat.",
      "Re-film side on, though remember this reading is a rough proxy from one angle.",
    ],
    tips: [
      "Breathing is just a bit more roll to one side. If you have to lift or crank the neck, you rolled too little.",
      "Six-kick switch drills (roll, kick on your side, switch) build this feel well if a coach shows you the form.",
    ],
    coachNote:
      "Roll is easy to overdo. If a coach is available, one look will tell you more than the proxy number here can.",
    glossaryIds: [],
  },
  {
    id: "catch-up",
    title: "Lengthen the stroke (catch-up)",
    why: "A rushed stroke spins the arms without holding much water. Touching the hands out front before the next pull forces a longer, more patient front end, so each stroke carries more.",
    gear: ["A pool", "Optionally a kickboard or short stick to pass hand to hand"],
    difficulty: "easy",
    time: "A few lengths",
    steps: [
      "Swim freestyle but wait until one hand reaches and nearly touches the other out front before the front hand starts to pull.",
      "Feel the glide and the stretch at the front. That patience is the lesson.",
      "Passing a stick or board hand to hand out front exaggerates the timing if you want it clearer.",
      "Blend it back toward normal timing, keeping a touch of the patience you found.",
      "Re-film and compare your stroke rate; slower is the goal here, within reason.",
    ],
    tips: [
      "Longer is not the same as lazy. Hold the water you catch; just start the catch later.",
      "If lengthening makes you sink or stall, add a steadier kick before shortening the stroke again.",
    ],
    coachNote:
      "Stroke rate is personal and pace-dependent; sprinters turn the arms over faster on purpose. Treat this as a distance-swimming nudge, and let a coach set your race tempo.",
    glossaryIds: [],
  },
];

export function getSwimDrill(id: SwimDrillId): SwimDrill {
  const found = SWIM_DRILLS.find((d) => d.id === id);
  if (!found) throw new Error(`Unknown swimming drill: ${id}`);
  return found;
}
