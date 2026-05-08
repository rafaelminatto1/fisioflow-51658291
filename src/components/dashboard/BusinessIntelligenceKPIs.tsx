import { useState } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target, 
  Activity, 
  Info,
  Save,
  Loader2,
  BarChart3
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useBIMetrics } from "@/hooks/smart-dashboard/useBIMetrics";
import { motion } from "framer-motion";

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmt = (n: number, decimals = 1) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

export function BusinessIntelligenceKPIs() {
  const { kpis, cacValue, ltvCacRatio, paybackMonths, isLoading, saveCAC } = useBIMetrics();
  const [localCac, setLocalCac] = useState<string>(cacValue > 0 ? cacValue.toString() : "");

  const handleSave = () => {
    const val = parseFloat(localCac.replace(",", "."));
    if (!isNaN(val)) saveCAC(val);
  };

  const getStatusColor = (ratio: number | null) => {
    if (ratio === null) return "text-slate-400";
    if (ratio >= 3) return "text-emerald-500";
    if (ratio >= 1) return "text-amber-500";
    return "text-red-500";
  };

  const getStatusBg = (ratio: number | null) => {
    if (ratio === null) return "bg-slate-50 border-slate-100";
    if (ratio >= 3) return "bg-emerald-50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/50";
    if (ratio >= 1) return "bg-amber-50 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/50";
    return "bg-red-50 border-red-100 dark:bg-red-950/20 dark:border-red-900/50";
  };

  return (
    <Card className="rounded-[2.5rem] border-none shadow-premium-lg bg-white dark:bg-slate-950 overflow-hidden group">
      <CardHeader className="p-8 pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="font-display text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-1">
              Business Intelligence
            </p>
            <CardTitle className="font-display text-3xl font-black tracking-tighter text-slate-900 dark:text-white flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-primary" />
              Lucratividade da Clínica
            </CardTitle>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Período Analisado</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white">Últimos 6 meses</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-8 pt-4 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* LTV Card */}
          <motion.div 
            whileHover={{ y: -5 }}
            className="p-6 rounded-[2rem] bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 shadow-sm">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-slate-300" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">
                    Lifetime Value: Receita total estimada que um paciente gera durante o período de tratamento.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">LTV Estimado</p>
              <h4 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white">
                {isLoading ? "..." : fmtBRL(kpis?.ltv_estimate || 0)}
              </h4>
              <p className="text-[10px] font-bold text-emerald-600 mt-1 flex items-center gap-1">
                <Activity className="h-3 w-3" />
                Baseado em {fmt(kpis?.avg_sessions_per_patient_6m || 0)} sessões/ciclo
              </p>
            </div>
          </motion.div>

          {/* LTV:CAC Ratio */}
          <motion.div 
            whileHover={{ y: -5 }}
            className={cn("p-6 rounded-[2rem] border transition-colors space-y-4", getStatusBg(ltvCacRatio))}
          >
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 shadow-sm">
                {ltvCacRatio && ltvCacRatio >= 3 ? (
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-amber-500" />
                )}
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-slate-300" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">
                    Relação entre o valor do paciente (LTV) e o custo de aquisição (CAC). Benchmark ideal: {">"} 3:1.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Eficiência (LTV:CAC)</p>
              <h4 className={cn("text-3xl font-black tracking-tighter", getStatusColor(ltvCacRatio))}>
                {ltvCacRatio ? `${fmt(ltvCacRatio)}:1` : "N/A"}
              </h4>
              <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wider">
                {ltvCacRatio && ltvCacRatio >= 3 ? "Excelente Performance" : "Ajuste Necessário"}
              </p>
            </div>
          </motion.div>

          {/* Payback Card */}
          <motion.div 
            whileHover={{ y: -5 }}
            className="p-6 rounded-[2rem] bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 shadow-sm">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-slate-300" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">
                    Tempo médio (em meses) para que a receita do paciente cubra seu custo de aquisição.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Payback Médio</p>
              <h4 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white">
                {paybackMonths ? `${fmt(paybackMonths, 1)} meses` : "N/A"}
              </h4>
              <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wider">
                Retorno do Investimento
              </p>
            </div>
          </motion.div>
        </div>

        {/* CAC Management Footer */}
        <div className="pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">Custo de Aquisição de Pacientes (CAC)</p>
              <p className="text-[11px] text-slate-500 font-medium max-w-sm leading-relaxed">
                Insira o total investido em marketing e vendas no mês atual para recalcular as métricas de BI em tempo real.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs font-black text-slate-400">R$</span>
              <Input 
                type="text"
                placeholder="0.00"
                value={localCac}
                onChange={(e) => setLocalCac(e.target.value)}
                className="pl-10 rounded-xl h-11 w-32 font-bold border-slate-200 dark:border-slate-800"
              />
            </div>
            <Button 
              onClick={handleSave} 
              disabled={isLoading}
              className="rounded-xl h-11 px-6 bg-slate-900 text-white hover:bg-slate-800 font-bold gap-2 shadow-lg"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar CAC
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
