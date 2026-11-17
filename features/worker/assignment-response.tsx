"use client";
import { useState } from "react";
import { Car, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { assignmentService } from "@/services";
import type { Assignment, WorkerResponse } from "@/types";
import { errorMessage } from "@/utils/errors";
import { cn } from "@/lib/utils";

/** Transporte asignado y respuesta Sí/No del trabajador. */
export function AssignmentResponse({ assignment }: { assignment: Assignment }) {
  const [response, setResponse] = useState<WorkerResponse>(assignment.workerResponse);
  const [busy, setBusy] = useState<"accepted" | "declined" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const finished = assignment.shiftEndAt.getTime() < Date.now();

  async function answer(r: "accepted" | "declined") {
    setBusy(r);
    setError(null);
    try {
      await assignmentService.respond(assignment, r);
      setResponse(r);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      {assignment.transport && (
        <div className="flex items-start gap-2 rounded-lg bg-accent/60 p-3 text-sm">
          <Car className="mt-0.5 size-4 shrink-0 text-accent-foreground" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-accent-foreground">Transporte</p>
            <p>{assignment.transport}</p>
          </div>
        </div>
      )}
      {!finished && assignment.status !== "cancelled" && (
        <div className="rounded-lg border p-3">
          <p className="mb-2 text-sm font-medium">
            {response === "pending" ? "¿Puedes ir a este evento?" : response === "accepted" ? "Has confirmado que vas ✅" : "Has indicado que no puedes ir ❌"}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={response === "accepted" ? "default" : "outline"}
              className={cn(response === "accepted" && "bg-success hover:bg-success/90")}
              loading={busy === "accepted"}
              disabled={busy !== null}
              aria-pressed={response === "accepted"}
              onClick={() => response !== "accepted" && answer("accepted")}
            >
              <Check /> Sí, voy
            </Button>
            <Button
              variant={response === "declined" ? "destructive" : "outline"}
              loading={busy === "declined"}
              disabled={busy !== null}
              aria-pressed={response === "declined"}
              onClick={() => response !== "declined" && answer("declined")}
            >
              <X /> No puedo
            </Button>
          </div>
          {response !== "pending" && <p className="mt-2 text-xs text-muted-foreground">Puedes cambiar tu respuesta. Se avisa a la coordinación.</p>}
        </div>
      )}
      {error && <Alert variant="error">{error}</Alert>}
    </div>
  );
}
