"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus, Search, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/layout/states";
import { Avatar } from "@/features/employees/avatar";
import { useAsync } from "@/hooks/use-async";
import { employeeService } from "@/services";
import { employeeFullName, EMPLOYEE_STATUS_LABELS } from "@/types";
import { formatISODate } from "@/utils/dates";

export default function EmployeesPage() {
  const { data, error, loading, reload } = useAsync(() => employeeService.list(), []);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("active");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data ?? []).filter(
      (e) =>
        (status === "all" || e.status === status) &&
        (!term || `${employeeFullName(e)} ${e.email} ${e.position}`.toLowerCase().includes(term)),
    );
  }, [data, q, status]);

  return (
    <>
      <PageHeader
        title="Trabajadores"
        description="Fichas del personal, accesos e historial."
        actions={
          <Button asChild>
            <Link href="/admin/trabajadores/nuevo/">
              <Plus /> Nuevo trabajador
            </Link>
          </Button>
        }
      />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Buscar" placeholder="Buscar por nombre, correo o puesto" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select aria-label="Estado" className="sm:w-44" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
          <option value="all">Todos</option>
        </Select>
      </div>
      {error && <ErrorState message={error} onRetry={reload} />}
      {loading && !data && <LoadingBlock />}
      {data && filtered.length === 0 && (
        <EmptyState
          icon={Users}
          title={data.length === 0 ? "Aún no hay trabajadores" : "Sin resultados"}
          description={data.length === 0 ? "Crea la primera ficha e invita al trabajador a activar su acceso." : undefined}
        />
      )}
      {filtered.length > 0 && (
        <Card>
          <Table>
            <THead>
              <tr>
                <TH>Trabajador</TH>
                <TH className="hidden md:table-cell">Puesto</TH>
                <TH className="hidden md:table-cell">Teléfono</TH>
                <TH className="hidden lg:table-cell">Incorporación</TH>
                <TH>Acceso</TH>
                <TH>Estado</TH>
              </tr>
            </THead>
            <TBody>
              {filtered.map((e) => (
                <TR key={e.id}>
                  <TD>
                    <Link href={`/admin/trabajadores/ficha/?id=${e.id}`} className="flex items-center gap-3 hover:text-primary">
                      <Avatar name={employeeFullName(e)} photoURL={e.photoURL} />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{employeeFullName(e)}</p>
                        <p className="truncate text-xs text-muted-foreground">{e.email}</p>
                      </div>
                    </Link>
                  </TD>
                  <TD className="hidden md:table-cell">{e.position || "—"}</TD>
                  <TD className="hidden md:table-cell">{e.phone || "—"}</TD>
                  <TD className="hidden lg:table-cell">{formatISODate(e.hireDate)}</TD>
                  <TD>{e.userId ? <Badge variant="success">Activada</Badge> : <Badge variant="neutral">Sin activar</Badge>}</TD>
                  <TD>
                    <Badge variant={e.status === "active" ? "default" : "neutral"}>{EMPLOYEE_STATUS_LABELS[e.status]}</Badge>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      )}
    </>
  );
}
