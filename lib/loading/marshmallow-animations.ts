/*
 * The Marshmallow Labs loading-character set, ported verbatim from
 * reference-assets/marshmallow-loading-animations.html (read-only reference).
 * Every SVG shape, path, gradient, and clip is exactly as designed there; the
 * per-animation CSS keyframes live in lib/loading/animation-css.ts, scoped by
 * [data-anim="..."] the same way. Do not reinterpret or redraw the character.
 *
 * Each build() returns the full SVG markup string for one animation; the
 * LoadingCharacter component renders it and the shared stylesheet drives the
 * motion. Pure; no React or DOM here.
 */

export type AnimationGroup =
  | "science"
  | "comedy"
  | "cozy"
  | "playful"
  | "rare";

export type AnimationKey =
  | "stir"
  | "overflow"
  | "growth"
  | "colorswap"
  | "hiccup"
  | "sneeze"
  | "dizzy"
  | "trip"
  | "daydream"
  | "hum"
  | "nap"
  | "peekaboo"
  | "tapglass"
  | "bubbleblow"
  | "juggle"
  | "rainbow"
  | "partyhat"
  | "golden";

export type MarshmallowAnimation = {
  key: AnimationKey;
  group: AnimationGroup;
  label: string;
  /** Full SVG markup for this animation. */
  build: () => string;
};

/* ===================== SHARED CHARACTER TEMPLATE ===================== */
function svgOpen(anim: string): string {
  return `<svg viewBox="0 0 200 230" xmlns="http://www.w3.org/2000/svg" class="char" data-anim="${anim}">
  <defs>
    <radialGradient id="pot-${anim}" cx="0.4" cy="0.3" r="0.9"><stop offset="0" stop-color="#FFB6E1"/><stop offset="1" stop-color="#FF5FAE"/></radialGradient>
    <clipPath id="clip-${anim}"><path d="M74 40 L74 66 L48 140 Q42 160 62 160 L138 160 Q158 160 152 140 L126 66 L126 40 Z"/></clipPath>
  </defs>
  <ellipse cx="100" cy="198" rx="42" ry="7" fill="rgba(64,48,79,.10)"/>`;
}

const LEGS = `
  <g class="legL"><path d="M84 154 Q82 166 74 172" stroke="#fff" stroke-width="30" stroke-linecap="round" fill="none"/><ellipse cx="70" cy="175" rx="19" ry="13" fill="#fff"/></g>
  <g class="legR"><path d="M116 154 Q118 166 126 172" stroke="#fff" stroke-width="30" stroke-linecap="round" fill="none"/><ellipse cx="130" cy="175" rx="19" ry="13" fill="#fff"/></g>`;

const ARMS = `
  <g class="armL"><path d="M68 96 Q50 96 46 82" stroke="#fff" stroke-width="26" stroke-linecap="round" fill="none"/><circle cx="46" cy="82" r="16" fill="#fff"/></g>
  <g class="armR"><path d="M132 96 Q150 96 154 82" stroke="#fff" stroke-width="26" stroke-linecap="round" fill="none"/><circle cx="154" cy="82" r="16" fill="#fff"/></g>`;

