# BikeFit - Cross-platform compatibility notes

Reviewed 2026-07-04 across the four target environments: Windows and Mac
desktop browsers, Android (Chrome), and iOS/iPadOS (Safari). Support floor
per PRD §8: evergreen Chrome/Safari/Firefox/Edge, iOS Safari 16+.

## What every feature relies on, and its floor

| Capability | Used by | Floor | Notes |
|---|---|---|---|
| IndexedDB | fits, drafts, settings | universal | In-memory fallback + banner when unavailable (private mode) |
| localStorage | theme, units | universal | Reads AND writes wrapped in try/catch: some browsers throw on access when site data is blocked |
| Service worker | offline PWA | universal | Feature-checked, registration failure ignored (progressive) |
| `crypto.randomUUID` | ids | Safari 15.4+, Chrome 92+ | Inside the floor |
| `dvh` units | layout, video sizing | Safari 15.4+, Chrome 108+ | Inside the floor |
| `requestVideoFrameCallback` | pose tracking loop | Safari 15.4+, Chrome 83+ | Runtime-checked with a `requestAnimationFrame` fallback anyway |
| WebAssembly + WebGL | MediaPipe pose tracking | universal | GPU delegate tried first, automatic CPU fallback when a device cannot initialise WebGL (slower, still works) |
| Radix UI primitives | all controls | evergreen | Touch, mouse, and keyboard handled by the library |

## Platform-specific behaviors that are handled in code

- **iPhone HEVC recordings.** iPhones default to High Efficiency (HEVC)
  capture. Safari plays them; Chrome on Windows/Android often cannot. The
  video workspace listens for decode errors and shows guidance (use Safari
  on the recording phone, or switch the camera to Most Compatible) instead
  of a silent black box.
- **iOS inline video.** The workspace `<video>` sets `playsInline` and
  `muted`, so playback stays in the page and autoplay policies are
  satisfied; analysis playback starts from an explicit tap.
- **Safari private mode.** localStorage writes throw: guarded. IndexedDB
  can be unavailable: in-memory fallback with a banner.
- **Touch-first interactions.** Glossary definitions are tap-to-open
  popovers (not hover tooltips); hover and keyboard focus are additive for
  desktop. Sliders, toggles, and menus are Radix primitives.
- **Blob downloads (backup export).** Standard anchor-download works on all
  four platforms; iOS Safari routes it through the share/download sheet,
  which is expected behavior.

## Known limits (accepted, documented)

- Video Fit Analysis needs network on FIRST use per device (MediaPipe wasm
  and model come from a public CDN, then cache). Everything else works
  offline after first load.
- Pose tracking speed varies with hardware; on CPU-fallback devices the
  analysis pass may drop frames. Timestamps keep the math correct; it just
  samples fewer frames.
- `.mov` files are accepted by extension because phones sometimes report
  blank MIME types; whether they decode depends on the platform codec (see
  HEVC note above).
