import type { MetadataRoute } from "next";

/*
 * PWA manifest (PRD §8). Enables install and, with the service worker, a fully
 * offline experience after first load. PNG icons (any + maskable) are what
 * Android/Play packaging requires (docs/Google-Play.md); the SVG stays for
 * browsers that prefer it.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SportFits",
    short_name: "SportFits",
    description:
      "Free, private video technique analysis for the sports you love.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0f14",
    theme_color: "#0b0f14",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
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
  };
}
