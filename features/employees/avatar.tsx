/* eslint-disable @next/next/no-img-element */
import { initials } from "@/utils/format";
import { cn } from "@/lib/utils";

export function Avatar({ name, photoURL, className }: { name: string; photoURL?: string | null; className?: string }) {
  if (photoURL) {
    return <img src={photoURL} alt="" className={cn("size-10 rounded-full object-cover", className)} referrerPolicy="no-referrer" />;
  }
  return (
    <span className={cn("flex size-10 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary", className)} aria-hidden>
      {initials(name) || "?"}
    </span>
  );
}
