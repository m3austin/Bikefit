import type { MetadataRoute } from "next";

/*
 * PWA manifest (PRD §8). Enables install and, with the service worker, a fully
 * offline experience after first load.
 *
 * Store-packaging notes (docs/Google-Play.md): PWABuilder validates the icon
 * links for a store build and rejects the SVG (`sizes: "any"` has no concrete
 * dimensions it can rasterize), so the manifest lists only the PNG icons (any
 * + maskable, 192 and 512) that Android needs; the SVG stays wired as the
 * browser favicon via app/layout metadata, not here. id/scope/orientation/
 * categories/screenshots round out what PWABuilder and the Play listing want.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "SportFits",
    short_name: "SportFits",
    description:
      "Free, private video technique analysis for the sports you love.",
    start_url: "/",
    scope: "/",
    lang: "en",
    display: "standalone",
    orientation: "any",
    categories: ["health", "fitness", "sports"],
    background_color: "#0b0f14",
    theme_color: "#0b0f14",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: [
      {
        src: "/screenshots/hub.png",
        sizes: "1080x1920",
        type: "image/png",
        form_factor: "narrow",
      },
      {
        src: "/screenshots/dashboard.png",
        sizes: "1080x1920",
        type: "image/png",
        form_factor: "narrow",
      },
    ],
  };
}
