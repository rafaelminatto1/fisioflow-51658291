import type React from "react";
import { cn } from "@/lib/utils";
import { PageBreadcrumbs } from "@/components/ui/page-breadcrumbs";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ElementType;
  actions?: React.ReactNode;
  breadcrumbs?: boolean;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  icon: Icon,
  actions,
  breadcrumbs = true,
  className,
}) => {
  return (
    <div className={cn("flex flex-col gap-4 mb-8 animate-fade-in", className)}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          {breadcrumbs && (
            <div className="mb-2">
              <PageBreadcrumbs />
            </div>
          )}
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shadow-inner-border">
                <Icon className="w-6 h-6" />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                {title}
              </h1>
              {subtitle && <p className="text-sm text-muted-foreground font-medium">{subtitle}</p>}
            </div>
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-3 self-end md:self-center">{actions}</div>
        )}
      </div>

      <div className="h-px w-full bg-gradient-to-r from-primary/20 via-transparent to-transparent" />
    </div>
  );
};
