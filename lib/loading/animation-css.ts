/*
 * The per-animation keyframes, ported verbatim from the <style> block of
 * reference-assets/marshmallow-loading-animations.html. Every rule and
 * @keyframes is byte-for-byte as designed; do not retime or reinterpret.
 *
 * One change from the reference: the character's brand colors are scoped to
 * the `.ml-loading` wrapper instead of :root, so they cannot clobber the
 * app's own tokens (the reference set --ink on :root, which the app also
 * uses). The character never reads --ink/--bg/--sweat, only these five.
 *
 * Injected once via a hoisted <style> in LoadingCharacter.
 */

export const ANIMATION_CSS = `
.ml-loading{
  --cream:#FFFDF9; --plum:#40304F; --pink:#FF6FB5; --cheek:#FF9CC9; --gold:#FFC24C;
}
.ml-loading .char{width:100%;height:100%;display:block;}

/* ============ PER-ANIMATION KEYFRAMES (6s loops unless noted) ============ */

/* idle default for anything not overridden */
.char{ animation: idleBob 3s ease-in-out infinite; }
@keyframes idleBob{0%,100%{transform:translateY(0);}50%{transform:translateY(-2%);}}

/* ---- stir ---- */
.char[data-anim="stir"] .armR{ transform-origin:154px 82px; animation: stirRot 3s linear infinite; }
@keyframes stirRot{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}
.char[data-anim="stir"] .liquid{ animation: hueCycleSlow 6s linear infinite; }
@keyframes hueCycleSlow{0%{filter:hue-rotate(0deg);}100%{filter:hue-rotate(60deg);}}

/* ---- overflow ---- */
.char[data-anim="overflow"] .liquid, .char[data-anim="overflow"] .liquidShine{
  transform-origin:100px 164px; animation: riseFall 6s ease-in-out infinite;
}
@keyframes riseFall{0%,100%{transform:scaleY(1);}45%{transform:scaleY(1.22);}55%{transform:scaleY(1.22);}}
.char[data-anim="overflow"] .droplet{ animation: dropOut 6s ease-in infinite; opacity:0; }
@keyframes dropOut{0%,42%{opacity:0;transform:translateY(0) scale(1);}46%{opacity:1;}52%{opacity:0;transform:translateY(-26px) scale(.6);}100%{opacity:0;}}

/* ---- growth ---- */
.char[data-anim="growth"]{ animation: growPulse 6s ease-in-out infinite; }
@keyframes growPulse{0%,60%,100%{transform:scale(1);}40%{transform:scale(1.14);}}

/* ---- colorswap ---- */
.char[data-anim="colorswap"] .liquid{ animation: hueFull 6s linear infinite; }
@keyframes hueFull{0%{filter:hue-rotate(0deg);}100%{filter:hue-rotate(360deg);}}

/* ---- hiccup ---- */
.char[data-anim="hiccup"]{ animation: hiccupJolt 6s ease-in-out infinite; }
@keyframes hiccupJolt{
  0%,7%,17%{transform:translateY(0);} 4%{transform:translateY(-10px);}
  40%,47%,57%{transform:translateY(0);} 44%{transform:translateY(-10px);}
  75%,82%,92%{transform:translateY(0);} 79%{transform:translateY(-10px);}
  100%{transform:translateY(0);}
}
.char[data-anim="hiccup"] .liquid{ animation: sloshSkew 6s ease-in-out infinite; transform-origin:100px 164px;}
@keyframes sloshSkew{0%,7%,17%{transform:skewX(0deg);}4%{transform:skewX(4deg);}40%,47%,57%{transform:skewX(0deg);}44%{transform:skewX(-4deg);}75%,82%,92%{transform:skewX(0deg);}79%{transform:skewX(4deg);}100%{transform:skewX(0deg);}}

/* ---- sneeze ---- */
.char[data-anim="sneeze"]{ animation: sneezeMove 6s ease-in-out infinite; }
@keyframes sneezeMove{0%,70%,100%{transform:scale(1) rotate(0deg);}76%{transform:scale(.95) rotate(-3deg);}80%{transform:scale(1.06) rotate(4deg);}86%{transform:scale(1) rotate(0deg);}}
.char[data-anim="sneeze"] .puff{ animation: puffOut 6s ease-out infinite; }
@keyframes puffOut{0%,78%{opacity:0;transform:scale(.3) translateY(0);}82%{opacity:.9;transform:scale(1) translateY(-6px);}92%{opacity:0;transform:scale(1.6) translateY(-16px);}100%{opacity:0;}}

/* ---- dizzy ---- */
.char[data-anim="dizzy"]{ animation: dizzyWobble 1.2s ease-in-out infinite; }
@keyframes dizzyWobble{0%,100%{transform:rotate(-3deg);}50%{transform:rotate(3deg);}}
.char[data-anim="dizzy"] .orbit{ transform-origin:100px 55px; animation: orbitSpin 2.4s linear infinite; }
@keyframes orbitSpin{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}

/* ---- trip ---- */
.char[data-anim="trip"]{ animation: tripBody 6s ease-in-out infinite; }
@keyframes tripBody{0%,55%,100%{transform:translateX(0) rotate(0deg);}62%{transform:translateX(-6px) rotate(-6deg);}68%{transform:translateX(4px) rotate(4deg);}74%{transform:translateX(0) rotate(0deg);}}
.char[data-anim="trip"] .legL{ transform-origin:70px 160px; animation: kickL 6s ease-in-out infinite; }
@keyframes kickL{0%,58%,100%{transform:rotate(0deg);}64%{transform:rotate(-30deg);}70%{transform:rotate(10deg);}76%{transform:rotate(0deg);}}
.char[data-anim="trip"] .armL, .char[data-anim="trip"] .armR{ animation: flailBalance 6s ease-in-out infinite; }
.char[data-anim="trip"] .armL{transform-origin:46px 82px;} .char[data-anim="trip"] .armR{transform-origin:154px 82px;}
@keyframes flailBalance{0%,58%,100%{transform:rotate(0deg);}64%{transform:rotate(20deg);}70%{transform:rotate(-16deg);}76%{transform:rotate(0deg);}}

/* ---- daydream ---- */
.char[data-anim="daydream"] .pupilL, .char[data-anim="daydream"] .pupilR{ animation: driftUp 6s ease-in-out infinite; }
@keyframes driftUp{0%,15%{transform:translateY(0);}30%,80%{transform:translateY(-3px);}100%{transform:translateY(0);}}
.char[data-anim="daydream"] .thought{ opacity:0; animation: thoughtFade 6s ease-in-out infinite; }
@keyframes thoughtFade{0%,15%{opacity:0;transform:translateY(6px);}30%,75%{opacity:1;transform:translateY(0);}95%,100%{opacity:0;transform:translateY(-6px);}}

/* ---- hum ---- */
.char[data-anim="hum"]{ animation: humSway 1.8s ease-in-out infinite; }
@keyframes humSway{0%,100%{transform:rotate(-2.5deg);}50%{transform:rotate(2.5deg);}}
.char[data-anim="hum"] .note1{ animation: noteRise 3s ease-in infinite; opacity:0; }
.char[data-anim="hum"] .note2{ animation: noteRise 3s ease-in infinite 1.5s; opacity:0; }
@keyframes noteRise{0%{opacity:0;transform:translateY(0);}20%{opacity:1;}100%{opacity:0;transform:translateY(-22px);}}

/* ---- nap ---- */
.char[data-anim="nap"] .glow{ animation: breathe 3s ease-in-out infinite; }
@keyframes breathe{0%,100%{opacity:.12;}50%{opacity:.32;}}
.char[data-anim="nap"] .z1{ animation: zRise 3s ease-in infinite; opacity:0; }
.char[data-anim="nap"] .z2{ animation: zRise 3s ease-in infinite 1.5s; opacity:0; }
@keyframes zRise{0%{opacity:0;transform:translateY(0) scale(.8);}25%{opacity:.8;}100%{opacity:0;transform:translateY(-18px) scale(1.2);}}

/* ---- peekaboo ---- */
.char[data-anim="peekaboo"] .marshmallow, .char[data-anim="peekaboo"] .pupilL, .char[data-anim="peekaboo"] .pupilR,
.char[data-anim="peekaboo"] .cheekL, .char[data-anim="peekaboo"] .cheekR, .char[data-anim="peekaboo"] .mouth{
  animation: duckDown 6s ease-in-out infinite; transform-origin:100px 160px;
}
@keyframes duckDown{0%,20%{transform:translateY(0);}45%,65%{transform:translateY(30px);}90%,100%{transform:translateY(0);}}

/* ---- tap glass ---- */
.char[data-anim="tapglass"] .armR{ transform-origin:154px 82px; animation: tapArm 1.4s ease-in-out infinite; }
@keyframes tapArm{0%,60%,100%{transform:translateX(0) rotate(0deg);}75%{transform:translateX(6px) rotate(-6deg);}}
.char[data-anim="tapglass"] .tapline{ animation: tapFlash 1.4s ease-out infinite; }
@keyframes tapFlash{0%,60%{opacity:0;}72%{opacity:.8;}90%,100%{opacity:0;}}

/* ---- blow bubble ---- */
.char[data-anim="bubbleblow"] .bigbubble{ animation: growPop 6s ease-out infinite; }
@keyframes growPop{0%{r:0;opacity:.7;}55%{r:22;opacity:.7;}62%{r:24;opacity:0;}100%{r:0;opacity:0;}}
.char[data-anim="bubbleblow"] .confetti{ animation: confettiPop 6s ease-out infinite; }
.char[data-anim="bubbleblow"] .c1{ animation-delay:0s; } .char[data-anim="bubbleblow"] .c2{ animation-delay:.05s; } .char[data-anim="bubbleblow"] .c3{ animation-delay:.1s; }
@keyframes confettiPop{0%,58%{opacity:0;transform:translate(0,0);}64%{opacity:1;}75%{opacity:0;transform:translate(18px,-22px);}100%{opacity:0;}}

/* ---- juggle ---- */
.char[data-anim="juggle"] .jugglegroup{ transform-origin:100px 50px; }
.char[data-anim="juggle"] .j1{ animation: orbitBall 1.8s linear infinite; }
.char[data-anim="juggle"] .j2{ animation: orbitBall 1.8s linear infinite -.6s; }
.char[data-anim="juggle"] .j3{ animation: orbitBall 1.8s linear infinite -1.2s; }
@keyframes orbitBall{
  0%{transform: translate(0px,0px);}
  25%{transform: translate(22px,-14px);}
  50%{transform: translate(0px,-24px);}
  75%{transform: translate(-22px,-14px);}
  100%{transform: translate(0px,0px);}
}

/* ---- rainbow ---- */
.char[data-anim="rainbow"] .liquid{ animation: hueFast 3s linear infinite; }
@keyframes hueFast{0%{filter:hue-rotate(0deg) saturate(1.4);}100%{filter:hue-rotate(360deg) saturate(1.4);}}

/* ---- party hat ---- */
.char[data-anim="partyhat"] .hat{ transform-origin:100px 30px; animation: hatWiggle 1.6s ease-in-out infinite; }
@keyframes hatWiggle{0%,100%{transform:rotate(-6deg);}50%{transform:rotate(6deg);}}

/* ---- golden ---- */
.char[data-anim="golden"]{ filter: sepia(.5) saturate(1.7) hue-rotate(-8deg) brightness(1.05); }
.char[data-anim="golden"] .s1{ animation: twinkle 1.4s ease-in-out infinite; }
.char[data-anim="golden"] .s2{ animation: twinkle 1.4s ease-in-out infinite .5s; }
@keyframes twinkle{0%,100%{opacity:.2;transform:scale(.7);}50%{opacity:1;transform:scale(1.1);}}
`;
