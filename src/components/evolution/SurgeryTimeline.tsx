import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Calendar, Clock, AlertTriangle, FileText, Syringe } from "lucide-react";
import { format, differenceInDays, differenceInMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

import { getAffectedSideLabel } from "@/lib/constants/surgery";

interface Surgery {
  id: string;
  surgery_name?: string;
  name?: string;
  surgery_date?: string;
  date?: string;
  affected_side?: string;
  notes?: string;
  complications?: string;
}

interface SurgeryTimelineProps {
  surgeries: Surgery[];
}

export const SurgeryTimeline: React.FC<SurgeryTimelineProps> = ({ surgeries }) => {
  const formatTimeSinceSurgery = (dateStr: string) => {
    const surgeryDate = new Date(dateStr);
    if (isNaN(surgeryDate.getTime())) return "—";

    const daysSince = differenceInDays(new Date(), surgeryDate);
    const monthsSince = differenceInMonths(new Date(), surgeryDate);

    if (daysSince < 30) {
      return `${daysSince} ${daysSince === 1 ? "dia" : "dias"}`;
    } else if (monthsSince < 12) {
      return `${monthsSince} ${monthsSince === 1 ? "mês" : "meses"}`;
    } else {
      const years = Math.floor(monthsSince / 12);
      return `${years} ${years === 1 ? "ano" : "anos"}`;
    }
  };

  const getRecoveryPhase = (dateStr: string) => {
    const surgeryDate = new Date(dateStr);
    if (isNaN(surgeryDate.getTime())) {
      return { label: "Manutenção", variant: "outline" as const, className: "bg-muted text-muted-foreground" };
    }

    const daysSince = differenceInDays(new Date(), surgeryDate);

    if (daysSince <= 30) {
      return { label: "Fase Inicial", variant: "destructive" as const, className: "bg-red-500/10 text-red-600 border-red-500/20 font-semibold" };
    }
    if (daysSince <= 90) {
      return { label: "Recuperação", variant: "secondary" as const, className: "bg-amber-500/10 text-amber-600 border-amber-500/20 font-semibold" };
    }
    if (daysSince <= 180) {
      return { label: "Reabilitação", variant: "default" as const, className: "bg-blue-500/10 text-blue-600 border-blue-500/20 font-semibold" };
    }
    return { label: "Manutenção", variant: "outline" as const, className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-semibold" };
  };

  if (!surgeries || surgeries.length === 0) {
    return null;
  }

  return (
    <Card className="border shadow-sm rounded-2xl bg-card">
      <CardHeader className="bg-gradient-to-r from-primary/5 via-primary/10 to-transparent pb-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Syringe className="h-5 w-5" />
            </div>
            Histórico de Cirurgias
          </CardTitle>
          <Badge variant="outline" className="text-xs font-semibold px-3 py-1 bg-background/80">
            {surgeries.length} {surgeries.length === 1 ? "Registro" : "Registros"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {surgeries.map((surgery) => {
            const dateStr = surgery.surgery_date || surgery.date || new Date().toISOString();
            const nameStr = surgery.surgery_name || surgery.name || "Procedimento Cirúrgico";
            const phase = getRecoveryPhase(dateStr);

            return (
              <div
                key={surgery.id}
                className="p-4 bg-muted/20 hover:bg-muted/40 border border-border/60 hover:border-primary/40 rounded-xl transition-all duration-200 flex flex-col justify-between space-y-3"
              >
                {/* Header: Title & Recovery Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 mt-1" />
                    <h4 className="font-bold text-base text-foreground leading-tight">{nameStr}</h4>
                  </div>
                  <Badge variant={phase.variant} className={`text-xs shrink-0 ${phase.className}`}>
                    {phase.label}
                  </Badge>
                </div>

                {/* Metadata Pills */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pt-1">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background border border-border/60">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    <span>
                      {format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background border border-border/60">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    <span>Há {formatTimeSinceSurgery(dateStr)}</span>
                  </div>

                  {surgery.affected_side && surgery.affected_side !== "nao_aplicavel" && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background border border-border/60 font-medium text-foreground">
                      <Activity className="h-3.5 w-3.5 text-primary" />
                      <span>Lado: {getAffectedSideLabel(surgery.affected_side)}</span>
                    </div>
                  )}
                </div>

                {/* Complications Banner */}
                {surgery.complications && (
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block">Complicações:</span>
                      {surgery.complications}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {surgery.notes && (
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-background/60 border border-border/40 text-xs text-muted-foreground">
                    <FileText className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                    <p className="italic line-clamp-3">{surgery.notes}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
