import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cel i Animació",
    short_name: "Cel i Animació",
    description: "Cel i Animació · Animación infantil y eventos: turnos y fichajes del equipo",
    lang: "es",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f6f8f8",
    theme_color: "#0e5a5f",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
