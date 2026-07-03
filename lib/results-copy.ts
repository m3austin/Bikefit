/*
 * Results copy (PRD §6 copy notes, written to the §8 voice and §12 rules):
 * warm, precise, second person, jargon translated on first use. No em dashes,
 * no exclamation marks in instructions, and none of the banned words
 * (prescription, diagnosis, guaranteed, perfect, professional-grade). Numbers
 * come from lib/format so screen and print read identically.
 */

import type { FitInput, FitResult } from "@/lib/engine";
import { formatMeasurementText } from "@/lib/format";
import type { Unit } from "@/lib/units";

/** Required disclaimer, verbatim (PRD §12). Shown on screen and print. */
export const DISCLAIMER =
  "BikeFit gives you an educated starting point based on published fitting methods. It is not medical advice or a substitute for a professional bike fit. Adjust gradually, and if you feel pain, stop and consult a professional.";

export type CardCopy = {
  applySteps: string[];
  troubleshooting: string;
  method?: string;
};

export type ResultsCopy = {
  saddleHeight: CardCopy;
  setback: CardCopy;
  barDrop?: CardCopy;
  barWidth: CardCopy;
  reach: CardCopy;
  crank: CardCopy;
  cleat?: CardCopy;
  frame: CardCopy;
  /** Three concise instructions for the printed sheet (UX-UI-Design §7). */
  keyInstructions: string[];
};

const FLEX_WORD: Record<FitInput["flexibility"], string> = {
  low: "lower",
  medium: "average",
  high: "higher",
};

