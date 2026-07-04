/*
 * The single source for technical-term definitions (adjustment guide
 * architecture rules, CLAUDE.md). Every jargon word the app defines lives
 * here and renders through GlossaryTerm; no component carries its own
 * ad-hoc definition. Plain language, one or two sentences, no numbers that
 * could read as specs (torque values especially: the app never states one).
 */

export type GlossaryId =
  | "setback"
  | "bar-drop"
  | "reach"
  | "seatpost"
  | "seatpost-clamp"
  | "saddle-rails"
  | "bottom-bracket"
  | "stem"
  | "steerer-tube"
  | "spacers"
  | "faceplate"
  | "quill-stem"
  | "threadless"
  | "headset"
  | "hoods"
  | "cleat"
  | "float"
  | "torque"
  | "torque-wrench"
  | "carbon-assembly-paste"
  | "minimum-insertion";

export type GlossaryEntry = {
  /** The word as it should read in a sentence. */
  term: string;
  definition: string;
};

export const GLOSSARY: Record<GlossaryId, GlossaryEntry> = {
  setback: {
    term: "setback",
    definition:
      "How far your saddle sits behind the pedals. Sliding the saddle forward or back on its rails changes it.",
  },
  "bar-drop": {
    term: "bar drop",
    definition:
      "How far the handlebars sit below the top of the saddle. More drop is more aerodynamic; less drop is easier on your back, neck, and hands.",
  },
  reach: {
    term: "reach",
    definition:
      "How far you stretch from the saddle to the handlebars. It is set by the frame, the stem length, and where the bars and hoods sit.",
  },
  seatpost: {
    term: "seatpost",
    definition:
      "The tube your saddle sits on. It slides up and down inside the frame to set saddle height.",
  },
  "seatpost-clamp": {
    term: "seatpost clamp",
    definition:
      "The ring where the seatpost enters the frame. A small bolt or quick-release lever squeezes it to hold the post in place.",
  },
  "saddle-rails": {
    term: "saddle rails",
    definition:
      "The two thin bars under your saddle. The seatpost head clamps onto them, and sliding the saddle along them changes setback.",
  },
  "bottom-bracket": {
    term: "bottom bracket",
    definition:
      "The bearing at the center of the frame that the cranks spin on. Fit measurements often start from its center.",
  },
  stem: {
    term: "stem",
    definition:
      "The short arm that connects the fork's steerer tube to the handlebars. Stems come in different lengths and angles, which is how reach and bar height change.",
  },
  "steerer-tube": {
    term: "steerer tube",
    definition:
      "The tube at the top of the fork that passes up through the frame. The stem clamps around it.",
  },
  spacers: {
    term: "spacers",
    definition:
      "The rings stacked on the steerer tube above and below the stem. Moving spacers below the stem raises the bars; moving them above lowers the bars.",
  },
  faceplate: {
    term: "faceplate",
    definition:
      "The removable front plate of the stem, held by four (sometimes two) bolts, that clamps the handlebar.",
  },
  "quill-stem": {
    term: "quill stem",
    definition:
      "An older stem style that slides down inside the fork and locks with a single bolt on top. Common on classic and city bikes; raising the bars is one bolt away.",
  },
  threadless: {
    term: "threadless",
    definition:
      "The modern stem style: the stem clamps around the outside of the steerer tube, with a top cap bolt that sets the headset bearing before the stem bolts lock everything down.",
  },
  headset: {
    term: "headset",
    definition:
      "The pair of bearings that lets the fork and handlebars turn in the frame. Set right, the bars turn freely with no knocking or play.",
  },
  hoods: {
    term: "hoods",
    definition:
      "The rubber-covered brake lever bodies on drop handlebars, where your hands rest most of the time. They can slide up or down the bar curve.",
  },
  cleat: {
    term: "cleat",
    definition:
      "The plate bolted to the bottom of a cycling shoe that clicks into a clipless pedal. Its position on the shoe sets where the pedal pushes on your foot.",
  },
  float: {
    term: "float",
    definition:
      "The few degrees your foot can pivot while clipped in, before the cleat releases. Float lets your knee find its own path.",
  },
  torque: {
    term: "torque",
    definition:
      "How tightly a bolt is turned, measured in newton metres (Nm). Bike parts state the torque they need, often printed right next to the bolt.",
  },
  "torque-wrench": {
    term: "torque wrench",
    definition:
      "A wrench that clicks or beeps when you reach a set tightness, so a bolt ends up exactly as tight as the part asks for. Essential for carbon parts.",
  },
  "carbon-assembly-paste": {
    term: "carbon assembly paste",
    definition:
      "A slightly gritty paste that adds grip between carbon parts, so clamps hold at lower tightness. Used where carbon meets a clamp; regular grease is the wrong thing there.",
  },
  "minimum-insertion": {
    term: "minimum insertion mark",
    definition:
      "The line etched near the bottom of a seatpost or quill stem. At least that much must stay inside the frame; riding with the mark showing risks breaking the post or frame.",
  },
};

export function glossaryEntry(id: GlossaryId): GlossaryEntry {
  return GLOSSARY[id];
}
