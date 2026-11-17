import type { NextConfig } from "next";

/**
 * Exportación estática: compatible con Firebase Hosting en el plan Spark.
 * El renderizado en servidor (SSR) en Firebase requiere Cloud Functions / App Hosting,
 * que exigen el plan Blaze. Por eso toda la app es cliente + Firestore.
 */
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
