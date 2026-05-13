import React from "react";
import { useQuery } from "@tanstack/react-query";
import { request } from "@/api/v2/base";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, ArrowRight, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SimilarPatient {
  patientId: string;
  patientName: string;
  evolutionId: string;
  summary: string;
  sessionDate: string;
  similarity: number;
}

interface SimilarPatientsWidgetProps {
  patientId: string;
}

export const SimilarPatientsWidget: React.FC<SimilarPatientsWidgetProps> = ({ patientId }) => {
  const navigate = useNavigate();
  const { data: similarPatients = [], isLoading } = useQuery({
    queryKey: ["similar-patients", patientId],
    queryFn: async () => {
      const res = await request<{ data: SimilarPatient[] }>(`/api/ai-clinical-search/patients/${patientId}/similar?limit=3`);
      return res.data;
    },
    enabled: !!patientId,
    staleTime: 1000 * 60 * 60, // 1h
  });

  if (isLoading) {
    return <div className="h-40 flex items-center justify-center text-xs text-muted-foreground animate-pulse">Buscando casos clínicos similares...</div>;
  }

  if (similarPatients.length === 0) {
    return null;
  }

  return (
    <Card className="border-none shadow-sm bg-slate-50/50 dark:bg-slate-900/30">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 text-primary">
          <Users className="h-4 w-4" />
          <CardTitle className="text-sm font-bold uppercase tracking-wider">Casos Similares (Benchmarking)</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-slate-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs bg-slate-900 text-white border-slate-800 p-4 rounded-xl shadow-2xl">
                <p className="text-xs leading-relaxed">
                  Utilizamos busca vetorial de alta performance (Neon pgvector) para encontrar correlações entre diagnósticos e evoluções de diferentes pacientes.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <CardDescription className="text-[10px]">
          Pacientes com evolução clínica e diagnósticos correlacionados via IA.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {similarPatients.map((item) => (
          <div 
            key={item.patientId}
            className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:shadow-md transition-all cursor-pointer group"
            onClick={() => navigate(`/pacientes/${item.patientId}`)}
          >
            <div className="flex justify-between items-start mb-1">
              <p className="font-bold text-xs text-slate-700 dark:text-slate-200">{item.patientName}</p>
              <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                {Math.round(item.similarity * 100)}% Match
              </span>
            </div>
            <p className="text-[10px] text-slate-500 line-clamp-2 italic mb-2">
              "{item.summary}"
            </p>
            <div className="flex justify-between items-center">
              <span className="text-[9px] text-slate-400">
                Última: {format(new Date(item.sessionDate), "MMM yyyy", { locale: ptBR })}
              </span>
              <ArrowRight className="h-3 w-3 text-slate-300 group-hover:text-primary transition-colors" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
