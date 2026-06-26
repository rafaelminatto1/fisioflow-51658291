import React from "react";
import { Activity } from "lucide-react";
import { PainTrendSparkline, type PainTrendPoint } from "./PainTrendSparkline";

interface ClinicalInsightCardProps {
  trendData: PainTrendPoint[];
  metaPain?: number;
  currentLevel?: number;
}

export const EvolutionInsightCard = React.memo(({ trendData, metaPain, currentLevel }: ClinicalInsightCardProps) => {
  return (
    <div className="space-y-3 rounded-2xl border border-t-[3px] border-border border-t-blue-500 bg-card px-3 py-2.5 shadow-sm">
      <div className="flex items-center gap-2">
        <Activity className="h-3.5 w-3.5 text-muted-foreground" />
        <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
          Tendência da dor
        </h4>
        {typeof currentLevel === "number" && (
          <span className="ml-auto text-sm font-black text-slate-800">{currentLevel}/10</span>
        )}
      </div>

      <div className="rounded-xl border border-border/50 bg-slate-50/50 p-2">
        <PainTrendSparkline data={trendData} meta={metaPain} heightClass="h-14" />
      </div>
    </div>
  );
});

EvolutionInsightCard.displayName = "EvolutionInsightCard";
