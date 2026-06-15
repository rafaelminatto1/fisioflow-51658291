import React, { useEffect, useState } from "react";
import { AlertTriangle, DollarSign, Activity, MessageCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getWorkersApiUrl } from "@/lib/api/config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

export function SmartDashboardWidgets() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${getWorkersApiUrl()}/api/ai-insights/widgets`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
      },
    })
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching AI widgets", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="premium-glass rounded-[2rem] border-slate-200/50">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-3/4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Daily Briefing Widget */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="h-full premium-glass rounded-[2rem] bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-100/50 dark:border-indigo-800/30 hover:shadow-premium-md transition-all duration-300">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-black uppercase tracking-wider text-indigo-800 dark:text-indigo-300 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-500" />
              FisioFlow Briefing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-indigo-700/80 dark:text-indigo-400/80 font-medium">
              {data.dailyBriefing}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Churn Risk Widget */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="h-full premium-glass rounded-[2rem] bg-orange-50/50 dark:bg-orange-900/10 border-orange-200/50 dark:border-orange-800/30 hover:shadow-premium-md transition-all duration-300">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-black uppercase tracking-wider text-orange-800 dark:text-orange-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              Risco de Abandono
            </CardTitle>
            <Badge
              variant="outline"
              className="bg-orange-100/50 text-orange-700 border-none rounded-full px-2"
            >
              {data.churnRisk?.length}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.churnRisk?.map((risk: any) => (
                <div key={risk.id} className="flex items-center justify-between group">
                  <div>
                    <p className="text-sm font-black text-slate-800 dark:text-slate-200">
                      {risk.patientName}
                    </p>
                    <p className="text-[11px] font-medium text-orange-600/80 dark:text-orange-500/80 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" />
                      Sem sessão há {risk.daysSinceLastSession} dias
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-full bg-orange-100/50 hover:bg-orange-200 dark:bg-orange-900/30 dark:hover:bg-orange-800 text-orange-600 transition-transform hover:scale-105"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Financial Alerts Widget */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="h-full premium-glass rounded-[2rem] bg-red-50/50 dark:bg-red-900/10 border-red-200/50 dark:border-red-800/30 hover:shadow-premium-md transition-all duration-300">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-black uppercase tracking-wider text-red-800 dark:text-red-400 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-red-500" />
              Atenção Financeira
            </CardTitle>
            <Badge
              variant="outline"
              className="bg-red-100/50 text-red-700 border-none rounded-full px-2"
            >
              {data.financialAlerts?.length}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.financialAlerts?.map((alert: any) => (
                <div key={alert.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-black text-slate-800 dark:text-slate-200">
                      {alert.patientName}
                    </p>
                    <p className="text-[11px] font-medium text-red-600/80 dark:text-red-500/80">
                      {alert.daysOverdue} dias atrasado
                    </p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-black text-red-600 dark:text-red-400">
                      R$ {alert.pendingAmount.toFixed(2)}
                    </span>
                    <span className="text-[10px] font-black text-red-500/60 uppercase cursor-pointer hover:underline">
                      Enviar PIX
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