export function buildResultsCopy({
  result,
  input,
  unit,
}: {
  result: FitResult;
  input: FitInput;
  unit: Unit;
}): ResultsCopy {
  const m = input.measurements;
  const t = (mm: number) => formatMeasurementText(mm, unit);

  const saddleStart = t(result.saddleHeight.start);
  const inseam = t(m.inseamMm);
  const crank = `${result.crankLengthMm} mm`;

  const saddleHeight: CardCopy = {
    applySteps: [
      "Measure from the center of the bottom bracket up along the seat tube to the top of the saddle.",
      `Loosen the seatpost clamp, set that distance to ${saddleStart}, then tighten to the torque marked on the clamp.`,
      "Ride a short loop and adjust a few millimetres at a time until it feels smooth.",
    ],
    troubleshooting:
      "Rocking hips or toes reaching for the pedals usually mean the saddle is too high, so lower it about 3 mm at a time. A cramped feeling at the top of the stroke can mean it is too low. Thick-soled shoes or flat pedals sit you a little lower, so drop about 3 mm for those. A new saddle or a fresh chamois changes the height, so re-check after either. As a cross-check, rest your heel on the pedal at the bottom of the stroke: your leg should be straight with a level hip.",
    method: `The recommended start is the mean of two methods: LeMond (0.883 times inseam) and Hamley (1.09 times inseam minus crank length), rounded to the nearest millimetre. Bike-type and priority adjustments are then applied. Your inseam is ${inseam} and your crank length is ${crank}. LeMond gives ${t(result.saddleHeight.methods.lemond)} and Hamley gives ${t(result.saddleHeight.methods.hamley)}.`,
  };

  const setback: CardCopy = {
    applySteps: [
      "Start with your saddle rails centered in the clamp.",
      "Sit normally and turn the cranks level, at three and nine o'clock.",
      "Drop a weight from the front of your forward kneecap: it should fall roughly over the pedal axle. Slide the saddle forward or back to get close.",
    ],
    troubleshooting:
      "Knee over pedal is a convention, not a law of physics, so treat it as a starting point. Pain at the front of the knee often eases by moving the saddle back a few millimetres, and pain at the back by moving it forward. Adjustments of about 10 mm either way are normal.",
    method: `The estimate is 0.245 times inseam minus 100 mm, shown as a band of about 10 mm either side. Your inseam is ${inseam}.`,
  };

  const reach: CardCopy = {
    applySteps: [
      "Ride in your normal position with your hands on the hoods or grips.",
      "Check that your elbows keep a slight bend, around 15 to 20 degrees, and your arms are never locked straight.",
      "If you need a bigger change than a saddle tweak can give, a shorter or longer stem is the usual fix.",
    ],
    troubleshooting:
      "Reach is the least formula-friendly number here, so trust how your body feels over the millimetres. A locked-out, stretched feeling means too much reach, and a cramped, upright feeling means too little. Stem length changes this the most.",
    method: `The estimate is (torso plus arm) divided by two, plus 40 mm, shown as a band of about 15 mm either side and shifted by your riding priority. Your torso is ${t(m.torsoMm)} and your arm is ${t(m.armMm)}.`,
  };

  const barDrop: CardCopy | undefined = result.barDrop
    ? {
        applySteps: [
          "Measure the height difference between the top of your saddle and the top of your handlebars.",
          `Add or remove headset spacers, or flip the stem, to move the bars toward ${t(result.barDrop.start)} below the saddle.`,
          "Change one spacer at a time and ride before adjusting again.",
        ],
        troubleshooting:
          "Numb hands, a sore neck, or a stretched lower back usually mean the bars are too low, so raise them. If you feel cramped and too upright, lower them a little. Your flexibility can change over a season, so revisit this.",
        method: `The band comes from your flexibility, which you rated as ${FLEX_WORD[input.flexibility]}. Your riding priority positions the start within the band, with more performance meaning more drop.`,
      }
    : undefined;

  const isDropBar = input.bikeType === "road" || input.bikeType === "gravel";
  const barWidth: CardCopy = isDropBar
    ? {
        applySteps: [
          `Handlebar width is measured center to center. About ${result.barWidthMm ?? 0} mm matches your shoulders.`,
          "Bars come in 20 mm steps, so pick the closest size.",
        ],
        troubleshooting:
          "Wider bars open the chest and calm the steering. Narrower bars can feel quicker. A centimetre either way is mostly a matter of taste.",
        method: `Your shoulder width, ${t(m.shoulderMm)}, rounded to the nearest 20 mm.`,
      }
    : {
        applySteps: [
          "Modern mountain and hybrid bars run about 740 to 780 mm.",
          "Start wide, then trim a little at a time until the width feels right.",
        ],
        troubleshooting:
          "Cutting a bar is permanent, so go slowly. Wider feels stable and controlled off-road, narrower is easier in tight spaces.",
      };

  const crankCopy: CardCopy = {
    applySteps: [
      `Crank length is stamped on the back of the crank arm. Yours is close to ${crank}.`,
      "If you are buying, this is a sensible length to choose.",
    ],
    troubleshooting:
      "The industry trend is toward shorter cranks. Going one step shorter than this is never a wrong choice for comfort, and it can open up your hip angle and let you drop the saddle slightly.",
    method: `Chosen from a table by inseam: under 750 mm uses 165, 750 to 809 uses 170, 810 to 859 uses 172.5, and 860 and up uses 175. Your inseam is ${inseam}.`,
  };

  const cleat: CardCopy | undefined = result.cleat
    ? {
        applySteps: [
          "Find the ball of your foot, the wide part just behind the big-toe joint.",
          "Set the cleat so the pedal axle sits under that point when you are clipped in.",
          "Keep your feet pointing naturally straight, and set the release tension low while you learn to clip out.",
        ],
        troubleshooting:
          "Moving the cleat toward the midfoot, a little further back, takes load off the calf and can feel better on long rides. Hot spots or numb toes often mean the cleat is too far forward or the shoe is too tight.",
      }
    : undefined;

  const frameValue = result.frameSize.roadCm
    ? `${result.frameSize.roadCm} cm`
    : `${result.frameSize.mtbInches} in`;
  const frame: CardCopy = {
    applySteps: [
      `This is a starting size for a bike you do not own yet, so it is separate from the adjustments above. Your figure is ${frameValue}.`,
      "For road and gravel it is the seat-tube length, center to center. For mountain bikes it is a rough frame size in inches.",
      "Compare the stack and reach on the maker's size chart too, since modern frames vary.",
    ],
    troubleshooting:
      "Between two sizes, the smaller frame is usually easier to make comfortable. If you already own the bike, use the cards above instead.",
    method: `Road and gravel use 0.665 times inseam in centimetres. Mountain uses 0.225 times inseam in inches. Your inseam is ${inseam}.`,
  };

  return {
    saddleHeight,
    setback,
    barDrop,
    barWidth,
    reach,
    crank: crankCopy,
    cleat,
    frame,
    keyInstructions: [
      `Set your saddle height to ${saddleStart}, measured from the bottom bracket along the seat tube.`,
      "With the cranks level, your forward kneecap should sit roughly over the pedal axle.",
      "On the hoods or grips, keep a slight bend in your elbows and never lock your arms.",
    ],
  };
}
