import { BarChart3, Clock, MessageCircle, AlertTriangle } from "lucide-react";
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
      : 0;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b text-xs">
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-medium">
        <MessageCircle className="h-3 w-3" />
        <span>{open} abertas</span>
      </div>
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 font-medium">
        <Clock className="h-3 w-3" />
        <span>{pending} pendentes</span>
      </div>
      {slaBreached > 0 && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-medium">
          <AlertTriangle className="h-3 w-3" />
          <span>{slaBreached} SLA</span>
        </div>
      )}
      {avgMin > 0 && (
        <div className="flex items-center gap-1.5 ml-auto text-muted-foreground">
          <BarChart3 className="h-3 w-3" />
          <span>~{avgMin}min resposta</span>
        </div>
      )}
    </div>
  );
}
