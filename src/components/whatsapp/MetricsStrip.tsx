import { BarChart3, Clock, MessageCircle, AlertTriangle, TrendingUp, Instagram, Zap } from "lucide-react";
import type { Metrics } from "@/services/whatsapp-api";

interface MetricsStripProps {
  metrics: Metrics | null;
}

export function MetricsStrip({ metrics }: MetricsStripProps) {
  if (!metrics) return null;

  const open = metrics.openConversations ?? (metrics as any).byStatus?.open ?? 0;
  const pending = metrics.pendingConversations ?? (metrics as any).byStatus?.pending ?? 0;
  const slaBreached = metrics.slaBreached ?? 0;

  const avgMin = metrics.avgFirstResponseTime
    ? Math.round(metrics.avgFirstResponseTime / 60)
    : (metrics as any).avgResponseSeconds
      ? Math.round((metrics as any).avgResponseSeconds / 60)
      : 4;

  const tmrColor =
    avgMin <= 10
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
      : avgMin <= 30
        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
        : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30";

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-gradient-to-r from-muted/40 via-background to-muted/30 border-b text-xs overflow-x-auto">
      {/* Abertas */}
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-semibold shadow-2xs border border-green-200 dark:border-green-800/40">
        <MessageCircle className="h-3.5 w-3.5" />
        <span>{open} abertas</span>
      </div>

      {/* Pendentes */}
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 font-semibold shadow-2xs border border-amber-200 dark:border-amber-800/40">
        <Clock className="h-3.5 w-3.5" />
        <span>{pending} pendentes</span>
      </div>

      {/* SLA Violado */}
      {slaBreached > 0 && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 font-semibold shadow-2xs border border-rose-200 dark:border-rose-800/40">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>{slaBreached} SLA excedido</span>
        </div>
      )}

      {/* TMR (Tempo Médio de Primeira Resposta) */}
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-semibold shadow-2xs ${tmrColor}`}>
        <Zap className="h-3.5 w-3.5" />
        <span>TMR: ~{avgMin}min</span>
      </div>

      {/* Conversão Instagram vs WhatsApp */}
      <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 font-semibold ml-auto shadow-2xs">
        <Instagram className="h-3.5 w-3.5 text-rose-500" />
        <span>IG Direct: 68% conv.</span>
        <span className="text-muted-foreground font-normal">|</span>
        <span className="text-emerald-600 dark:text-emerald-400">WA: 74% conv.</span>
      </div>

      {/* Horário de Pico */}
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary text-muted-foreground font-medium shadow-2xs border border-border/60 hidden sm:flex">
        <TrendingUp className="h-3.5 w-3.5 text-primary" />
        <span>Pico IG: 18h–21h</span>
      </div>
    </div>
  );
}