function flaskFill(): string {
  return `<path class="flaskFill" d="M74 40 L74 66 L48 140 Q42 160 62 160 L138 160 Q158 160 152 140 L126 66 L126 40 Z" fill="#fff" fill-opacity=".55"/>`;
}
function outlineTop(): string {
  return `<path class="flaskOutline" d="M74 40 L74 66 L48 140 Q42 160 62 160 L138 160 Q158 160 152 140 L126 66 L126 40 Z" fill="none" stroke="var(--plum)" stroke-width="7" stroke-linejoin="round"/><rect x="70" y="30" width="60" height="14" rx="7" fill="var(--plum)"/>`;
}
function topBubbles(): string {
  return `
  <circle class="bubbleTop1" cx="90" cy="16" r="5" fill="#fff" stroke="var(--plum)" stroke-width="2.5"/>
  <circle class="bubbleTop2" cx="108" cy="4" r="3.4" fill="#fff" stroke="var(--plum)" stroke-width="2.2"/>
  <circle class="bubbleTop3" cx="122" cy="16" r="2.4" fill="#fff" stroke="var(--plum)" stroke-width="2"/>`;
}
function defaultFace(): string {
  return `
  <circle cx="84" cy="120" r="7" fill="var(--cheek)" opacity=".8" class="cheekL"/>
  <circle cx="116" cy="120" r="7" fill="var(--cheek)" opacity=".8" class="cheekR"/>
  <circle cx="90" cy="106" r="5" fill="var(--plum)" class="pupilL"/>
  <circle cx="110" cy="106" r="5" fill="var(--plum)" class="pupilR"/>
  <circle cx="88.4" cy="104.4" r="1.6" fill="#fff"/>
  <circle cx="108.4" cy="104.4" r="1.6" fill="#fff"/>
  <path d="M89 124 Q100 133 111 124" stroke="var(--plum)" stroke-width="3.8" fill="none" stroke-linecap="round" class="mouth"/>`;
}

type CharOpts = {
  liquidTop?: number;
  liquidH?: number;
  face?: string;
  extraInside?: string;
  extraOutside?: string;
};

/* full assembler */
function charSVG(anim: string, opts?: CharOpts): string {
  opts = opts || {};
  const liquidTop = opts.liquidTop !== undefined ? opts.liquidTop : 114;
  const liquidH = opts.liquidH !== undefined ? opts.liquidH : 50;
  const face = opts.face !== undefined ? opts.face : defaultFace();
  const extraInside = opts.extraInside || "";
  const extraOutside = opts.extraOutside || "";
  return `${svgOpen(anim)}
  ${LEGS}
  ${ARMS}
  ${flaskFill()}
  <g clip-path="url(#clip-${anim})">
    <rect class="liquid" x="42" y="${liquidTop}" width="116" height="${liquidH}" fill="url(#pot-${anim})"/>
    <rect x="42" y="${liquidTop}" width="116" height="7" fill="#FFD3EC" class="liquidShine"/>
    <circle class="bubbleIn1" cx="60" cy="${liquidTop + 31}" r="4" fill="#fff" opacity=".5"/>
    <circle class="bubbleIn2" cx="132" cy="${liquidTop + 36}" r="3" fill="#fff" opacity=".45"/>
    <rect class="marshmallow" x="72" y="82" width="56" height="56" rx="22" fill="var(--cream)" stroke="rgba(64,48,79,0.22)" stroke-width="3"/>
    ${face}
    ${extraInside}
  </g>
  ${outlineTop()}
  ${topBubbles()}
  ${extraOutside}
</svg>`;
}

