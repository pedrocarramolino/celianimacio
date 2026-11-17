"use client";
import Link from "next/link";
import { useState } from "react";
import { Bell, Check, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/layout/states";
import { useAsync } from "@/hooks/use-async";
import { notificationService } from "@/services";
import { NOTIFICATION_TYPE_LABELS } from "@/types";
import { formatDateTime } from "@/utils/dates";
import { errorMessage } from "@/utils/errors";
import { cn } from "@/lib/utils";

export function NotificationList() {
  const list = useAsync(() => notificationService.listMine(), []);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"unread" | "all">("all");

  async function act(fn: () => Promise<void>) {
    setError(null);
    try {
      await fn();
      await list.reload();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  const items = (list.data ?? []).filter((n) => filter === "all" || !n.read);
  const unread = (list.data ?? []).filter((n) => !n.read);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1">
          <Button size="sm" variant={filter === "all" ? "secondary" : "ghost"} onClick={() => setFilter("all")}>
            Todas
          </Button>
          <Button size="sm" variant={filter === "unread" ? "secondary" : "ghost"} onClick={() => setFilter("unread")}>
            Sin leer ({unread.length})
          </Button>
        </div>
        {unread.length > 0 && (
          <Button size="sm" variant="outline" onClick={() => act(async () => { for (const n of unread) await notificationService.markRead(n.id); })}>
            <Check /> Marcar todas como leídas
          </Button>
        )}
      </div>
      {error && <Alert variant="error">{error}</Alert>}
      {list.error && <ErrorState message={list.error} onRetry={list.reload} />}
      {list.loading && !list.data && <LoadingBlock />}
      {list.data && items.length === 0 && <EmptyState icon={Bell} title="No hay notificaciones" />}
      {items.map((n) => (
        <Card key={n.id} className={cn(!n.read && "border-primary/40 bg-primary-soft/30")}>
          <CardContent className="flex flex-col gap-2 pt-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                {!n.read && <span className="size-2 rounded-full bg-primary" aria-label="Sin leer" />}
                <Badge variant="neutral">{NOTIFICATION_TYPE_LABELS[n.type]}</Badge>
                <span className="text-xs text-muted-foreground">{formatDateTime(n.createdAt)}</span>
              </div>
              <p className="font-medium">{n.title}</p>
              {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
              {n.link && (
                <Link href={n.link} className="text-sm text-primary hover:underline" onClick={() => !n.read && void notificationService.markRead(n.id)}>
                  Ver detalle
                </Link>
              )}
            </div>
            <div className="flex shrink-0 gap-1">
              {!n.read && (
                <Button size="sm" variant="ghost" onClick={() => act(() => notificationService.markRead(n.id))}>
                  <Check /> Leída
                </Button>
              )}
              <Button size="icon" variant="ghost" aria-label="Eliminar notificación" onClick={() => act(() => notificationService.remove(n.id))}>
                <Trash2 />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
