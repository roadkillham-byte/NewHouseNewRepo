import type { MetadataRoute } from "next";

/**
 * Static by necessity: this is generated at build time, so it can't carry the
 * household's own name the way the in-app header does. Making it per-household
 * would need a dynamic route and a way to know which house is installing —
 * not worth it for one share house.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "House OS",
    short_name: "House OS",
    description: "Chores, bills, and furnishing for the share house.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f7f3",
    theme_color: "#f5f7f3",
    orientation: "portrait",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
