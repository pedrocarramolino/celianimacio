import { Baby, Clock, Euro, MapPinned, Package, Phone, Shirt, Warehouse } from "lucide-react";
import { pendingAmount, type CompanyEvent, type EventPrivate } from "@/types";

const eur = (n: number) => n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });

function Row({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className="text-sm">{value}</div>
      </div>
    </div>
  );
}

/** Ficha del evento (formato de la empresa). `priv` solo se pasa en administración. */
export function EventSheetView({ event, priv }: { event: CompanyEvent; priv?: EventPrivate | null }) {
  const s = event.sheet;
  const rows: React.ReactNode[] = [];
  if (s.meetingTime) rows.push(<Row key="nave" icon={Warehouse} label="Hora nave" value={`${s.meetingTime}${s.meetingPlace ? ` · ${s.meetingPlace}` : ""}`} />);
  if (s.startTime) rows.push(<Row key="hora" icon={Clock} label="Hora evento" value={`${s.startTime} a ${s.endTime}`} />);
  if (s.room) rows.push(<Row key="est" icon={MapPinned} label="Estancia" value={s.room} />);
  if (s.kids != null || s.ages) rows.push(<Row key="kids" icon={Baby} label="Niños" value={[s.kids != null ? `${s.kids} niños` : null, s.ages].filter(Boolean).join(" · ")} />);
  if (s.dressCode) rows.push(<Row key="vest" icon={Shirt} label="Vestimenta" value={s.dressCode} />);
  if (s.contactPhone)
    rows.push(
      <Row
        key="tel"
        icon={Phone}
        label="Teléfono"
        value={
          <a href={`tel:${s.contactPhone.replace(/\s/g, "")}`} className="text-primary hover:underline">
            {s.contactPhone}
          </a>
        }
      />,
    );

  const pending = pendingAmount(s);
  const hasPayment = s.totalPrice != null || s.extraHour;

  return (
    <div className="space-y-3">
      {hasPayment && (
        <div className="flex flex-wrap gap-2">
          {s.totalPrice != null && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-sm">
              <Euro className="size-4 text-primary" /> Precio total <strong>{eur(s.totalPrice)}</strong>
            </span>
          )}
          {pending != null && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ${pending > 0 ? "bg-warning-soft text-warning" : "bg-success-soft text-success"}`}
            >
              {pending > 0 ? (
                <>
                  Pendiente de pago <strong>{eur(pending)}</strong>
                </>
              ) : (
                <strong>Pagado</strong>
              )}
            </span>
          )}
          {s.extraHour && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm text-accent-foreground">
              Hora extra <strong>{s.extraHour}</strong>
            </span>
          )}
        </div>
      )}
      {rows.length > 0 && <div className="grid gap-3 sm:grid-cols-2">{rows}</div>}
      {s.material && (
        <Row key="mat" icon={Package} label="Observaciones / material" value={<p className="whitespace-pre-line">{s.material}</p>} />
      )}
      {priv?.adminNotes && (
        <div className="rounded-lg border border-dashed p-3 text-sm">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Notas internas (solo administración)</p>
          <p className="whitespace-pre-line text-muted-foreground">{priv.adminNotes}</p>
        </div>
      )}
      {rows.length === 0 && !s.material && !hasPayment && <p className="text-sm text-muted-foreground">Ficha sin completar. Edítala en “Datos del evento”.</p>}
    </div>
  );
}
