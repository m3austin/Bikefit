import { FormCue, type FormFigure } from "@/components/kernel/form-cue";

// Dev-only: review the "what good looks like" drill figures. Not linked.
const FIGURES: Array<{ title: string; figure: FormFigure }> = [
  {
    title: "lift: brace-and-hinge",
    figure: {
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
  },
  {
    title: "lift: setup-height",
    figure: {
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
  },
  {
    title: "lift: box-depth",
    figure: {
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
  },
  {
    title: "lift: heels-down",
    figure: {
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
  },
  {
    title: "lift: lockout-finish",
    figure: {
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
  },
  {
    title: "golf: posture",
    figure: {
      pose: {
        head: { x: 0.63, y: 0.22 },
        shoulder: { x: 0.58, y: 0.3 },
        elbow: { x: 0.57, y: 0.46 },
        wrist: { x: 0.55, y: 0.6 },
        hip: { x: 0.46, y: 0.5 },
        knee: { x: 0.5, y: 0.72 },
        ankle: { x: 0.5, y: 0.92 },
        heel: { x: 0.44, y: 0.95 },
        toe: { x: 0.6, y: 0.95 },
      },
      highlight: { joints: ["shoulder", "hip"], tone: "great" },
      caption: "Tilt from the hips, spine long, and hold it through the swing.",
    },
  },
  {
    title: "run: posture",
    figure: {
      pose: {
        head: { x: 0.55, y: 0.12 },
        shoulder: { x: 0.53, y: 0.24 },
        elbow: { x: 0.6, y: 0.36 },
        wrist: { x: 0.62, y: 0.46 },
        hip: { x: 0.5, y: 0.52 },
        knee: { x: 0.49, y: 0.72 },
        ankle: { x: 0.48, y: 0.92 },
        heel: { x: 0.42, y: 0.95 },
        toe: { x: 0.58, y: 0.95 },
      },
      highlight: { joints: ["head", "shoulder", "hip"], tone: "great" },
      caption: "Tall through the spine, a slight lean from the ankles.",
    },
  },
  {
    title: "run: land-under-hips",
    figure: {
      pose: {
        head: { x: 0.54, y: 0.12 },
        shoulder: { x: 0.52, y: 0.24 },
        elbow: { x: 0.44, y: 0.34 },
        wrist: { x: 0.4, y: 0.44 },
        hip: { x: 0.5, y: 0.52 },
        knee: { x: 0.52, y: 0.71 },
        ankle: { x: 0.5, y: 0.9 },
        heel: { x: 0.44, y: 0.93 },
        toe: { x: 0.58, y: 0.92 },
      },
      highlight: { joints: ["hip", "ankle"], tone: "great" },
      caption: "Foot lands close to under your hips, knee soft.",
    },
  },
];

export default function FormsPreviewPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-ink">Form cues</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {FIGURES.map((f) => (
          <div key={f.title} className="flex flex-col gap-1">
            <FormCue figure={f.figure} />
            <span className="text-center text-xs text-ink-muted">{f.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
