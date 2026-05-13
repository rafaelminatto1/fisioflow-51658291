import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { request } from "@/api/v2/base";
import { CheckCircle2, History, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface DigitalTwinData {
  adherence_score: string;
  ai_risk_level: "low" | "medium" | "high";
  predicted_recovery_weeks: number;
  confidence_score: string;
  last_ai_assessment_at: string;
}

interface RecoveryTrajectoryWidgetProps {
  patientId: string;
}

export const RecoveryTrajectoryWidget: React.FC<RecoveryTrajectoryWidgetProps> = ({ patientId }) => {
  const { data: twinResponse, isLoading } = useQuery({
    queryKey: ["patient-digital-twin", patientId],
    queryFn: () => request<{ data: DigitalTwinData }>(`/api/clinic-metrics/patients/${patientId}/digital-twin`),
    enabled: !!patientId,
    staleTime: 1000 * 60 * 60, // 1h
  });

  if (isLoading) {
    return <div className="h-32 flex items-center justify-center text-xs text-muted-foreground animate-pulse">Analizando trajetória clínica...</div>;
  }

  const data = twinResponse?.data;
  if (!data) return null;

  const adherence = parseFloat(data.adherence_score);
  const confidence = parseFloat(data.confidence_score);

  return (
    <Card className="border-none shadow-premium bg-gradient-to-br from-slate-900 to-indigo-950 text-white overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-indigo-400" />
            <CardTitle className="text-sm font-black uppercase tracking-widest">Trajetória Preditiva (Gêmeo Digital)</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-slate-500 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs bg-slate-900 text-white border-slate-800 p-4 rounded-xl shadow-2xl">
                  <p className="text-xs leading-relaxed">
                    A IA analisa a aderência, evolução da dor e dados de wearables para prever o tempo de recuperação baseado em protocolos de evidência científica.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className={cn(
            "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter",
            data.ai_risk_level === "high" ? "bg-red-500" : (data.ai_risk_level === "medium" ? "bg-amber-500" : "bg-emerald-500")
          )}>
            Risco: {data.ai_risk_level}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Previsão de Alta</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black">{data.predicted_recovery_weeks}</span>
              <span className="text-xs font-bold text-slate-400">semanas</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Confiança IA</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black">{Math.round(confidence)}%</span>
            </div>
          </div>
        </div>

        {/* Barra de Aderência */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[10px] font-bold uppercase">
            <span className="text-slate-400">Aderência Clínica</span>
            <span className={adherence > 80 ? "text-emerald-400" : "text-amber-400"}>{adherence.toFixed(1)}%</span>
          </div>
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full transition-all duration-1000",
                adherence > 80 ? "bg-emerald-500" : "bg-amber-500"
              )} 
              style={{ width: `${adherence}%` }} 
            />
          </div>
        </div>

        <p className="text-[9px] text-slate-500 italic mt-2">
          * Baseado em 500+ casos similares e métricas de wearables.
        </p>
      </CardContent>
    </Card>
  );
};
