/*
 * The single source for external references (like lib/glossary.ts is for
 * terms). Credibility is the point: SportFits is free, so every method it
 * leans on names its source, and every source here has been checked to a
 * real citation. Where a number is our own unsourced starting estimate, we
 * say so in the copy rather than dress it in a citation it does not have.
 *
 * Plain, verifiable citations are the artifact; the URL is where to find it.
 * Peer-reviewed entries link to their PubMed record; books link to the
 * publisher. Add a reference here and cite it with <Cite id="..." />.
 */

export type ReferenceKind = "peer-reviewed" | "book" | "convention";

export type ReferenceId =
  | "hamley-thomas-1967"
  | "holmes-1994"
  | "lemond-1987"
  | "kops-convention"
  | "heiderscheit-2011"
  | "mcgill-lbd";

export type Reference = {
  /** Short label for an inline cite, e.g. "Hamley & Thomas, 1967". */
  short: string;
  /** Full, verifiable citation. */
  citation: string;
  kind: ReferenceKind;
  /** Where to find or verify it; omitted for sources with no stable link. */
  url?: string;
  /** Plain language: what it says and how SportFits uses it. */
  note: string;
};

export const REFERENCES: Record<ReferenceId, Reference> = {
  "hamley-thomas-1967": {
    short: "Hamley & Thomas, 1967",
    citation:
      "Hamley EJ, Thomas V. Physiological and postural factors in the calibration of the bicycle ergometer. Journal of Physiology. 1967;191(2):55P-56P.",
    kind: "peer-reviewed",
    url: "https://pubmed.ncbi.nlm.nih.gov/6050117/",
    note: "The pedal-based saddle-height method: about 109% of inseam to the pedal, which we express as 1.09 times inseam minus crank length.",
  },
  "holmes-1994": {
    short: "Holmes, Pruitt & Whalen, 1994",
    citation:
      "Holmes JC, Pruitt AL, Whalen NJ. Lower extremity overuse in bicycling. Clinics in Sports Medicine. 1994;13(1):187-205.",
    kind: "peer-reviewed",
    url: "https://pubmed.ncbi.nlm.nih.gov/8111852/",
    note: "The widely used 25 to 35 degree knee-flexion window at the bottom of the pedal stroke, the target our knee-at-stroke-bottom reading checks against.",
  },
  "lemond-1987": {
    short: "LeMond & Gordis, 1987",
    citation:
      "LeMond G, Gordis K. Greg LeMond's Complete Book of Bicycling. New York: Perigee Books; 1987.",
    kind: "book",
    note: "Popularised the 0.883-times-inseam saddle-height method, the second half of the average we start from.",
  },
  "kops-convention": {
    short: "Knee-over-pedal-spindle (fitting convention)",
    citation:
      "Knee-over-pedal-spindle (KOPS): a longstanding bike-fitting convention, not a physical law. Used as a starting reference for saddle setback.",
    kind: "convention",
    note: "A starting reference for setback, not a rule. Riders comfortable a centimetre either side of it are completely normal.",
  },
  "heiderscheit-2011": {
    short: "Heiderscheit et al., 2011",
    citation:
      "Heiderscheit BC, Chumanov ES, Michalski MP, Wille CM, Ryan MB. Effects of step rate manipulation on joint mechanics during running. Medicine & Science in Sports & Exercise. 2011;43(2):296-302.",
    kind: "peer-reviewed",
    url: "https://pubmed.ncbi.nlm.nih.gov/20581720/",
    note: "Subtle increases in step rate (about 5 to 10 percent) substantially reduce load at the hip and knee, the basis for our cadence nudge.",
  },
  "mcgill-lbd": {
    short: "McGill, Low Back Disorders",
    citation:
      "McGill SM. Low Back Disorders: Evidence-Based Prevention and Rehabilitation. Champaign, IL: Human Kinetics.",
    kind: "book",
    url: "https://us.humankinetics.com/products/low-back-disorders-4th-edition-with-hkpropel-access",
    note: "The biomechanics of lumbar loading and why spinal flexion under load is the risk our deadlift back-rounding reading treats most seriously.",
  },
};

export function reference(id: ReferenceId): Reference {
  return REFERENCES[id];
}

/** Kinds in the order the rabbit hole lists them, with a plain label. */
export const REFERENCE_KIND_LABEL: Record<ReferenceKind, string> = {
  "peer-reviewed": "Peer-reviewed research",
  book: "Book",
  convention: "Fitting convention",
};
