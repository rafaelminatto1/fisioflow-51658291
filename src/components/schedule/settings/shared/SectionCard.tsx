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
  action,
  children,
  className,
}: SectionCardProps) {
  return (
    <section className={cn("py-4 mb-8", className)}>
      <header className="mb-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-slate-50 md:text-5xl">
            {title}
          </h2>
          {description && (
            <p className="mt-3 max-w-lg text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
              {description}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className="space-y-6">{children}</div>
    </section>
  );
}
