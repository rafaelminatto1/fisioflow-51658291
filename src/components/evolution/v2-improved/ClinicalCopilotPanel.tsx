import React from "react";
import { Sparkles, AlertTriangle, Info, Lightbulb, Loader2, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CopilotInsight {
  type: "warning" | "suggestion" | "info";
  message: string;
  source?: string;
  actionPayload?: any;
}

interface ClinicalCopilotPanelProps {
  insights: CopilotInsight[];
  isAnalyzing: boolean;
  onAction?: (actionPayload: any) => void;
}

export function ClinicalCopilotPanel({
  insights,
  isAnalyzing,
  onAction,
}: ClinicalCopilotPanelProps) {
  if (!isAnalyzing && insights.length === 0) return null;

  return (
    <div className="mt-3 border rounded-xl bg-slate-50/50 p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
        <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
        Clinical Copilot
        {isAnalyzing && <Loader2 className="h-3 w-3 animate-spin text-slate-400 ml-1" />}
      </div>

      <div className="space-y-2">
        {insights.map((insight, idx) => {
          let Icon = Info;
          let colorClass = "text-blue-600 bg-blue-50 border-blue-100";

          if (insight.type === "warning") {
            Icon = AlertTriangle;
            colorClass = "text-amber-600 bg-amber-50 border-amber-100";
          } else if (insight.type === "suggestion") {
            Icon = Lightbulb;
            colorClass = "text-emerald-600 bg-emerald-50 border-emerald-100";
          }

          return (
            <div
              key={idx}
              className={`flex items-start gap-2 p-2.5 rounded-lg border text-xs ${colorClass}`}
            >
              <Icon className="h-4 w-4 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-medium">{insight.message}</p>
                {insight.source && (
                  <p className="text-[10px] mt-1 opacity-80 font-semibold italic">
                    Fonte: {insight.source}
                  </p>
                )}
              </div>
              {insight.actionPayload && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[10px] shrink-0 bg-white/50 hover:bg-white"
                  onClick={() => onAction && onAction(insight.actionPayload)}
                >
                  <PlusCircle className="h-3 w-3 mr-1" />
                  Adicionar
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
