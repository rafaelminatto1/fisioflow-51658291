import type React from "react";
import { cn } from "@/lib/utils";

interface StandardCardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  icon?: React.ElementType;
  actions?: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
  variant?: "default" | "glass" | "outline" | "ghost";
}

export const StandardCard: React.FC<StandardCardProps> = ({
  children,
  title,
  subtitle,
  icon: Icon,
  actions,
  className,
  footer,
  variant = "default",
}) => {
  return (
    <div
      className={cn(
        "bento-card flex flex-col gap-4",
        variant === "glass" && "glass-card border-border",
        variant === "outline" && "bg-transparent border-border shadow-none",
        variant === "ghost" && "bg-transparent border-none shadow-none p-0",
        className,
      )}
    >
      {(title || Icon || actions) && (
        <div className="flex items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="p-2 rounded-xl bg-primary/5 text-primary">
                <Icon className="w-5 h-5" />
              </div>
            )}
            <div>
              {title && (
                <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-sm leading-none">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      <div className="flex-1">{children}</div>

      {footer && <div className="mt-auto pt-4 border-t border-border/40">{footer}</div>}
    </div>
  );
};
