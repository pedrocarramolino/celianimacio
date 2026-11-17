import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/features/auth/auth-provider";
import { ServiceWorkerRegister } from "@/components/layout/sw-register";

export const metadata: Metadata = {
  title: { default: "Cel i Animació", template: "%s · Cel i Animació" },
  description: "Gestión de eventos, turnos, disponibilidad y fichajes del equipo de Cel i Animació.",
  applicationName: "Cel i Animació",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/favicon-64.png", apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Cel i Animació", statusBarStyle: "default" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0e5a5f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>{children}</AuthProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
