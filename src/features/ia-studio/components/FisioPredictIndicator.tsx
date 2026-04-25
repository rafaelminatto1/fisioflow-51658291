import React from "react";
import { useQuery } from "@tanstack/react-query";
import { iaStudioApi } from "@/api/v2";
import { TrendingUp, Calendar, Target, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

export const FisioPredictIndicator: React.FC<{ patientId: string }> = ({ patientId }) => {
  const { data, isLoading } = useQuery({
    queryKey: ["ia-studio", "predict", patientId],
    queryFn: () => iaStudioApi.getDischargePrediction(patientId),
    enabled: !!patientId,
  });

  if (isLoading) return <Skeleton className="h-40 w-full rounded-3xl" />;
  if (!data?.data) return null;

  const p = data.data;

  return (
    <Card className="border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 rounded-[32px] overflow-hidden">
      <CardContent className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20 text-white">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">FisioPredict</h3>
              <p className="text-[10px] text-amber-600 uppercase font-black tracking-widest flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 fill-amber-600" /> IA Early Discharge Estimate
              </p>
            </div>
          </div>
          <Badge className="bg-emerald-500/10 text-emerald-600 border-none px-3 py-1 rounded-full text-xs font-bold">
            {Math.round(p.confidence * 100)}% de Precisão
          </Badge>
        </div>

        <div className="space-y-6">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                {p.remainingSessions}
              </span>
              <span className="text-sm font-bold text-slate-500 ml-2">sessões para a alta</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-black text-emerald-500">
                {p.progressPercentage}% concluído
              </span>
            </div>
          </div>

          <div className="relative">
            <Progress
              value={p.progressPercentage}
              className="h-4 rounded-full bg-slate-100 dark:bg-slate-800 shadow-inner"
            />
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${p.progressPercentage}%` }}
              className="absolute inset-0 bg-gradient-to-r from-amber-400 to-emerald-500 rounded-full h-4 opacity-50 blur-md"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest block mb-1">
                Total Estimado
              </span>
              <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300">
                <Target className="w-3.5 h-3.5" /> {p.predictedTotal} Sessões
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest block mb-1">
                Fatores IA
              </span>
              <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300">
                <Calendar className="w-3.5 h-3.5" /> Alta em {Math.ceil(p.remainingSessions / 2)}{" "}
                sem
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
