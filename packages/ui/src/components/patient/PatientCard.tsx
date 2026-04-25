import React from "react";
import { MotionCard } from "../MotionCard";
import { Activity, Clock, MessageCircle, Calendar, ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";

export interface PatientCardProps {
  name: string;
  condition?: React.ReactNode;
  status: string;
  lastVisit?: string;
  avatarUrl?: string;
  onClick?: () => void;
  actions?: React.ReactNode;
  stats?: {
    sessionsCompleted: number;
    totalSessions?: number;
    nextAppointment?: string;
    progress?: number;
  };
  variant?: "default" | "compact";
  className?: string;
}

export const PatientCard = React.forwardRef<HTMLDivElement, PatientCardProps>(
  (
    {
      name,
      condition,
      status,
      lastVisit: _lastVisit,
      onClick,
      actions,
      stats,
      variant = "default",
      className,
    },
    ref,
  ) => {
    const statusColors: Record<string, string> = {
      "Em Tratamento":
        "bg-green-500/10 text-green-700 border-green-200 dark:text-green-400 dark:border-green-800",
      Alta: "bg-blue-500/10 text-blue-700 border-blue-200 dark:text-blue-400 dark:border-blue-800",
      Inativo:
        "bg-gray-500/10 text-gray-700 border-gray-200 dark:text-gray-400 dark:border-gray-800",
      Inicial:
        "bg-purple-500/10 text-purple-700 border-purple-200 dark:text-purple-400 dark:border-purple-800",
      Risco:
        "bg-orange-500/10 text-orange-700 border-orange-200 dark:text-orange-400 dark:border-orange-800",
    };

    const statusStyle = statusColors[status] || "bg-secondary text-secondary-foreground";
    const progressValue =
      stats?.progress ??
      (stats?.totalSessions ? (stats.sessionsCompleted / stats.totalSessions) * 100 : 0);

    return (
      <MotionCard
        ref={ref}
        variant="glass"
        hoverEffect={true}
        onClick={onClick}
        className={cn(
          "group relative overflow-hidden transition-all duration-300",
          "card-premium-hover border-border/40 backdrop-blur-md",
          variant === "compact" ? "p-3" : "p-5",
          className,
        )}
      >
        {/* Progress Background Hint */}
        {progressValue > 0 && (
          <div
            className="absolute bottom-0 left-0 h-1 bg-primary/20 transition-all duration-1000"
            style={{ width: `${progressValue}%` }}
          />
        )}

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="relative">
              <div
                className={cn(
                  "h-14 w-14 rounded-2xl flex items-center justify-center font-bold text-xl transition-transform duration-500 group-hover:scale-110",
                  "bg-gradient-to-br from-primary/20 to-primary/5 text-primary shadow-inner",
                )}
              >
                {name.charAt(0).toUpperCase()}
              </div>
              <div
                className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-background bg-green-500"
                title="Online"
              />
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-lg tracking-tight group-hover:text-primary transition-colors flex items-center gap-2">
                {name}
                <ChevronRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </h3>

              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border font-bold",
                    statusStyle,
                  )}
                >
                  {status}
                </span>
                {typeof condition === "string" ? (
                  <span className="text-xs text-muted-foreground font-medium line-clamp-1">
                    {condition}
                  </span>
                ) : (
                  condition
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
            {actions}
          </div>
        </div>

        {stats && (
          <div className="mt-5 space-y-3">
            {/* Progress Bar */}
            {stats.totalSessions && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">
                  <span>Progresso do Tratamento</span>
                  <span>{Math.round(progressValue)}%</span>
                </div>
                <div className="h-1.5 w-full bg-secondary/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${progressValue}%` }}
                  />
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-border/40 grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                <div className="h-7 w-7 rounded-lg bg-secondary/50 flex items-center justify-center">
                  <Activity className="h-3.5 w-3.5 text-primary" />
                </div>
                <span>{stats.sessionsCompleted} sessões</span>
              </div>

              {stats.nextAppointment ? (
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  <div className="h-7 w-7 rounded-lg bg-secondary/50 flex items-center justify-center">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="line-clamp-1">{stats.nextAppointment}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground/60 italic">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Sem agendamento</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Quick Access (Bottom right glow) */}
        <div className="absolute top-0 right-0 h-24 w-24 bg-primary/5 blur-3xl -z-10 group-hover:bg-primary/10 transition-colors" />
      </MotionCard>
    );
  },
);

PatientCard.displayName = "PatientCard";
