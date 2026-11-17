"use client";
import Link from "next/link";
import { AlertTriangle, CalendarClock, Clock, MapPinCheck, UserCheck, Users } from "lucide-react";
import { PageHeader, StatCard } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ErrorState, EmptyState, LoadingBlock } from "@/components/layout/states";
import { EventStatusBadge, ShiftStatusBadge, AttendanceStatusBadge } from "@/components/layout/status-badges";
import { useAsync } from "@/hooks/use-async";
import { attendanceService, availabilityService, employeeService, eventService, shiftService } from "@/services";
import { addDaysISO, dayRange, formatISODate, formatMinutes, formatTime, todayISO, weekDaysISO, weekStartISO } from "@/utils/dates";
import { INCIDENT_LABELS } from "@/types";
import { useAuth } from "@/features/auth/auth-provider";

async function loadDashboard() {
  const today = todayISO();
  const weekStart = weekStartISO(today);
  const { start, end } = dayRange(today);
  const weekRange = { start: dayRange(weekStart).start, end: dayRange(addDaysISO(weekStart, 6)).end };
  const [employees, upcoming, shifts, availability, todaySessions, weekSessions, open] = await Promise.all([
    employeeService.list(),
    eventService.upcoming(6),
    shiftService.listRange(today, addDaysISO(today, 30)),
    availabilityService.listWeek(weekStart),
    attendanceService.listRange(start, end),
    attendanceService.listRange(weekRange.start, weekRange.end),
    attendanceService.listOpen(),
  ]);
  const activeEmployees = employees.filter((e) => e.status === "active");
  const pendingShifts = shifts.filter((s) => s.status === "open" || s.status === "partially_filled");
  const todayIdx = weekDaysISO(weekStart).indexOf(today);
  const availableToday = availability.filter((a) => {
    const d = a.days[todayIdx];
    return d && (d.status === "available" || d.status === "partial") && activeEmployees.some((e) => e.id === a.employeeId);
  }).length;
  const incidents = weekSessions.filter((s) => s.hasIncident);
  const weekMinutes = weekSessions.reduce((acc, s) => acc + (s.workedMinutes ?? 0), 0);
  return { activeEmployees, upcoming, pendingShifts, availableToday, todaySessions, incidents, weekMinutes, open };
}

export default function AdminDashboard() {
  const { session } = useAuth();
  const { data, error, loading, reload } = useAsync(loadDashboard, []);
  return (
    <>
      <PageHeader
        title={`Hola, ${session?.profile?.displayName?.split(" ")[0] ?? ""}`}
        description="Resumen de la actividad de la empresa."
        actions={
          <Button asChild>
            <Link href="/admin/eventos/nuevo/">Nuevo evento</Link>
          </Button>
        }
      />
      {error && <ErrorState message={error} onRetry={reload} />}
      {loading && !data && <LoadingBlock rows={4} />}
      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Trabajadores activos" value={data.activeEmployees.length} icon={Users} />
            <StatCard
              label="Turnos sin cubrir (30 días)"
              value={data.pendingShifts.length}
              icon={CalendarClock}
              tone={data.pendingShifts.length ? "warning" : "success"}
            />
            <StatCard label="Disponibles hoy" value={data.availableToday} hint="Según disponibilidad declarada" icon={UserCheck} tone="sky" />
            <StatCard label="Horas esta semana" value={formatMinutes(data.weekMinutes)} hint="Jornadas cerradas" icon={Clock} tone="orange" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle>Próximos eventos</CardTitle>
                  <CardDescription>Ordenados por fecha</CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/admin/eventos/">Ver todos</Link>
                </Button>
              </CardHeader>
              <CardContent>
                {data.upcoming.length === 0 ? (
                  <EmptyState title="Sin eventos próximos" />
                ) : (
                  <ul className="divide-y">
                    {data.upcoming.map((e) => (
                      <li key={e.id}>
                        <Link href={`/admin/eventos/detalle/?id=${e.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-primary">
                          <div className="min-w-0">
                            <p className="truncate font-medium">{e.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatISODate(e.date)} · {e.location.name} · {e.shiftCount} turno(s)
                            </p>
                          </div>
                          <EventStatusBadge status={e.status} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle>Turnos pendientes de asignación</CardTitle>
                  <CardDescription>Próximos 30 días</CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/admin/asignaciones/">Asignar</Link>
                </Button>
              </CardHeader>
              <CardContent>
                {data.pendingShifts.length === 0 ? (
                  <EmptyState title="Todos los turnos están cubiertos" />
                ) : (
                  <ul className="divide-y">
                    {data.pendingShifts.slice(0, 6).map((s) => (
                      <li key={s.id}>
                        <Link href={`/admin/asignaciones/?turno=${s.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-primary">
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {s.eventName} · {s.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatISODate(s.date)} · {formatTime(s.startAt)}–{formatTime(s.endAt)} · {s.confirmedEmployeeIds.length}/{s.requiredWorkers}
                            </p>
                          </div>
                          <ShiftStatusBadge status={s.status} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MapPinCheck className="size-4 text-primary" /> Fichajes de hoy
                  </CardTitle>
                  <CardDescription>{data.open.length} jornada(s) abiertas en total</CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/admin/fichajes/">Ver fichajes</Link>
                </Button>
              </CardHeader>
              <CardContent>
                {data.todaySessions.length === 0 ? (
                  <EmptyState title="Sin fichajes hoy" />
                ) : (
                  <ul className="divide-y">
                    {data.todaySessions.map((s) => (
                      <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{s.employeeName}</p>
                          <p className="text-xs text-muted-foreground">
                            {s.eventName} · entrada {formatTime(s.checkIn.serverAt ?? s.checkIn.clientAt)}
                          </p>
                        </div>
                        <AttendanceStatusBadge status={s.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="size-4 text-warning" /> Incidencias de la semana
                </CardTitle>
                <CardDescription>Fichajes con ubicación no validada, retrasos o cierres manuales</CardDescription>
              </CardHeader>
              <CardContent>
                {data.incidents.length === 0 ? (
                  <EmptyState title="Sin incidencias" />
                ) : (
                  <ul className="divide-y">
                    {data.incidents.slice(0, 8).map((s) => (
                      <li key={s.id} className="py-2.5">
                        <p className="font-medium">{s.employeeName}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.eventName} · {s.incidents.map((i) => INCIDENT_LABELS[i.type]).join(", ")}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
