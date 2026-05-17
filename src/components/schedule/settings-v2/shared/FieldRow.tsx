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
    <div className={cn("flex items-center justify-between gap-4 py-3 border-b border-slate-100 dark:border-slate-800 last:border-b-0", className)}>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}
