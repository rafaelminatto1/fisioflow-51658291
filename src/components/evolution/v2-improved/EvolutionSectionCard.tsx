import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type EvolutionAccent =
  | "rose"
  | "amber"
  | "emerald"
  | "pink"
  | "blue"
  | "slate"
  | "zinc";

interface AccentClasses {
  bar: string;
  ring: string;
  badge: string;
  icon: string;
}

const accentMap: Record<EvolutionAccent, AccentClasses> = {
  rose: {
    bar: "bg-gradient-to-r from-rose-400 via-rose-500 to-rose-300",
    ring: "ring-rose-200",
    badge: "bg-gradient-to-br from-rose-50 to-rose-100",
    icon: "text-rose-600",
  },
  amber: {
    bar: "bg-gradient-to-r from-amber-400 via-amber-500 to-amber-300",
    ring: "ring-amber-200",
    badge: "bg-gradient-to-br from-amber-50 to-amber-100",
    icon: "text-amber-600",
  },
  emerald: {
    bar: "bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-300",
    ring: "ring-emerald-200",
    badge: "bg-gradient-to-br from-emerald-50 to-emerald-100",
    icon: "text-emerald-600",
  },
  pink: {
    bar: "bg-gradient-to-r from-pink-400 via-pink-500 to-pink-300",
    ring: "ring-pink-200",
    badge: "bg-gradient-to-br from-pink-50 to-pink-100",
    icon: "text-pink-600",
  },
  blue: {
    bar: "bg-gradient-to-r from-blue-400 via-blue-500 to-blue-300",
    ring: "ring-blue-200",
    badge: "bg-gradient-to-br from-blue-50 to-blue-100",
    icon: "text-blue-600",
  },
  slate: {
    bar: "bg-gradient-to-r from-slate-400 via-slate-500 to-slate-300",
    ring: "ring-slate-200",
    badge: "bg-gradient-to-br from-slate-50 to-slate-100",
    icon: "text-slate-600",
  },
  zinc: {
    bar: "bg-gradient-to-r from-zinc-400 via-zinc-500 to-zinc-300",
    ring: "ring-zinc-200",
    badge: "bg-gradient-to-br from-zinc-50 to-zinc-100",
    icon: "text-zinc-600",
  },
};

interface EvolutionSectionCardProps {
  accent: EvolutionAccent;
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  /** When true, removes the inner padding around children (for blocks that manage their own spacing). */
  flushContent?: boolean;
}

export function EvolutionSectionCard({
  accent,
  icon: Icon,
  title,
  subtitle,
  actions,
  badge,
  children,
  className,
  contentClassName,
  flushContent = false,
}: EvolutionSectionCardProps) {
  const colors = accentMap[accent];

  return (
    <section
      className={cn(
        "relative flex flex-col rounded-2xl border border-slate-200/70 bg-white shadow-sm",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-x-0 top-0 h-[3px] rounded-t-2xl pointer-events-none",
          colors.bar,
        )}
      />

      <header className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              "h-9 w-9 shrink-0 rounded-full ring-1 flex items-center justify-center",
              colors.badge,
              colors.ring,
            )}
          >
            <Icon className={cn("h-4 w-4", colors.icon)} />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900 text-sm leading-tight truncate">
              {title}
            </h3>
            {subtitle ? (
              <p className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {(badge || actions) && (
          <div className="flex items-center gap-2 shrink-0">
            {badge}
            {actions}
          </div>
        )}
      </header>

      <div
        className={cn(
          "flex-1 min-h-0",
          flushContent ? "px-0 pb-0" : "px-5 pb-5",
          contentClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}
