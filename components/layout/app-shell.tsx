"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { Logo } from "./logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import { cn } from "@/lib/utils";
import { initials } from "@/utils/format";
import { ROLE_LABELS } from "@/types";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Mostrar en la barra inferior móvil */
  mobile?: boolean;
}

function isActive(pathname: string, href: string, root: string): boolean {
  const p = pathname.endsWith("/") ? pathname : `${pathname}/`;
  if (href === root) return p === root;
  return p.startsWith(href);
}

export function AppShell({ nav, root, children }: { nav: NavItem[]; root: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const name = session?.profile?.displayName ?? session?.email ?? "";

  async function handleSignOut() {
    await signOut();
    router.replace("/login/");
  }

  const links = (
    <nav aria-label="Navegación principal" className="flex flex-col gap-0.5">
      {nav.map((item) => {
        const active = isActive(pathname, item.href, root);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-primary text-primary-foreground" : "text-secondary-foreground hover:bg-muted",
            )}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const userBox = (
    <div className="flex items-center gap-3 rounded-lg border bg-background/60 p-2.5">
      <span className="flex size-9 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
        {initials(name) || "?"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">{session?.role ? ROLE_LABELS[session.role] : ""}</p>
      </div>
      <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Cerrar sesión" title="Cerrar sesión">
        <LogOut />
      </Button>
    </div>
  );

  const mobileItems = nav.filter((n) => n.mobile).slice(0, 5);

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Barra lateral escritorio */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col gap-6 border-r bg-card p-4 lg:flex">
        <Logo subtitle={session?.role === "admin" ? "Administración" : "Portal del trabajador"} />
        <div className="flex-1 overflow-y-auto">{links}</div>
        {userBox}
      </aside>

      {/* Cabecera móvil */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-card/95 px-4 py-2.5 backdrop-blur lg:hidden">
        <Logo />
        <Button variant="ghost" size="icon" aria-label="Abrir menú" aria-expanded={open} onClick={() => setOpen(true)}>
          <Menu />
        </Button>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <button className="absolute inset-0 bg-[#0b2226]/40" aria-label="Cerrar menú" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex w-72 flex-col gap-6 bg-card p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <Logo />
              <Button variant="ghost" size="icon" aria-label="Cerrar menú" onClick={() => setOpen(false)}>
                <X />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">{links}</div>
            {userBox}
          </div>
        </div>
      )}

      <main className="mx-auto w-full min-w-0 max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-10">{children}</main>

      {/* Barra inferior móvil */}
      {mobileItems.length > 0 && (
        <nav
          aria-label="Accesos rápidos"
          className="safe-bottom fixed inset-x-0 bottom-0 z-30 grid border-t bg-card/95 backdrop-blur lg:hidden"
          style={{ gridTemplateColumns: `repeat(${mobileItems.length}, minmax(0, 1fr))` }}
        >
          {mobileItems.map((item) => {
            const active = isActive(pathname, item.href, root);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn("flex flex-col items-center gap-1 py-2 text-[11px] font-medium", active ? "text-primary" : "text-muted-foreground")}
              >
                <item.icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
