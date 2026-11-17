"use client";
import { useState } from "react";
import { Download, Printer } from "lucide-react";
import { PageHeader, StatCard } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { SegmentedTabs } from "@/components/ui/tabs";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/layout/states";
import { AttendanceStatusBadge } from "@/components/layout/status-badges";
import { useAsync } from "@/hooks/use-async";
import { reportService } from "@/services";
import type { HoursRow } from "@/services/domain/reports";
import { INCIDENT_LABELS, type AttendanceSession } from "@/types";
import { addDaysISO, formatDateTime, formatISODate, formatMinutes, isISODate, todayISO } from "@/utils/dates";
import { downloadTextFile } from "@/utils/csv";
import { AlertTriangle, CalendarRange, Clock, FileWarning } from "lucide-react";

type Tab = "employee" | "event" | "day" | "incomplete" | "incidents";

function monthStart(iso: string) {
  return `${iso.slice(0, 7)}-01`;
}

export default function ReportsPage() {
  const today = todayISO();
  const [from, setFrom] = useState(monthStart(today));
  const [to, setTo] = useState(today);
  const [tab, setTab] = useState<Tab>("employee");
  const valid = isISODate(from) && isISODate(to) && from <= to && from >= addDaysISO(to, -366);
  const report = useAsync(() => reportService.build(from, to), [from, to], valid);
  const suffix = `${from}_${to}`;

  const exportCsv = () => {
    if (!report.data) return;
    const d = report.data;
    const map: Record<Tab, () => [string, string]> = {
      employee: () => [`horas-por-trabajador_${suffix}.csv`, reportService.summaryCsv(d.byEmployee, "Trabajador")],
      event: () => [`horas-por-evento_${suffix}.csv`, reportService.summaryCsv(d.byEvent, "Evento")],
      day: () => [`horas-por-dia_${suffix}.csv`, reportService.summaryCsv(d.byDay, "Día")],
      incomplete: () => [`fichajes-incompletos_${suffix}.csv`, reportService.detailCsv(d.incomplete)],
      incidents: () => [`incidencias_${suffix}.csv`, reportService.detailCsv(d.withIncidents)],
    };
    const [name, content] = map[tab]();
    downloadTextFile(name, content);
  };

  return (
    <>
      <PageHeader
        title="Informes"
        description="Horas por trabajador, evento y periodo a partir de los fichajes registrados."
        actions={
          <div className="no-print flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => report.data && downloadTextFile(`fichajes-detalle_${suffix}.csv`, reportService.detailCsv(report.data.sessions))} disabled={!report.data}>
              <Download /> CSV detalle
            </Button>
            <Button variant="outline" onClick={exportCsv} disabled={!report.data}>
              <Download /> CSV de esta vista
            </Button>
            <Button variant="outline" onClick={() => window.print()} disabled={!report.data} title="Usa 'Guardar como PDF' en el diálogo de impresión">
              <Printer /> Imprimir / PDF
            </Button>
          </div>
        }
      />
      <Card className="no-print mb-4">
        <CardContent className="grid grid-cols-2 gap-3 pt-5 sm:flex sm:items-end">
          <div className="min-w-0 space-y-1.5">
            <Label htmlFor="from">Desde</Label>
            <Input id="from" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="min-w-0 space-y-1.5">
            <Label htmlFor="to">Hasta</Label>
            <Input id="to" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="col-span-2 flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setFrom(addDaysISO(today, -6)); setTo(today); }}>Últimos 7 días</Button>
            <Button variant="ghost" size="sm" onClick={() => { setFrom(monthStart(today)); setTo(today); }}>Este mes</Button>
          </div>
        </CardContent>
      </Card>
      {!valid && <Alert variant="error">Elige un rango válido (máximo un año).</Alert>}
      <p className="mb-3 hidden text-sm print:block">
        Periodo: {formatISODate(from)} – {formatISODate(to)}
      </p>
      {report.error && <ErrorState message={report.error} onRetry={report.reload} />}
      {valid && report.loading && !report.data && <LoadingBlock rows={4} />}
      {report.data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Horas netas" value={formatMinutes(report.data.totals.workedMinutes)} icon={Clock} />
            <StatCard label="Jornadas" value={report.data.totals.sessions} icon={CalendarRange} />
            <StatCard label="Incompletas" value={report.data.incomplete.length} icon={FileWarning} tone={report.data.incomplete.length ? "warning" : "success"} />
            <StatCard label="Con incidencias" value={report.data.withIncidents.length} icon={AlertTriangle} tone={report.data.withIncidents.length ? "danger" : "success"} />
          </div>
          <SegmentedTabs
            className="no-print"
            label="Tipo de informe"
            value={tab}
            onChange={setTab}
            options={[
              { value: "employee", label: "Por trabajador" },
              { value: "event", label: "Por evento" },
              { value: "day", label: "Por día" },
              { value: "incomplete", label: "Incompletos" },
              { value: "incidents", label: "Incidencias" },
            ]}
          />
          {tab === "employee" && <HoursTable title="Horas por trabajador" label="Trabajador" rows={report.data.byEmployee} />}
          {tab === "event" && <HoursTable title="Horas por evento" label="Evento" rows={report.data.byEvent} />}
          {tab === "day" && <HoursTable title="Horas por día" label="Día" rows={report.data.byDay} formatLabel={(l) => formatISODate(l, { weekday: "short" })} />}
          {tab === "incomplete" && <SessionsTable title="Fichajes incompletos" sessions={report.data.incomplete} />}
          {tab === "incidents" && <SessionsTable title="Incidencias" sessions={report.data.withIncidents} />}
          <p className="text-xs text-muted-foreground">
            Las horas proceden de los fichajes (hora de servidor). Las jornadas sin salida no suman horas hasta que se cierran.
          </p>
        </div>
      )}
    </>
  );
}

