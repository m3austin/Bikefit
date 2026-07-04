/*
 * The adjustment guide catalog: typed, testable content that turns fit
 * numbers into confident hex-wrench action (adjustment guide architecture
 * rules, CLAUDE.md). Voice: warm, encouraging, never condescending; the
 * reader has never loosened a seatpost before. No em dashes, no exclamation
 * marks, none of the banned words.
 *
 * TORQUE DISCIPLINE (hard rule): this catalog NEVER states a numeric torque
 * value. Fabricating one is a safety risk, especially on carbon. There is
 * deliberately no torque field in the data model; the copy teaches riders to
 * find the printed spec on the part, in the manual, or on the maker's site,
 * and to use a torque wrench. lib/adjustments.test.ts enforces this.
 */

import type { BikeType } from "@/lib/engine";
import type { GlossaryId } from "@/lib/glossary";

export type AdjustmentId =
  | "saddle-height"
  | "saddle-setback"
  | "saddle-tilt"
  | "reach"
  | "bar-height"
  | "cleats";

export type Difficulty = "easy" | "moderate" | "involved";

export type VariantNote = {
  id: string;
  title: string;
  /** Human summary of which bikes this applies to, shown as a chip. */
  appliesTo: string;
  /** Bike types this variant usually matches (drives highlighting/filtering). */
  bikeTypes?: BikeType[];
  steps: string[];
};

export type Adjustment = {
  id: AdjustmentId;
  title: string;
  /** Plain language: what this changes and why it matters. */
  why: string;
  tools: string[];
  difficulty: Difficulty;
  /** Rough time, e.g. "About 10 minutes". */
  time: string;
  steps: string[];
  /** Life Pro Tips: the recurring, recognizable callout pattern. */
  tips: string[];
  /** Safety callouts. Torque and carbon discipline live here. */
  safety: string[];
  variants: VariantNote[];
  /** When to stop and let a shop do it. */
  shopNote: string;
  /** Jargon used in this section, offered as tappable definitions. */
  glossaryIds: GlossaryId[];
};

const FIND_THE_TORQUE =
  "The torque spec is usually printed right next to the bolt or on the part itself, a number followed by Nm. If it is not there, check the owner's manual or the maker's website. When in doubt, ask a shop rather than guess.";

