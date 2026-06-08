import React, { useState } from "react";
import { usePatientEvaluationResponses, usePatientEvaluationResponse } from "@/hooks/useEvaluationForms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, FileText, Calendar, CheckCircle2, Clock3, ChevronRight, Eye, Printer, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { DynamicFieldRenderer } from "./DynamicFieldRenderer";
import { Skeleton } from "@/components/ui/skeleton";

interface EvaluationHistorySidebarProps {
  patientId: string;
  currentEvaluationId?: string | null;
}

const statusConfig = {
  scheduled: { label: "Agendada", icon: Calendar, color: "bg-blue-50 text-blue-700 border-blue-200" },
  in_progress: { label: "Em curso", icon: Clock3, color: "bg-amber-50 text-amber-700 border-amber-200" },
  completed: { label: "Concluída", icon: CheckCircle2, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelled: { label: "Cancelada", icon: History, color: "bg-slate-50 text-slate-600 border-slate-200" },
} as const;

export const EvaluationHistorySidebar: React.FC<EvaluationHistorySidebarProps> = ({
  patientId,
  currentEvaluationId,
}) => {
  const { data: evaluations = [], isLoading } = usePatientEvaluationResponses(patientId);
  const [viewingEvaluationId, setViewingEvaluationId] = useState<string | null>(null);

  // Filter out the current evaluation
  const historyEvaluations = evaluations.filter(ev => ev.id !== currentEvaluationId);

  if (isLoading) {
    return (
      <Card className="border-blue-100 shadow-premium-sm h-full flex flex-col rounded-[32px] overflow-hidden">
        <CardHeader className="pb-3 border-b bg-muted">
          <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-slate-400">
            <History className="h-4 w-4" />
            Histórico
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 w-full rounded-2xl bg-muted/40 animate-pulse" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-blue-100 shadow-premium-sm h-full flex flex-col overflow-hidden glass-panel rounded-[32px]">
        <CardHeader className="pb-3 border-b bg-blue-50/30 shrink-0">
          <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-blue-600">
            <History className="h-4 w-4" />
            Avaliações Anteriores
          </CardTitle>
        </CardHeader>
        <ScrollArea className="flex-1">
          <CardContent className="p-4 space-y-3">
            {historyEvaluations.length === 0 ? (
              <div className="text-center py-12 px-4">
                <FileText className="h-10 w-10 mx-auto text-slate-200 mb-3" />
                <p className="text-xs text-slate-400 font-bold uppercase tracking-tight">Sem registros</p>
                <p className="text-[10px] text-slate-400 mt-1">Este paciente não possui avaliações passadas.</p>
              </div>
            ) : (
              historyEvaluations.map((ev) => {
                const status = statusConfig[ev.status as keyof typeof statusConfig] || statusConfig.in_progress;
                const StatusIcon = status.icon;
                const date = ev.completed_at || ev.started_at || ev.created_at;

                return (
                  <button
                    key={ev.id}
                    onClick={() => setViewingEvaluationId(ev.id)}
                    className="w-full text-left group transition-all"
                  >
                    <div className="p-4 rounded-2xl border border-slate-100 bg-white hover:border-blue-200 hover:bg-blue-50/30 hover:shadow-md space-y-3 transition-all active:scale-[0.98]">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className={cn("text-[9px] font-black uppercase py-0 px-2 h-5 rounded-lg gap-1.5 border-none", status.color)}>
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </Badge>
                        <span className="text-[10px] font-black text-slate-400 tabular-nums">
                          {date ? format(new Date(date), "dd/MM/yy", { locale: ptBR }) : "--/--/--"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-700 truncate group-hover:text-blue-700 tracking-tight">
                            {ev.form_nome || "Avaliação Clínica"}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                            {Object.keys(ev.responses || {}).length} respostas
                          </p>
                        </div>
                        <div className="h-7 w-7 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors text-slate-300">
                          <ChevronRight className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </CardContent>
        </ScrollArea>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={!!viewingEvaluationId} onOpenChange={(open) => !open && setViewingEvaluationId(null)}>
        <SheetContent side="right" className="sm:max-w-2xl p-0 border-l border-blue-100 overflow-hidden flex flex-col">
          {viewingEvaluationId && (
            <EvaluationDetailView
              evaluationId={viewingEvaluationId}
              onClose={() => setViewingEvaluationId(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};

const EvaluationDetailView = ({ evaluationId, onClose }: { evaluationId: string, onClose: () => void }) => {
  const { data: evaluation, isLoading } = usePatientEvaluationResponse(evaluationId);

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!evaluation) return null;

  return (
    <>
      <SheetHeader className="p-6 border-b bg-muted">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <SheetTitle className="text-xl font-black tracking-tight text-slate-800 uppercase">
                Detalhes da Avaliação
              </SheetTitle>
              <SheetDescription className="text-xs font-bold text-blue-600 uppercase tracking-widest">
                {evaluation.form_nome} • {evaluation.completed_at ? format(new Date(evaluation.completed_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Data não disponível"}
              </SheetDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => window.print()} className="rounded-xl">
              <Printer className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl hover:bg-rose-50 hover:text-rose-600">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </SheetHeader>

      <ScrollArea className="flex-1 p-6 md:p-10 bg-muted/40">
        <div className="max-w-2xl mx-auto space-y-8">
          <DynamicFieldRenderer
            fields={evaluation.fields as any || []}
            values={evaluation.responses as any || {}}
            onChange={() => {}}
            readOnly={true}
          />
        </div>
      </ScrollArea>
    </>
  );
};
