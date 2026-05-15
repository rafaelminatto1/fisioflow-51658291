import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { request } from "@/api/v2/base";
import { Sparkles, Trophy, Target, ShieldAlert, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AISnapshotData {
  mainStatus: string;
  keyWins: string[];
  remainingChallenges: string[];
  clinicalRisk: "low" | "medium" | "high";
}

interface ClinicalAISnapshotProps {
  patientId: string;
}

export const ClinicalAISnapshot: React.FC<ClinicalAISnapshotProps> = ({ patientId }) => {
  const { data: snapshotRes, isLoading } = useQuery({
    queryKey: ["clinical-ai-snapshot", patientId],
    queryFn: () =>
      request<{ data: AISnapshotData }>(`/api/clinic-metrics/patients/${patientId}/ai-snapshot`),
    enabled: !!patientId,
    staleTime: 1000 * 60 * 15, // 15 mins
  });

  if (isLoading) {
    return (
      <Card className="border-none shadow-sm bg-slate-50/50 dark:bg-slate-900/30">
        <CardContent className="h-40 flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 text-indigo-500 animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Sintetizando histórico clínico...
          </p>
        </CardContent>
      </Card>
    );
  }

  const data = snapshotRes?.data;
  if (!data || !data.mainStatus) return null;

  return (
    <Card className="border-none shadow-premium bg-white dark:bg-slate-950 overflow-hidden group">
      <div
        className={cn(
          "h-1.5 w-full",
          data.clinicalRisk === "high"
            ? "bg-red-500"
            : data.clinicalRisk === "medium"
              ? "bg-amber-500"
              : "bg-emerald-500",
        )}
      />
      <CardHeader className="pb-3 pt-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-black uppercase tracking-widest">
              Resumo Executivo (IA)
            </CardTitle>
            <CardDescription className="text-xs font-bold text-slate-500 mt-1">
              Visão consolidada das últimas 10 sessões
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-relaxed">
          "{data.mainStatus}"
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Ganhos */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-2">
              <Trophy className="h-3 w-3" /> Evolução Positiva
            </h4>
            <ul className="space-y-2">
              {data.keyWins.map((win, i) => (
                <li key={i} className="text-xs font-medium text-slate-500 flex gap-2">
                  <span className="text-emerald-500">•</span> {win}
                </li>
              ))}
            </ul>
          </div>

          {/* Desafios */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-600 flex items-center gap-2">
              <Target className="h-3 w-3" /> Foco de Atenção
            </h4>
            <ul className="space-y-2">
              {data.remainingChallenges.map((challenge, i) => (
                <li key={i} className="text-xs font-medium text-slate-500 flex gap-2">
                  <span className="text-amber-500">•</span> {challenge}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {data.clinicalRisk === "high" && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 flex items-center gap-3">
            <ShieldAlert className="h-4 w-4 text-red-600" />
            <p className="text-[10px] font-black uppercase text-red-700 dark:text-red-400">
              Risco clínico elevado detectado pela IA
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
