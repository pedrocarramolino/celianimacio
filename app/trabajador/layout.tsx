"use client";
import { Bell, CalendarRange, History, Home, MapPinCheck, PartyPopper, UserRound } from "lucide-react";
import { AppShell, type NavItem } from "@/components/layout/app-shell";
import { RoleGuard } from "@/features/auth/role-guard";

const NAV: NavItem[] = [
  { href: "/trabajador/", label: "Inicio", icon: Home, mobile: true },
  { href: "/trabajador/eventos/", label: "Eventos", icon: PartyPopper, mobile: true },
  { href: "/trabajador/fichar/", label: "Fichar", icon: MapPinCheck, mobile: true },
  { href: "/trabajador/disponibilidad/", label: "Disponibilidad", icon: CalendarRange, mobile: true },
  { href: "/trabajador/historial/", label: "Historial", icon: History },
  { href: "/trabajador/notificaciones/", label: "Avisos", icon: Bell, mobile: true },
  { href: "/trabajador/perfil/", label: "Perfil", icon: UserRound },
];

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard role="worker">
      <AppShell nav={NAV} root="/trabajador/">
        {children}
      </AppShell>
    </RoleGuard>
  );
}
