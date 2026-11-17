"use client";
import { Bell, CalendarDays, CalendarRange, ClipboardCheck, FileBarChart, LayoutDashboard, MapPinCheck, PartyPopper, Settings, Users } from "lucide-react";
import { AppShell, type NavItem } from "@/components/layout/app-shell";
import { RoleGuard } from "@/features/auth/role-guard";

const NAV: NavItem[] = [
  { href: "/admin/", label: "Inicio", icon: LayoutDashboard, mobile: true },
  { href: "/admin/eventos/", label: "Eventos", icon: PartyPopper, mobile: true },
  { href: "/admin/calendario/", label: "Calendario", icon: CalendarDays },
  { href: "/admin/asignaciones/", label: "Asignaciones", icon: ClipboardCheck, mobile: true },
  { href: "/admin/disponibilidad/", label: "Disponibilidad", icon: CalendarRange },
  { href: "/admin/trabajadores/", label: "Trabajadores", icon: Users, mobile: true },
  { href: "/admin/fichajes/", label: "Fichajes", icon: MapPinCheck, mobile: true },
  { href: "/admin/informes/", label: "Informes", icon: FileBarChart },
  { href: "/admin/notificaciones/", label: "Avisos", icon: Bell },
  { href: "/admin/configuracion/", label: "Configuración", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard role="admin">
      <AppShell nav={NAV} root="/admin/">
        {children}
      </AppShell>
    </RoleGuard>
  );
}
