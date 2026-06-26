import React from "react";
import { cn } from "@/lib/utils";
import { TrendingDown, TrendingUp, GitCompare } from "lucide-react";
import { PainTrendSparkline, type PainTrendPoint } from "./PainTrendSparkline";

interface ClinicalInsightCardProps {
  trendData: PainTrendPoint[];
  metaPain?: number;
  comparisonData: {
    eva?: { from: number; to: number; improved: boolean };
    rom?: { from: number; to: number; improved: boolean };
  };
}

export const EvolutionInsightCard = React.memo(({ trendData, metaPain, comparisonData }: ClinicalInsightCardProps) => {
  return (
    <div className="rounded-2xl border border-t-[3px] border-border border-t-blue-500 bg-card p-3 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <GitCompare className="h-3.5 w-3.5 text-muted-foreground" />
        <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
          Progresso Clínico
        </h4>
      </div>

      {/* Sparkline Section */}
      <div className="bg-slate-50/50 rounded-xl p-2 border border-border/50">
        <PainTrendSparkline data={trendData} meta={metaPain} heightClass="h-16" />
      </div>

      {/* Comparison Section */}
      <div className="space-y-2">
        {Object.entries(comparisonData).map(([key, value]) => {
          if (!value) return null;
          const isEva = key === 'eva';
          const label = isEva ? "Dor (EVA)" : "ROM";
          
          return (
            <div key={key} className="flex items-center justify-between py-1 text-[12px] font-bold border-b border-border/40 last:border-0">
              <span className="text-muted-foreground font-semibold">{label}</span>
              <span className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold",
                value.improved ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
              )}>
                {value.improved ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                {value.from} → {value.to}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

EvolutionInsightCard.displayName = "EvolutionInsightCard";
