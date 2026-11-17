"use client";
import { useState } from "react";
import { Car, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { assignmentService } from "@/services";
import type { Assignment } from "@/types";
import { errorMessage } from "@/utils/errors";

/** Campo de transporte de una asignación (administración). */
export function TransportEditor({ assignment, onSaved }: { assignment: Assignment; onSaved: () => void }) {
  const [value, setValue] = useState(assignment.transport);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const dirty = value.trim() !== assignment.transport;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await assignmentService.setTransport(assignment, value);
      setSaved(true);
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-2 space-y-1">
      <div className="flex items-center gap-2">
        <Car className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <Input
          aria-label={`Transporte de ${assignment.employeeName}`}
          placeholder="Transporte: p. ej. Berlingo con Sara, directa al cole…"
          className="h-8 text-sm"
          value={value}
          maxLength={200}
          onChange={(e) => {
            setValue(e.target.value);
            setSaved(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && dirty) {
              e.preventDefault();
              void save();
            }
          }}
        />
        {dirty && (
          <Button size="sm" onClick={save} loading={saving}>
            Guardar
          </Button>
        )}
        {!dirty && saved && <Check className="size-4 text-success" aria-label="Guardado" />}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
