import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FieldRowProps {
  label: string;
  description?: string;
  control: ReactNode;
  className?: string;
}

export function FieldRow({ label, description, control, className }: FieldRowProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between border-b border-border/40 last:border-0",
        className,
      )}
    >
      <div className="min-w-0 flex-1 pr-6">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{label}</p>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}
