import React from "react";
import { useQuery } from "@tanstack/react-query";
import { requestPublic } from "@/api/v2/base";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Brain, FileText, Dumbbell, ArrowRight } from "lucide-react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";

interface SemanticRecommenderWidgetProps {
  condition: string;
}

export const SemanticRecommenderWidget: React.FC<SemanticRecommenderWidgetProps> = ({ condition }) => {
  const { data, isLoading } = useQuery({
    queryKey: ["semantic-recommendations", condition],
    queryFn: () => requestPublic<{ recommendations: { protocols: any[], exercises: any[] } }>(
      `/api/ai-search/recommend?condition=${encodeURIComponent(condition)}`
    ),
    enabled: !!condition && condition.length > 3,
    staleTime: 1000 * 60 * 60, // 1h
  });

  if (!condition || condition === "Não informada") {
    return null;
  }

  if (isLoading) {
    return <LoadingSkeleton type="card" />;
  }

  const protocols = data?.recommendations?.protocols || [];
  const exercises = data?.recommendations?.exercises || [];

  if (protocols.length === 0 && exercises.length === 0) {
    return null;
  }

  return (
    <Card className="border-none shadow-premium bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-slate-900">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
              Inteligência Clínica Ativa
            </CardTitle>
            <CardDescription className="text-xs font-bold text-slate-500">
              Recomendações baseadas em: <span className="text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">{condition}</span>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        {/* Protocolos */}
        {protocols.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <FileText className="h-3 w-3" /> Wiki & Protocolos
            </h4>
            <div className="grid gap-2">
              {protocols.slice(0, 3).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:border-indigo-200 transition-colors cursor-pointer group">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="font-bold text-sm text-slate-700 dark:text-slate-200 truncate group-hover:text-indigo-600 transition-colors">{p.title}</p>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">{p.category}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Exercícios */}
        {exercises.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Dumbbell className="h-3 w-3" /> Exercícios Sugeridos
            </h4>
            <div className="grid gap-2">
              {exercises.slice(0, 3).map((e: any) => (
                <div key={e.id} className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:border-indigo-200 transition-colors cursor-pointer group">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="font-bold text-sm text-slate-700 dark:text-slate-200 truncate group-hover:text-indigo-600 transition-colors">{e.name}</p>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">{e.category || "Geral"}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