export const ADJUSTMENTS: readonly Adjustment[] = [
  {
    id: "saddle-height",
    title: "Saddle height",
    why: "Saddle height sets how far your leg extends on every pedal stroke. It is the most powerful comfort change on the bike and one of the easiest to make. Ten minutes here fixes more sore knees than any other adjustment.",
    tools: [
      "Hex key (usually 4 or 5 mm, check your clamp)",
      "Tape measure",
      "Painters tape or a paint pen",
      "Torque wrench (a must for carbon)",
    ],
    difficulty: "easy",
    time: "About 10 minutes",
    steps: [
      "Mark before you move: wrap a small strip of painters tape around the seatpost right where it enters the frame, or tick it with a paint pen. Whatever happens next, you can be back to today's setup in seconds.",
      "Find the seatpost clamp, the ring where the post enters the frame. It has either a small bolt or a quick-release lever.",
      "Loosen the bolt one or two turns counter-clockwise, or flip the lever open. Nothing needs to come off the bike.",
      "Slide the saddle up or down to your target height, measured from the center of the bottom bracket, up along the frame, to the top of the saddle.",
      "Check the saddle nose still points straight ahead along the top tube.",
      "Retighten. On carbon, that means a torque wrench set to the printed spec, not feel.",
      "Ride a short, easy loop. Fine-tune 3 mm at a time, and give each change a real ride before judging it.",
    ],
    tips: [
      "Leave the tape marker on until you are sure about the new height. It is your undo button.",
      "Work over a towel or mat so a dropped bolt stays findable instead of rolling into the driveway drain.",
      "When you find the height you love, write it in a note on your phone. Future you, on a rental or a new bike, will be glad.",
      FIND_THE_TORQUE,
    ],
    safety: [
      "Never raise the post past its minimum insertion mark, the line etched near the bottom of the seatpost. Riding with that line showing can snap the post or crack the frame.",
      "Carbon posts and frames need carbon assembly paste (not grease) and a torque wrench. Too tight crushes the tube; too loose and the saddle slips mid-ride.",
    ],
    variants: [
      {
        id: "clamp-bolt",
        title: "Bolt clamp",
        appliesTo: "Most road and gravel bikes",
        bikeTypes: ["road", "gravel"],
        steps: [
          "Loosen with a hex key, one or two turns is plenty.",
          "Retighten to the printed torque. Snug by feel is not a spec, and carbon in particular needs the stated number.",
        ],
      },
      {
        id: "clamp-qr",
        title: "Quick-release lever",
        appliesTo: "Many hybrids and mountain bikes",
        bikeTypes: ["hybrid", "mtb"],
        steps: [
          "Flip the lever open, adjust, flip it closed.",
          "Closing should take firm palm pressure and leave a brief mark on your hand. If the lever flops shut, tighten the small nut opposite it half a turn and try again.",
        ],
      },
      {
        id: "dropper",
        title: "Dropper post",
        appliesTo: "Mountain bikes with a handlebar height lever",
        bikeTypes: ["mtb"],
        steps: [
          "Set your saddle height with the post at full extension.",
          "Small height changes work like a normal post at the frame clamp. Big changes can run into the internal cable, and that is a fair moment to let a shop take over.",
        ],
      },
    ],
    shopNote:
      "If the post will not budge after loosening the clamp, stop. A seized seatpost is a common and cheap shop fix, and an expensive thing to force at home.",
    glossaryIds: [
      "seatpost",
      "seatpost-clamp",
      "bottom-bracket",
      "minimum-insertion",
      "torque",
      "torque-wrench",
      "carbon-assembly-paste",
    ],
  },
  {
    id: "saddle-setback",
    title: "Saddle setback (fore-aft)",
    why: "Setback is how far your saddle sits behind the pedals. It decides where your weight lands and how your knees line up over the pedals. A centimetre here changes how the whole bike feels.",
    tools: [
      "Hex key (usually 5 or 6 mm, under the saddle)",
      "Painters tape or a paint pen",
      "Torque wrench (a must for carbon rails)",
    ],
    difficulty: "easy",
    time: "About 10 minutes",
    steps: [
      "Mark before you move: put a tape flag or pen tick on the saddle rails right against the clamp edge, so today's position is recorded.",
      "Find the clamp under the saddle that grips the two rails. One or two bolts hold it.",
      "Loosen just enough that the saddle slides with firm hand pressure. It should resist a little, not flop.",
      "Slide the saddle forward or back in small steps, about 5 mm at a time. Most rails have printed markings you can count.",
      "Keep the saddle level and pointing straight ahead, then retighten to the printed torque.",
      "Re-check your saddle height afterward. Sliding the saddle back effectively lengthens the distance to the pedals a touch, so a big setback change often wants a small height touch-up.",
    ],
    tips: [
      "Two-bolt clamps (one bolt in front, one behind) like being loosened and tightened alternately, a little each, so the clamp stays even.",
      "Photograph the rail markings before you start. Zooming in on a photo beats squinting under a saddle.",
      FIND_THE_TORQUE,
    ],
    safety: [
      "Stay inside the limit lines printed on the rails. Clamping outside them can bend or snap rails, and carbon rails give no warning first.",
    ],
    variants: [
      {
        id: "one-bolt",
        title: "One-bolt clamp",
        appliesTo: "Common on stock seatposts",
        steps: [
          "One bolt controls both slide and tilt, so re-check the tilt after any setback change.",
        ],
      },
      {
        id: "two-bolt",
        title: "Two-bolt clamp",
        appliesTo: "Common on nicer seatposts",
        steps: [
          "Loosen both bolts slightly, slide the saddle, then tighten them alternately a little at a time. The two bolts fight each other, which is exactly how tilt stays precise.",
        ],
      },
    ],
    shopNote:
      "Corroded hardware under the saddle, or rails that already look scored or cracked, are a reason to hand this one to a shop.",
    glossaryIds: ["setback", "saddle-rails", "torque", "torque-wrench"],
  },
  {
    id: "saddle-tilt",
    title: "Saddle tilt",
    why: "Tilt is whether the saddle nose points up, down, or level. Two or three degrees decides where pressure lands when you sit, and it is the first thing to check for numbness or constant shifting around.",
    tools: [
      "Hex key (same clamp as setback)",
      "A phone with a free level app, plus a paperback book",
    ],
    difficulty: "easy",
    time: "5 to 10 minutes",
    steps: [
      "Take a straight-on side photo of your saddle before touching anything. It is the fastest way back to exactly where you were.",
      "Park the bike on a flat floor. Lay the book across the length of the saddle and rest your phone's level on it to read the current angle.",
      "Loosen the rail clamp under the saddle slightly, tip the nose up or down a degree or two, and retighten to the printed torque.",
      "Start at level. If you slide forward while riding, bring the nose up a touch. If you feel pressure where you should not, try a degree or two nose-down.",
      "Change one degree at a time and ride between changes. Tilt is powerful in small doses.",
    ],
    tips: [
      "A free level app and a paperback across the saddle top make a good enough measuring rig. Nobody needs lab gear for this.",
      "Note the angle number the level app shows once you are happy, next to your saddle height in that phone note.",
    ],
    safety: [
      "Same clamp as setback, same rules: printed torque, and stay inside the rail limit lines.",
    ],
    variants: [
      {
        id: "two-bolt-tilt",
        title: "Two-bolt clamp",
        appliesTo: "Fine-grained tilt",
        steps: [
          "Loosen one bolt a quarter turn and tighten the other the same amount: the saddle nose tips toward the loosened side. Small trades, then re-torque both.",
        ],
      },
      {
        id: "one-bolt-tilt",
        title: "One-bolt clamp",
        appliesTo: "Some stock posts tilt in notched steps",
        steps: [
          "If the tilt clicks between notches and neither notch feels right, that is the known weakness of this clamp style. A two-bolt seatpost is the usual inexpensive upgrade.",
        ],
      },
    ],
    shopNote:
      "Numbness that stays after trying level and slightly nose-down usually means the saddle shape or width is wrong for you, not the angle. A shop can measure you for that.",
    glossaryIds: ["saddle-rails", "torque"],
  },
  {
    id: "reach",
    title: "Reach (stem and bar position)",
    why: "Reach is how far you stretch to the bars. Right, your elbows stay softly bent and your back stays neutral. Too long and you lock your arms and load your hands; too short and you feel cramped and twitchy.",
    tools: [
      "Hex keys (usually 4 and 5 mm)",
      "Torque wrench (bars and stem are the bolts your life leans on)",
      "Possibly a different stem, which is a purchase, not just a wrench job",
    ],
    difficulty: "involved",
    time: "15 to 30 minutes, more for a stem swap",
    steps: [
      "Take a straight-on side photo of your cockpit before touching anything.",
      "Start with the free changes before buying anything. On drop bars, the hoods can slide up or down the bar curve: peel the rubber hood cover back to find the clamp bolt, move the hood a little, and re-torque. Small hood moves change reach noticeably.",
      "Second free change: bar roll. Loosen the faceplate bolts half a turn, rotate the bar a few degrees, and retighten evenly. Rolling the bar moves where the hoods and drops sit.",
      "If those are not enough, the honest fix is a different stem length. Stems come in 10 mm steps; measure yours center-to-center between the two clamp bolts' centers to know your starting point. This is an inexpensive part, but it is a purchase, so set expectations before you start wrenching.",
      "To swap a stem: loosen the faceplate and free the bar (support it so it does not hang by the cables), then remove the top cap bolt, loosen the stem's pinch bolts, and slide the stem off the steerer tube.",
      "Slide the new stem on, refit the top cap, and set the headset preload first: tighten the top cap gently until the bars turn freely with no knocking when you rock the bike with the front brake held.",
      "Align the stem dead straight with the front wheel, tighten the pinch bolts to the printed torque, then refit the bar and faceplate.",
    ],
    tips: [
      "Tighten faceplate bolts in an X pattern, a little each, until the gap between faceplate and stem is even top and bottom.",
      "Order of operations matters at the front end: top cap first (it sets the bearing), pinch bolts after (they lock it). Reversed, the steering will bind or knock.",
      "Sight down the stem over the front tire to check alignment, then take the bike for a slow-speed test in the driveway before the road.",
      FIND_THE_TORQUE,
    ],
    safety: [
      "Stem and bar bolts are the ones your life leans on. Use the printed torque, use a torque wrench on carbon, and re-check every one of them after the first short ride.",
      "If the bars, stem, or steerer are carbon, the stated torque is not optional. Carbon gives no creaking warning before it fails.",
    ],
    variants: [
      {
        id: "threadless",
        title: "Threadless (modern) stem",
        appliesTo: "Most bikes from the last two decades",
        steps: [
          "The steps above describe this style: top cap sets the headset, pinch bolts lock the stem to the steerer.",
        ],
      },
      {
        id: "quill",
        title: "Quill stem",
        appliesTo: "Classic road bikes and many city bikes",
        bikeTypes: ["hybrid"],
        steps: [
          "One bolt on top of the stem. Loosen it two or three turns, then tap the bolt gently down with a soft mallet to free the internal wedge.",
          "Set the height and alignment, keep the minimum insertion mark hidden inside the frame, and retighten firmly.",
        ],
      },
    ],
    shopNote:
      "Cables routed inside the bars or stem turn a stem swap into a shop job. So does any carbon steerer work you are not completely sure about. A shop will also swap on a stem you bring in for a small fee, which is a fine choice.",
    glossaryIds: [
      "reach",
      "stem",
      "steerer-tube",
      "faceplate",
      "headset",
      "hoods",
      "threadless",
      "quill-stem",
      "minimum-insertion",
      "torque-wrench",
    ],
  },
  {
    id: "bar-height",
    title: "Handlebar height",
    why: "Bar height trades comfort for speed. Higher bars unload your hands, neck, and lower back; lower bars tuck you out of the wind. Most comfort complaints at the front of the bike ease with a small rise.",
    tools: [
      "Hex keys (usually 4 and 5 mm)",
      "Torque wrench",
      "Painters tape or your phone camera",
    ],
    difficulty: "moderate",
    time: "About 15 minutes",
    steps: [
      "Photograph the spacer stack above and below the stem before you start. That photo is your map home.",
      "Remove the top cap bolt on the very top of the stem and set the cap aside.",
      "Loosen the two pinch bolts on the side of the stem and slide the stem off the steerer tube.",
      "Rearrange the spacers: spacers moved from above the stem to below it raise the bars, and the other way around lowers them. The total stack must not change; you are reordering, not adding.",
      "Slide the stem back on, refit the top cap, and set the headset preload: tighten the cap gently until rocking the bike with the front brake held gives no knock, while the bars still turn freely.",
      "Align the stem with the front wheel and tighten the pinch bolts to the printed torque.",
    ],
    tips: [
      "You cannot raise the bars beyond the steerer the fork came with. If the stack is all used up, a riser stem or a flipped stem gives more height; flipping is free.",
      "Most stems are angled. Flipping the stem over swaps that angle from down to up, which raises the bars a worthwhile amount for zero cost.",
      "Re-check the headset after the first ride: hold the front brake, rock the bike, and listen for a knock.",
      FIND_THE_TORQUE,
    ],
    safety: [
      "The stem must clamp fully onto the steerer tube. A thin spacer above the stem is normal; the stem sticking up past the top of the steerer is not safe.",
      "These are also life-leaning bolts: printed torque, torque wrench on carbon, re-check after the first ride.",
    ],
    variants: [
      {
        id: "threadless-height",
        title: "Threadless (modern) stem",
        appliesTo: "Most bikes from the last two decades",
        steps: ["The spacer-shuffle steps above describe this style."],
      },
      {
        id: "quill-height",
        title: "Quill stem",
        appliesTo: "Classic road bikes and many city bikes",
        bikeTypes: ["hybrid"],
        steps: [
          "Height is one bolt: loosen the top bolt a few turns, tap it down to free the wedge, raise or lower the stem, align, and retighten.",
          "Keep the minimum insertion mark hidden inside the frame.",
        ],
      },
    ],
    shopNote:
      "Steering that grinds or catches when you turn, or headset play you cannot remove with the top cap, means a bearing needs attention. That is a shop visit, and usually a cheap one.",
    glossaryIds: [
      "spacers",
      "stem",
      "steerer-tube",
      "headset",
      "threadless",
      "quill-stem",
      "minimum-insertion",
      "torque-wrench",
    ],
  },
  {
    id: "cleats",
    title: "Cleat position",
    why: "Cleats decide where the pedal pushes on your foot and which way your knee tracks. Millimetres here fix hot spots, numb toes, and knee niggles. If you ride flat pedals, skip this section entirely.",
    tools: [
      "Hex key (usually 4 mm) or a screwdriver, depending on the cleat",
      "A pen or chalk",
      "Painters tape",
    ],
    difficulty: "moderate",
    time: "About 15 minutes per shoe",
    steps: [
      "Trace before you move: draw around each cleat with a pen before loosening anything. That outline is both your undo button and your template for matching the other shoe.",
      "Find the ball of your foot, the bump behind your big toe, with the shoe on. Mark its position on the side of the sole with a small piece of tape.",
      "Fore-aft: position the cleat so the pedal axle will sit at that mark, or a few millimetres behind it. Slightly behind is the endurance-friendly direction.",
      "Rotation: sit on a table and let your feet dangle. The angle your feet naturally hang at is the angle your cleats should allow. Set the cleat so your heel rests where it wants to.",
      "Side to side: moving the cleat inboard pushes your foot outboard, and the reverse. Move 1 to 2 mm at a time, no more.",
      "Snug the bolts, check the cleat has not skated off your outline, then tighten to the spec printed by the cleat maker.",
      "Clip in and out several times while leaning against a wall before you go near traffic.",
    ],
    tips: [
      "Chalk or grease-pencil marks on the sole survive a few rides, which is exactly how long dialing in cleats takes.",
      "Do one shoe completely, ride, then match the other to its outline. Feet are not identical, and that is normal.",
      "Cleats are consumables. When the wear marks or the colored tips say they are done, replace them; worn cleats release when they feel like it.",
      "Cleat bolts have a torque spec too, printed on the packaging or the maker's site. Shoe soles (especially carbon ones) do not appreciate guesswork.",
    ],
    safety: [
      "After any cleat change, practice clipping out on both sides before riding. The release must feel automatic before traffic is involved.",
      "Loose cleat bolts creak first and leave you stuck clipped-in second. Re-check them after the first ride.",
    ],
    variants: [
      {
        id: "two-bolt",
        title: "2-bolt (SPD style)",
        appliesTo: "Mountain, gravel, and commuting shoes",
        bikeTypes: ["mtb", "gravel", "hybrid"],
        steps: [
          "The cleat is small and recessed, so the shoes walk normally.",
          "It moves in a slotted plate, fore-aft and side to side. Rotation is mostly built into the pedal's float rather than the cleat angle.",
        ],
      },
      {
        id: "three-bolt",
        title: "3-bolt (road style)",
        appliesTo: "Road shoes with a large plastic cleat",
        bikeTypes: ["road"],
        steps: [
          "The big triangular cleat adjusts in all three directions: fore-aft, side to side, and rotation.",
          "Most brands print an alignment grid on the cleat, and the colored tip tells you the float amount. Use the outline you drew as your reference for small moves.",
        ],
      },
    ],
    shopNote:
      "Knee pain that a couple of small cleat moves does not settle within a few rides deserves an in-person look rather than more experimenting.",
    glossaryIds: ["cleat", "float", "torque"],
  },
];

export function getAdjustment(id: AdjustmentId): Adjustment {
  const found = ADJUSTMENTS.find((a) => a.id === id);
  if (!found) throw new Error(`Unknown adjustment: ${id}`);
  return found;
}

/** The jobs that belong at a shop, shown as a page-level section. */
export const SHOP_JOBS: readonly string[] = [
  "Anything with cables or hoses routed inside the frame, bars, or stem",
  "Hydraulic brakes that need the levers moved far or the hoses shortened (they need bleeding)",
  "Press-fit bottom brackets, or any bearing that needs pressing or facing",
  "Seized or corroded parts that will not move after normal loosening",
  "Any crack, or suspected crack, in a carbon part: stop riding it and have it inspected",
];
