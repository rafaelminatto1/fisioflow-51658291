import React, { memo } from "react";
import { BadgeCheck, TrendingUp, Info } from "lucide-react";

interface ScheduleHeaderProps {
  displayName?: string;
  consultasRestantes?: number;
  completedCount?: number;
  totalCount?: number;
  confirmationRate?: number;
}

export const ScheduleHeader = memo(
  ({
    displayName = "Dr. Rafael",
    consultasRestantes = 0,
    completedCount = 0,
    totalCount = 0,
    confirmationRate = 0,
  }: ScheduleHeaderProps) => {
    return (
      <div className="relative rounded-3xl overflow-hidden mb-6 group shrink-0 border border-border shadow-sm">
        {/* Main Content Area — superfície sólida azul Activity */}
        <div className="relative z-10 bg-primary p-8 flex flex-col md:flex-row items-end justify-between gap-6">
          {/* Welcome Section */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 rounded-full bg-[hsl(211_100%_40%)] text-white text-xs font-semibold tracking-wide">
                CLINIC OVERVIEW
              </span>
            </div>
            <h2 className="text-3xl font-bold text-white tracking-tight mb-1">
              Olá, {displayName}
            </h2>
            <p className="text-white/90 font-light">
              Você tem{" "}
              <span className="font-semibold text-white">{consultasRestantes} consultas</span> hoje.
            </p>
          </div>

          {/* Stats Cards — brancos sólidos */}
          <div className="flex gap-4 w-full md:w-auto">
            {/* Completed Card */}
            <div className="rounded-2xl p-4 min-w-[150px] flex flex-col justify-between cursor-pointer group/card bg-card border border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <BadgeCheck className="text-primary w-5 h-5" />
                <span className="text-[10px] font-bold bg-secondary px-2 py-1 rounded-full text-secondary-foreground">
                  +12%
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-foreground">
                  {completedCount}
                  <span className="text-muted-foreground text-lg font-normal">/{totalCount}</span>
                </h3>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  Completados
                </p>
              </div>
            </div>

            {/* Confirmation Rate Card */}
            <div className="rounded-2xl p-4 min-w-[150px] flex flex-col justify-between cursor-pointer group/card bg-card border border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <TrendingUp className="text-primary w-5 h-5" />
                <span className="text-[10px] font-bold bg-secondary px-2 py-1 rounded-full text-secondary-foreground">
                  ~5%
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-foreground">{confirmationRate}%</h3>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  Confirmação
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Status Bar — azul Activity escuro sólido */}
        <div className="relative z-10 bg-[hsl(211_100%_42%)] px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6 text-xs font-medium text-white/90">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Ultrassom <span className="opacity-70 font-light ml-1">Disponível</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Laser Co2 <span className="opacity-70 font-light ml-1">Em manutenção</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-300" />
              Tens <span className="opacity-70 font-light ml-1">Em uso (15m)</span>
            </div>
          </div>
          <button className="text-xs text-white/80 hover:text-white flex items-center gap-1 transition-colors">
            Gerenciar
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  },
);

ScheduleHeader.displayName = "ScheduleHeader";
