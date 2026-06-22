import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SectionCard({
  title,
  description,
  icon,
  action,
  children,
  className,
}: SectionCardProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <div className="flex items-start gap-3 min-w-0">
          {icon && (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}