function HoursTable({ title, label, rows, formatLabel }: { title: string; label: string; rows: HoursRow[]; formatLabel?: (l: string) => string }) {
  return (
    <Card className="print-break">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState title="Sin datos en el periodo" />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>{label}</TH>
                <TH>Jornadas</TH>
                <TH>Horas netas</TH>
                <TH>Pausas</TH>
                <TH>Incompletas</TH>
                <TH>Incidencias</TH>
              </tr>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR key={r.key}>
                  <TD className="font-medium">{formatLabel ? formatLabel(r.label) : r.label}</TD>
                  <TD>{r.sessions}</TD>
                  <TD className="whitespace-nowrap">{formatMinutes(r.workedMinutes)}</TD>
                  <TD className="whitespace-nowrap">{formatMinutes(r.breakMinutes)}</TD>
                  <TD>{r.incomplete}</TD>
                  <TD>{r.incidents}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function SessionsTable({ title, sessions }: { title: string; sessions: AttendanceSession[] }) {
  return (
    <Card className="print-break">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <EmptyState title="Nada que mostrar" />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Trabajador</TH>
                <TH>Evento / turno</TH>
                <TH>Entrada</TH>
                <TH>Salida</TH>
                <TH>Estado</TH>
                <TH>Incidencias</TH>
              </tr>
            </THead>
            <TBody>
              {sessions.map((s) => (
                <TR key={s.id}>
                  <TD className="font-medium">{s.employeeName}</TD>
                  <TD>
                    {s.eventName}
                    <span className="block text-xs text-muted-foreground">{s.shiftName}</span>
                  </TD>
                  <TD className="whitespace-nowrap">{formatDateTime(s.checkIn.serverAt ?? s.checkIn.clientAt)}</TD>
                  <TD className="whitespace-nowrap">{formatDateTime(s.checkOut?.serverAt ?? s.checkOut?.clientAt)}</TD>
                  <TD>
                    <AttendanceStatusBadge status={s.status} />
                  </TD>
                  <TD className="text-xs">{s.incidents.map((i) => INCIDENT_LABELS[i.type]).join(", ") || "—"}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
