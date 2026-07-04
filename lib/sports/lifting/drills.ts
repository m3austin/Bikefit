/*
 * LiftFit drill catalog. Voice per docs/sportfit/04 with the safety posture
 * from 00-Vision section 7: this sport gets the app's most serious register.
 * The coachNote lines are firm and repeated on purpose: lifting has the
 * highest injury stakes in the app (spinal flexion under load), and the app
 * is not a spotter and not a coach.
 */

import type { SportDrill } from "@/lib/sports/types";

export type LiftDrillId =
  | "brace-and-hinge"
  | "setup-height"
  | "box-depth"
  | "heels-down"
  | "knees-out"
  | "bench-groove"
  | "lockout-finish";

export type LiftDrill = SportDrill<LiftDrillId>;

export const LIFT_DRILLS: readonly LiftDrill[] = [
  {
    id: "brace-and-hinge",
    title: "Brace first, hinge second (deadlift back)",
    why: "A back that rounds under load is the single reading in this app worth taking most seriously. The fix is almost never thinking about the back itself: it is bracing hard before the pull and lowering the weight until the brace holds.",
    gear: [
      "A light bar or a broomstick",
      "Much less weight than you think you need",
    ],
    difficulty: "moderate",
    time: "10 minutes at the START of a session, fresh",
    steps: [
      "Drop the weight to something you could lift for ten easy reps. Rounding under a heavy bar is not fixed with a heavy bar.",
      "At the bar, take a big breath into your belt line and brace like someone is about to poke your stomach. Set your back BEFORE your hands leave your knees.",
      "Pull one rep. The brace and the flat back come with you the whole way up and the whole way down.",
      "Rest, reset completely, repeat for five singles. Every rep starts from a full stop and a fresh brace.",
      "Add weight over WEEKS, only while the reading stays flat. The bar will wait.",
    ],
    tips: [
      "Film every heavier set. The camera catches what fatigue hides from you.",
      "A rounded LAST rep means the set went one rep too long, and that is useful information.",
    ],
    coachNote:
      "If your back rounds even at light weight, or anything in your back hurts during or after pulling, STOP. Book a session with a qualified strength coach or a physiotherapist before deadlifting again. This is the one finding not to self-coach.",
    glossaryIds: ["brace", "hip-hinge", "lockout"],
  },
  {
    id: "setup-height",
    title: "Find your setup height (deadlift start)",
    why: "Hips too high turn a deadlift into a stiff-leg pull; hips too low turn it into a bad squat and drag the bar forward. Your setup height is yours: it is wherever your shins touch the bar with your back flat and armpits over it.",
    gear: ["A bar at shin height", "Your phone, filming side on"],
    difficulty: "easy",
    time: "5 minutes before pulling",
    steps: [
      "Stand with the bar over your midfoot, shins a hand-width from the bar.",
      "Hinge and grip the bar without moving it. Now bend your knees until your shins just touch it. Wherever your hips are now is your height.",
      "Feel the position for three seconds, stand up without the bar, and repeat three times.",
      "Pull your first light set from exactly that position and check the setup reading.",
    ],
    tips: [
      "Longer legs sit higher. Comparing your setup to someone else's photo is a trap.",
      "If the bar drifts away from you off the floor, your hips likely shot up first.",
    ],
    coachNote:
      "A setup you cannot reach without your back rounding is a mobility flag. A strength coach or physiotherapist can find the restriction; forcing the position under load cannot.",
    glossaryIds: ["hip-hinge", "midfoot"],
  },
  {
    id: "box-depth",
    title: "Own your depth (box squat)",
    why: "Depth you cannot control is depth you do not own. A box teaches your body where your bottom is, keeps every rep the same, and removes the guesswork while you build the pattern.",
    gear: [
      "A box or bench at a height where your hip crease sits just below your knee",
      "A light bar or no bar at all",
    ],
    difficulty: "easy",
    time: "10 minutes",
    steps: [
      "Set the box behind you and squat down UNDER CONTROL until you touch it softly. Touch, do not sit.",
      "Pause a full second on the touch, everything staying tight, then stand.",
      "Ten controlled reps. The touch should be so soft someone could not hear it.",
      "Re-film without the box and compare your depth reading. The box taught your legs the address.",
    ],
    tips: [
      "Soft touch, not a plop. Plopping under load is how boxes earn a bad name.",
      "If you cannot reach the box with heels down, raise the box. Range grows with practice.",
    ],
    coachNote:
      "Knee or hip pain at depth is not something to push through. See a physiotherapist; depth is negotiable, joints are not.",
    glossaryIds: ["hip-hinge", "midfoot"],
  },
  {
    id: "heels-down",
    title: "Heels stay down (squat stance)",
    why: "Heels lifting at the bottom of a squat means the weight rolled onto your toes, and balance goes with it. Usually it is a stance or mobility issue, and both respond to simple work.",
    gear: ["Nothing, or small plates to test under your heels"],
    difficulty: "easy",
    time: "5 to 10 minutes",
    steps: [
      "Bodyweight squats, bare feet or flat shoes: spread your toes, grip the floor, and squat while keeping big toe and heel pressed down.",
      "If heels still rise, widen your stance a touch and let your toes point out a little more. Retest.",
      "Still rising? Put small plates under your heels and note how different it feels. That difference is your ankle mobility gap.",
      "Ten good reps, then re-film with the bar light and compare the heel reading.",
    ],
    tips: [
      "Weightlifting shoes exist because ankle mobility is common homework. They are a legitimate tool, not a cheat.",
      "Ankle mobility work (calf stretches, deep-squat holds) closes the gap slowly and surely.",
    ],
    coachNote:
      "If heels-down is impossible at any stance width, or the ankle pinches, a physiotherapist can tell restriction from structure. Do not load a position you cannot hold empty.",
    glossaryIds: ["midfoot"],
  },
  {
    id: "knees-out",
    title: "Knees out (squat tracking)",
    why: "Knees that cave inward at the bottom load the joint sideways and bleed power. Tracking them out over your toes lines the joint up and lets the big hip muscles do the work. This shows up best from the front, which is why the front view flags it.",
    gear: ["A resistance band around the knees is ideal, but optional", "A light bar or bodyweight"],
    difficulty: "moderate",
    time: "10 minutes",
    steps: [
      "Set your stance so your toes point out slightly, the same direction your knees will travel.",
      "With a band around your knees (or just the cue), squat while actively pressing your knees out against the band so they stay over your toes.",
      "Feel your backside and outer hips switch on; that is what holds the knees out under load.",
      "Ten slow bodyweight or light-bar reps keeping the knees tracking, then re-film from the front.",
      "Compare your knee-tracking and symmetry readings with the last analysis.",
    ],
    tips: [
      "Cue the knees out only as far as over your toes, not wider; forcing them past that is its own problem.",
      "If only one knee caves, add single-leg work (split squats, step-ups) for the weaker side.",
    ],
    coachNote:
      "A knee that caves with pain, or one that always caves far more than the other, is worth a physiotherapist's eyes before loading it heavier.",
    glossaryIds: [],
  },
  {
    id: "bench-groove",
    title: "Find your groove (bench path)",
    why: "A consistent bench press touches the same spot on your chest every rep with the wrist stacked over the elbow. Consistency is the skill; the weight only gets to go up after the groove stops wandering.",
    gear: ["A bar you can press for ten easy reps", "A spotter or safety pins"],
    difficulty: "moderate",
    time: "10 minutes",
    steps: [
      "Set up with your eyes under the bar, feet planted, shoulder blades pinched back and down.",
      "Lower the bar UNDER CONTROL to the same spot on your chest, around the bottom of your sternum, wrist stacked over your elbow.",
      "Press and let the bar drift naturally back over your shoulders. The path is a shallow lean, not a vertical line.",
      "Ten reps watching only the touch point. Same spot, every rep.",
      "Re-film and compare the touch-spread and wrist readings.",
    ],
    tips: [
      "Grip width sets the stack. If your wrist cannot sit over your elbow at the chest, move your hands, not your wrists.",
      "Lighter and identical beats heavier and scattered, every session.",
    ],
    coachNote:
      "NEVER bench heavy alone without safety pins or a spotter. That is not a form point, it is the difference between a failed rep and an emergency.",
    glossaryIds: ["touch-point", "lockout"],
  },
  {
    id: "lockout-finish",
    title: "Finish the rep (lockout)",
    why: "A rep is finished standing tall, hips fully open, not leaning back and not cut short. Incomplete lockouts usually mean the weight is ahead of the strength; leaning back means the hips quit early.",
    gear: ["A light bar"],
    difficulty: "easy",
    time: "5 minutes",
    steps: [
      "With a light bar, pull or squat to the top and STAND: squeeze your backside, open your hips, ribs down, tall through the crown.",
      "Hold the finished position for two seconds. That hold is the drill.",
      "Five reps, each with the deliberate two-second finish.",
      "Re-film a normal set and compare the lockout reading.",
    ],
    tips: [
      "Lockout is hips forward, not shoulders back. Leaning back is a different mistake wearing a finishing costume.",
      "If lockout consistently fails at a given weight, that weight is your answer, not your enemy.",
    ],
    coachNote:
      "Pain at lockout, especially in the lower back, is a stop sign. Ease the weight down and see a physiotherapist if it repeats.",
    glossaryIds: ["lockout"],
  },
];

export function getLiftDrill(id: LiftDrillId): LiftDrill {
  const found = LIFT_DRILLS.find((d) => d.id === id);
  if (!found) throw new Error(`Unknown lifting drill: ${id}`);
  return found;
}
