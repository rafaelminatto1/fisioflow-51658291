import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { request } from "@/api/v2/base";
import { AlertCircle, Bell, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ClinicalAlert {
  id: string;
  patient_name: string;
  type: string;
  severity: "low" | "medium" | "high";
  message: string;
  created_at: string;
}

export function ClinicalAlertsWidget() {
  const { data: alertsRes, isLoading } = useQuery({
    queryKey: ["clinical-alerts-dashboard"],
    queryFn: () => request<{ data: ClinicalAlert[] }>("/api/clinic-metrics/clinical-alerts"),
    refetchInterval: 1000 * 60 * 5, // 5 mins
  });

  if (isLoading) {
    return <div className="h-48 flex items-center justify-center text-xs text-muted-foreground animate-pulse">Buscando alertas clínicos...</div>;
  }

  const alerts = alertsRes?.data || [];

  if (alerts.length === 0) {
    return (
      <Card className="border-none shadow-premium bg-slate-50/50 dark:bg-slate-900/20">
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-4 opacity-50" />
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Tudo Sob Controle</p>
          <p className="text-[10px] text-slate-400 mt-1">Nenhuma anomalia detectada via IA/RTM nas últimas 24h.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-premium bg-white dark:bg-slate-900/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-600">
            <Bell className="h-4 w-4" />
            <CardTitle className="text-lg font-black tracking-tight">Monitoramento Proativo (IA)</CardTitle>
          </div>
          <span className="bg-red-100 text-red-700 text-[10px] font-black px-2 py-0.5 rounded-full">
            {alerts.length} ALERTAS
          </span>
        </div>
        <CardDescription>Anomalias detectadas via wearables e registros diários</CardDescription>
      </CardHeader>
      <CardContent className="px-2">
        <div className="space-y-1">
           {alerts.map((alert) => (
             <div key={alert.id} className={cn(
               "flex items-start gap-4 p-3 rounded-2xl transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40",
               alert.severity === "high" ? "bg-red-50/30 dark:bg-red-950/10" : ""
             )}>
                <div className={cn(
                  "p-2 rounded-xl shrink-0 mt-1",
                  alert.severity === "high" ? "bg-red-100 text-red-600" : (alert.severity === "medium" ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-600")
                )}>
                  <AlertCircle className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                   <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{alert.patient_name}</p>
                      <span className="text-[9px] text-slate-400 font-medium whitespace-nowrap">
                        {format(new Date(alert.created_at), "HH:mm", { locale: ptBR })}
                      </span>
                   </div>
                   <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{alert.message}</p>
                   <div className="flex gap-2 mt-2">
                      <button className="text-[9px] font-black uppercase text-indigo-600 hover:underline">Ver Prontuário</button>
                      <button className="text-[9px] font-black uppercase text-slate-400 hover:text-slate-600">Arquivar</button>
                   </div>
                </div>
             </div>
           ))}
        </div>
      </CardContent>
    </Card>
  );
}