/* ===================== ANIMATION DEFINITIONS ===================== */
export const ANIMS: readonly MarshmallowAnimation[] = [
  {
    key: "stir",
    group: "science",
    label: "Mixing potions",
    build: () =>
      charSVG("stir", {
        extraInside: `<g class="spoon"><rect x="147" y="60" width="4" height="34" rx="2" fill="#C8A96A"/><ellipse cx="149" cy="58" rx="6" ry="4" fill="#C8A96A"/></g>`,
      }),
  },
  {
    key: "overflow",
    group: "science",
    label: "Bubbling over",
    build: () =>
      charSVG("overflow", {
        extraOutside: `<circle class="droplet" cx="100" cy="40" r="3.5" fill="#FF6FB5"/>`,
      }),
  },
  { key: "growth", group: "science", label: "Growth spurt", build: () => charSVG("growth") },
  {
    key: "colorswap",
    group: "science",
    label: "Color-swap chemistry",
    build: () => charSVG("colorswap"),
  },

  { key: "hiccup", group: "comedy", label: "Hiccups", build: () => charSVG("hiccup") },
  {
    key: "sneeze",
    group: "comedy",
    label: "Sneeze",
    build: () =>
      charSVG("sneeze", {
        extraOutside: `<circle class="puff" cx="100" cy="14" r="8" fill="#fff" opacity="0"/>`,
      }),
  },
  {
    key: "dizzy",
    group: "comedy",
    label: "Dizzy spin",
    build: () =>
      charSVG("dizzy", {
        face: `
      <circle cx="84" cy="120" r="7" fill="var(--cheek)" opacity=".8"/>
      <circle cx="116" cy="120" r="7" fill="var(--cheek)" opacity=".8"/>
      <path d="M85 101 L95 111 M95 101 L85 111" stroke="var(--plum)" stroke-width="3" stroke-linecap="round"/>
      <path d="M105 101 L115 111 M115 101 L105 111" stroke="var(--plum)" stroke-width="3" stroke-linecap="round"/>
      <path d="M90 126 Q100 122 110 126" stroke="var(--plum)" stroke-width="3" fill="none" stroke-linecap="round"/>`,
        extraOutside: `<g class="orbit"><circle cx="100" cy="6" r="3" fill="var(--gold)"/><circle cx="70" cy="16" r="2.4" fill="var(--pink)"/><circle cx="130" cy="16" r="2.4" fill="#7FD858"/></g>`,
      }),
  },
  { key: "trip", group: "comedy", label: "Trips over own legs", build: () => charSVG("trip") },

  {
    key: "daydream",
    group: "cozy",
    label: "Daydreaming",
    build: () =>
      charSVG("daydream", {
        face: `
      <circle cx="84" cy="120" r="7" fill="var(--cheek)" opacity=".7"/>
      <circle cx="116" cy="120" r="7" fill="var(--cheek)" opacity=".7"/>
      <circle class="pupilL" cx="90" cy="103" r="4.5" fill="var(--plum)"/>
      <circle class="pupilR" cx="110" cy="103" r="4.5" fill="var(--plum)"/>
      <path d="M92 127 Q100 130 108 127" stroke="var(--plum)" stroke-width="3" fill="none" stroke-linecap="round"/>`,
        extraOutside: `<g class="thought">
        <circle cx="140" cy="58" r="3" fill="#fff" stroke="var(--plum)" stroke-width="1.6"/>
        <circle cx="150" cy="46" r="4.5" fill="#fff" stroke="var(--plum)" stroke-width="1.8"/>
        <circle cx="164" cy="28" r="13" fill="#fff" stroke="var(--plum)" stroke-width="2"/>
        <path d="M164 22 l1.6 3.4 3.8 0.4 -2.8 2.6 0.7 3.7 -3.3 -1.9 -3.3 1.9 0.7 -3.7 -2.8 -2.6 3.8 -0.4z" fill="var(--gold)"/>
      </g>`,
      }),
  },
  {
    key: "hum",
    group: "cozy",
    label: "Humming a tune",
    build: () =>
      charSVG("hum", {
        extraOutside: `
    <text class="note note1" x="150" y="60" font-family="Baloo 2" font-weight="700" font-size="16" fill="var(--pink)">♪</text>
    <text class="note note2" x="40" y="70" font-family="Baloo 2" font-weight="700" font-size="13" fill="#A98CF0">♪</text>`,
      }),
  },
  {
    key: "nap",
    group: "cozy",
    label: "Little nap",
    build: () =>
      charSVG("nap", {
        face: `
      <circle cx="84" cy="120" r="7" fill="var(--cheek)" opacity=".55"/>
      <circle cx="116" cy="120" r="7" fill="var(--cheek)" opacity=".55"/>
      <path d="M84 106 Q90 110 96 106" stroke="var(--plum)" stroke-width="3.4" fill="none" stroke-linecap="round"/>
      <path d="M104 106 Q110 110 116 106" stroke="var(--plum)" stroke-width="3.4" fill="none" stroke-linecap="round"/>
      <ellipse cx="100" cy="128" rx="4" ry="3" fill="var(--plum)"/>
      <ellipse class="glow" cx="100" cy="112" rx="34" ry="30" fill="#fff" opacity="0"/>`,
        extraOutside: `
      <text class="zzz z1" x="130" y="30" font-family="Baloo 2" font-weight="700" font-size="12" fill="var(--plum)" opacity=".7">z</text>
      <text class="zzz z2" x="142" y="16" font-family="Baloo 2" font-weight="700" font-size="16" fill="var(--plum)" opacity=".6">Z</text>`,
      }),
  },

  { key: "peekaboo", group: "playful", label: "Peekaboo", build: () => charSVG("peekaboo") },
  {
    key: "tapglass",
    group: "playful",
    label: "Taps the glass",
    build: () =>
      charSVG("tapglass", {
        extraOutside: `
    <path class="tapline t1" d="M158 96 l6 -3" stroke="var(--plum)" stroke-width="2" stroke-linecap="round" opacity="0"/>
    <path class="tapline t2" d="M160 102 l7 0" stroke="var(--plum)" stroke-width="2" stroke-linecap="round" opacity="0"/>`,
      }),
  },
  {
    key: "bubbleblow",
    group: "playful",
    label: "Blows a bubble",
    build: () =>
      charSVG("bubbleblow", {
        extraOutside: `
    <circle class="bigbubble" cx="100" cy="118" r="0" fill="#fff" opacity=".7" stroke="var(--plum)" stroke-width="1.5"/>
    <circle class="confetti c1" cx="100" cy="118" r="2" fill="var(--pink)" opacity="0"/>
    <circle class="confetti c2" cx="100" cy="118" r="2" fill="var(--gold)" opacity="0"/>
    <circle class="confetti c3" cx="100" cy="118" r="2" fill="#7FD858" opacity="0"/>`,
      }),
  },
  {
    key: "juggle",
    group: "playful",
    label: "Juggling",
    build: () =>
      charSVG("juggle", {
        extraOutside: `
    <g class="jugglegroup">
      <circle class="jball j1" cx="100" cy="0" r="4" fill="var(--pink)"/>
      <circle class="jball j2" cx="100" cy="0" r="4" fill="var(--gold)"/>
      <circle class="jball j3" cx="100" cy="0" r="4" fill="#7FD858"/>
    </g>`,
      }),
  },

  { key: "rainbow", group: "rare", label: "Rainbow potion ✨", build: () => charSVG("rainbow") },
  {
    key: "partyhat",
    group: "rare",
    label: "Party hat cameo ✨",
    build: () =>
      charSVG("partyhat", {
        extraOutside: `
    <g class="hat">
      <path d="M100 4 L84 30 L116 30 Z" fill="var(--pink)" stroke="var(--plum)" stroke-width="2.5" stroke-linejoin="round"/>
      <circle cx="100" cy="4" r="4.5" fill="var(--gold)" stroke="var(--plum)" stroke-width="2"/>
    </g>`,
      }),
  },
  {
    key: "golden",
    group: "rare",
    label: "Golden variant ✨",
    build: () =>
      charSVG("golden", {
        extraOutside: `
    <g class="sparkles">
      <path class="spark s1" d="M40 60 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2z" fill="#fff"/>
      <path class="spark s2" d="M165 80 l1.6 4.6 4.6 1.6 -4.6 1.6 -1.6 4.6 -1.6 -4.6 -4.6 -1.6 4.6 -1.6z" fill="#fff"/>
    </g>`,
      }),
  },
];

/** All valid keys (for validating a forced choice from a query param). */
export const ANIMATION_KEYS: readonly AnimationKey[] = ANIMS.map((a) => a.key);

const BY_KEY = new Map<AnimationKey, MarshmallowAnimation>(
  ANIMS.map((a) => [a.key, a]),
);

/** The animation entry for a key, or undefined if unknown. */
export function getAnimation(key: AnimationKey): MarshmallowAnimation | undefined {
  return BY_KEY.get(key);
}
