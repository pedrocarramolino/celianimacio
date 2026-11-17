"use client";
import Link from "next/link";
import { Bell, CalendarRange, MapPinCheck, PartyPopper } from "lucide-react";
import { PageHeader, StatCard } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/layout/states";
import { AssignmentStatusBadge } from "@/components/layout/status-badges";
import { WorkerShiftDetails } from "@/features/worker/shift-details";
import { useAuth } from "@/features/auth/auth-provider";
import { useAsync } from "@/hooks/use-async";
import { assignmentService, availabilityService, notificationService } from "@/services";
import { formatDateTime, formatTime, todayISO, weekStartISO } from "@/utils/dates";

export default function WorkerHome() {
  const { session } = useAuth();
  const data = useAsync(async () => {
    const [assignments, notifications, availability] = await Promise.all([
      assignmentService.listMine(),
      notificationService.listMine(),
      availabilityService.getMine(weekStartISO(todayISO())),
    ]);
    const now = Date.now();
    const upcoming = assignments
      .filter((a) => a.status !== "cancelled" && a.shiftEndAt.getTime() > now)
      .sort((a, b) => a.shiftStartAt.getTime() - b.shiftStartAt.getTime());
    return { upcoming, unread: notifications.filter((n) => !n.read).length, availability };
  }, []);

  const next = data.data?.upcoming[0];
  return (
    <>
      <PageHeader title={`Hola, ${session?.profile?.displayName?.split(" ")[0] ?? ""}`} description="Tu actividad en Cel i Animació." />
      {data.error && <ErrorState message={data.error} onRetry={data.reload} />}
      {data.loading && !data.data && <LoadingBlock rows={4} />}
      {data.data && (
        <div className="space-y-5">
          {!data.data.availability && (
            <Alert variant="warning" title="Disponibilidad pendiente">
              Aún no has indicado tu disponibilidad para esta semana.{" "}
              <Link href="/trabajador/disponibilidad/" className="font-medium underline">
                Indicarla ahora
              </Link>
            </Alert>
          )}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <StatCard label="Próximos turnos" value={data.data.upcoming.length} icon={PartyPopper} />
            <StatCard label="Avisos sin leer" value={data.data.unread} icon={Bell} tone={data.data.unread ? "warning" : "default"} />
            <StatCard label="Disponibilidad semana" value={data.data.availability ? "Indicada" : "Pendiente"} icon={CalendarRange} tone={data.data.availability ? "success" : "warning"} />
          </div>
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-2">
              <div>
                <CardTitle>Tu próximo turno</CardTitle>
                {next && (
                  <CardDescription>
                    {next.eventName} · {next.shiftName} · {formatDateTime(next.shiftStartAt)}–{formatTime(next.shiftEndAt)}
                  </CardDescription>
                )}
              </div>
              {next && <AssignmentStatusBadge status={next.status} />}
            </CardHeader>
            <CardContent>
              {next ? (
                <div className="space-y-4">
                  <WorkerShiftDetails assignment={next} />
                  {next.status === "confirmed" && (
                    <Button asChild size="lg" className="w-full sm:w-auto">
                      <Link href="/trabajador/fichar/">
                        <MapPinCheck /> Ir a fichar
                      </Link>
                    </Button>
                  )}
                </div>
              ) : (
                <EmptyState title="No tienes turnos próximos" description="Cuando te asignen a un evento lo verás aquí." />
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
