import { Check, HelpCircle, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { WORKER_RESPONSE_LABELS, type WorkerResponse } from "@/types";

export function ResponseBadge({ response }: { response: WorkerResponse }) {
  if (response === "accepted")
    return (
      <Badge variant="success">
        <Check className="size-3" /> {WORKER_RESPONSE_LABELS.accepted}
      </Badge>
    );
  if (response === "declined")
    return (
      <Badge variant="danger">
        <X className="size-3" /> {WORKER_RESPONSE_LABELS.declined}
      </Badge>
    );
  return (
    <Badge variant="neutral">
      <HelpCircle className="size-3" /> {WORKER_RESPONSE_LABELS.pending}
    </Badge>
  );
}
