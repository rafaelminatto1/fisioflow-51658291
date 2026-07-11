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
        "flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between border-b border-slate-200/50 dark:border-slate-800/50",
        className,
      )}
    >
      <div className="min-w-0 flex-1 pr-6">
        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{label}</p>
        {description && <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}
