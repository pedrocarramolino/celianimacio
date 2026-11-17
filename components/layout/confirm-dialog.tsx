"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { errorMessage } from "@/utils/errors";

/** Diálogo de confirmación con motivo opcional/obligatorio. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive,
  reason,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  reason?: "optional" | "required";
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function confirm() {
    if (reason === "required" && text.trim().length < 3) {
      setError("Indica un motivo.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onConfirm(text.trim());
      setText("");
      onOpenChange(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {error && <Alert variant="error" className="mb-3">{error}</Alert>}
        {reason && (
          <div className="space-y-1.5">
            <Label htmlFor="confirm-reason">Motivo {reason === "optional" ? "(opcional)" : ""}</Label>
            <Textarea id="confirm-reason" rows={3} value={text} onChange={(e) => setText(e.target.value)} maxLength={500} />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Volver
          </Button>
          <Button variant={destructive ? "destructive" : "default"} onClick={confirm} loading={busy}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
