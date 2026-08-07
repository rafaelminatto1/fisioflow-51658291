import React, { useState, useMemo } from "react";
import { LeadsContent } from "@/components/crm/LeadsContent";
import { LeadScoring } from "@/components/crm/LeadScoring";
import { LeadFunnel } from "@/components/crm/LeadFunnel";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ChevronRight, 
  ChevronLeft, 
  LayoutDashboard, 
  Filter, 
  Users, 
  TrendingUp, 
  DollarSign, 
  MessageSquare, 
  Calendar,
  Flame,
  Clock,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLeads, useLeadMetrics } from "@/hooks/useLeads";
import { Link } from "react-router-dom";

export default function CRMPipelinePage() {
  const [view, setView] = useState<"kanban" | "funnel">("kanban");
  const [showScoring, setShowScoring] = useState(false);

  const { data: leads = [] } = useLeads();
  const { data: metrics } = useLeadMetrics();

  // Computação de KPIs integrados em tempo real
  const kpiData = useMemo(() => {
    const totalLeads = leads.length;
    const totalValor = leads.reduce((acc, lead) => {
      const val = Number((lead as any).valor_estimado) || 0;
      return acc + val;
    }, 0);

    const quentes = leads.filter(
      (l) => (l as any).contact_score_temperature === "quente"
    ).length;

    const efetivados = leads.filter((l) => l.estagio === "efetivado").length;
    const taxaConversao = totalLeads > 0 ? ((efetivados / totalLeads) * 100).toFixed(1) : "0";

    return {
      totalLeads,
      totalValor,
      quentes,
      efetivados,
      taxaConversao,
    };
  }, [leads]);

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      {/* Top Header com KPI Cards & Atalhos para o Sistema */}
      <div className="bg-white dark:bg-slate-950 border-b p-4 space-y-4">
        {/* KPI Mini-Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          <Card className="bg-slate-50/50 dark:bg-slate-900/50 border shadow-2xs py-2.5 px-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total de Leads</span>
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-bold text-slate-900 dark:text-slate-100">{kpiData.totalLeads}</span>
              <span className="text-[11px] text-emerald-600 font-medium">{kpiData.efetivados} convertidos</span>
            </div>
          </Card>

          <Card className="bg-slate-50/50 dark:bg-slate-900/50 border shadow-2xs py-2.5 px-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Valor no Funil</span>
              <DollarSign className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                R$ {kpiData.totalValor.toLocaleString("pt-BR")}
              </span>
            </div>
          </Card>

          <Card className="bg-slate-50/50 dark:bg-slate-900/50 border shadow-2xs py-2.5 px-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Taxa Conversão</span>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-bold text-slate-900 dark:text-slate-100">{kpiData.taxaConversao}%</span>
              <span className="text-[11px] text-slate-500">global</span>
            </div>
          </Card>

          <Card className="bg-slate-50/50 dark:bg-slate-900/50 border shadow-2xs py-2.5 px-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Leads Quentes</span>
              <Flame className="w-4 h-4 text-rose-500" />
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-bold text-rose-600 dark:text-rose-400">{kpiData.quentes}</span>
              <Badge variant="outline" className="text-[9px] bg-rose-500/10 text-rose-600 border-rose-500/20">Alta prioridade</Badge>
            </div>
          </Card>

          {/* Atalhos do Sistema */}
          <div className="hidden lg:flex flex-col justify-center gap-1.5 border-l pl-4">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Atalhos do Sistema</span>
            <div className="flex items-center gap-2">
              <Link to="/crm/inbox">
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  Inbox WhatsApp
                </Button>
              </Link>
              <Link to="/agenda">
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  Agenda Clínica
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Barra de Ações e Modos de Visão */}
        <div className="flex items-center justify-between pt-2 border-t">
          <Tabs value={view} onValueChange={(v) => setView(v as "kanban" | "funnel")} className="w-[300px]">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="kanban" className="flex items-center gap-2 text-xs">
                <LayoutDashboard className="w-3.5 h-3.5" />
                Kanban
              </TabsTrigger>
              <TabsTrigger value="funnel" className="flex items-center gap-2 text-xs">
                <Filter className="w-3.5 h-3.5" />
                Funil
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowScoring(!showScoring)}
              className={cn(
                "flex items-center gap-2 text-xs",
                showScoring && "bg-primary/10 border-primary/30 text-primary font-semibold"
              )}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Lead Scoring IA
              {showScoring ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal do Pipeline */}
      <div className="flex flex-1 overflow-hidden">
        <div className={cn(
          "flex-1 overflow-auto transition-all duration-300",
          showScoring ? "pr-0" : ""
        )}>
          {view === "kanban" ? (
            <LeadsContent />
          ) : (
            <div className="p-6">
              <LeadFunnel />
            </div>
          )}
        </div>

        {showScoring && (
          <div className="w-[360px] border-l bg-slate-50 dark:bg-slate-900/50 overflow-auto animate-in slide-in-from-right-8 duration-300">
            <div className="p-4">
              <LeadScoring />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

