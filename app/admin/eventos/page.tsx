"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { MapPin, PartyPopper, Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/layout/states";
import { EventStatusBadge } from "@/components/layout/status-badges";
import { useAsync } from "@/hooks/use-async";
import { eventService } from "@/services";
import { EVENT_CATEGORIES, EVENT_CATEGORY_LABELS, EVENT_STATUSES, EVENT_STATUS_LABELS, type EventCategory, type EventStatus } from "@/types";
import { CategoryBadge } from "@/components/layout/category-badge";
import { formatISODate, todayISO } from "@/utils/dates";

export default function EventsPage() {
  const { data, error, loading, reload } = useAsync(() => eventService.list(), []);
  const [q, setQ] = useState("");
  const [when, setWhen] = useState<"upcoming" | "past" | "all">("upcoming");
  const [status, setStatus] = useState<EventStatus | "all">("all");
  const [category, setCategory] = useState<EventCategory | "all">("all");
  const today = todayISO();

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    const items = (data ?? []).filter(
      (e) =>
        (status === "all" || e.status === status) &&
        (category === "all" || e.category === category) &&
        (when === "all" || (when === "upcoming" ? e.date >= today : e.date < today)) &&
        (!term || `${e.name} ${e.location.name} ${e.location.address}`.toLowerCase().includes(term)),
    );
    return when === "upcoming" ? [...items].sort((a, b) => a.date.localeCompare(b.date)) : items;
  }, [data, q, when, status, category, today]);

  return (
    <>
      <PageHeader
        title="Eventos"
        description="Crea eventos, define sus turnos y gestiona su estado."
        actions={
          <Button asChild>
            <Link href="/admin/eventos/nuevo/">
              <Plus /> Nuevo evento
            </Link>
          </Button>
        }
      />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Buscar" placeholder="Buscar eventos" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select aria-label="Periodo" className="sm:w-40" value={when} onChange={(e) => setWhen(e.target.value as typeof when)}>
          <option value="upcoming">Próximos</option>
          <option value="past">Pasados</option>
          <option value="all">Todos</option>
        </Select>
        <Select aria-label="Tipo de evento" className="sm:w-52" value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
          <option value="all">Todos los tipos</option>
          {EVENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {EVENT_CATEGORY_LABELS[c]}
            </option>
          ))}
        </Select>
        <Select aria-label="Estado" className="sm:w-44" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="all">Todos los estados</option>
          {EVENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {EVENT_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      </div>
      {error && <ErrorState message={error} onRetry={reload} />}
      {loading && !data && <LoadingBlock />}
      {data && list.length === 0 && <EmptyState icon={PartyPopper} title="No hay eventos para este filtro" />}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {list.map((e) => (
          <Link key={e.id} href={`/admin/eventos/detalle/?id=${e.id}`} className="group">
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardContent className="space-y-3 pt-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-primary">{formatISODate(e.date, { weekday: "short" })}</p>
                    <p className="truncate font-semibold group-hover:text-primary">{e.name}</p>
                  </div>
                  <EventStatusBadge status={e.status} />
                </div>
                <CategoryBadge category={e.category} />
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="size-4 shrink-0" />
                  <span className="truncate">{e.location.name}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {e.shiftCount} turno(s) · {e.staffEmployeeIds.length} persona(s) asignada(s)
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
