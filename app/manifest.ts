import type { MetadataRoute } from "next";

/*
 * PWA manifest (PRD §8). Enables install and, with the service worker, a fully
 * offline experience after first load. The icon is a self-hosted SVG.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BikeFit",
    short_name: "BikeFit",
    description:
      "A free, local-first starting bike fit from your body measurements.",
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
    ],
  };
}
