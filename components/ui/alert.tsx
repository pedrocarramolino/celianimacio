import * as React from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const styles = {
  info: { box: "bg-primary-soft text-primary border-primary/15", Icon: Info },
  success: { box: "bg-success-soft text-success border-success/20", Icon: CheckCircle2 },
  warning: { box: "bg-warning-soft text-warning border-warning/20", Icon: TriangleAlert },
  error: { box: "bg-danger-soft text-destructive border-destructive/20", Icon: AlertCircle },
};

export function Alert({
  variant = "info",
  title,
  children,
  className,
}: {
  variant?: keyof typeof styles;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const { box, Icon } = styles[variant];
  return (
    <div role={variant === "error" ? "alert" : "status"} className={cn("flex gap-3 rounded-lg border p-3 text-sm", box, className)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="text-[13px] leading-relaxed opacity-95">{children}</div>}
      </div>
    </div>
  );
}
