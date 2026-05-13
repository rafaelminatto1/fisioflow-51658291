import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Stethoscope, CheckCircle2, FileText, Share2 } from "lucide-react";

interface AIMedicalReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: {
    executiveSummary: string;
    functionalGains: string[];
    painEvolution: string;
    finalRecommendation: string;
  } | null;
  patientName: string;
}

export const AIMedicalReportModal: React.FC<AIMedicalReportModalProps> = ({
  open,
  onOpenChange,
  report,
  patientName,
}) => {
  if (!report) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] rounded-[2.5rem] border-none shadow-2xl overflow-hidden p-0">
        <DialogHeader className="p-8 bg-slate-900 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-white/10">
              <Stethoscope className="h-6 w-6 text-indigo-400" />
            </div>
            <DialogTitle className="text-2xl font-black">Laudo de Desfecho (IA)</DialogTitle>
          </div>
          <DialogDescription className="text-slate-400 font-medium">
            Sintetizado para médico encaminhador: {patientName}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] p-8 bg-white dark:bg-slate-950">
          <div className="space-y-8">
            <section className="space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <FileText className="h-3 w-3" /> Resumo Executivo
              </h4>
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200 font-medium">
                {report.executiveSummary}
              </p>
            </section>

            <section className="space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3" /> Ganhos Funcionais
              </h4>
              <ul className="grid gap-2">
                {report.functionalGains.map((gain, i) => (
                  <li key={i} className="text-xs font-bold text-slate-600 dark:text-slate-400 flex gap-2">
                    <span className="text-emerald-500">•</span> {gain}
                  </li>
                ))}
              </ul>
            </section>

            <section className="space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-2">
                <Activity className="h-3 w-3" /> Evolução da Dor
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed italic">
                {report.painEvolution}
              </p>
            </section>

            <div className="p-6 rounded-3xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30">
               <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-2">Recomendação Final</h4>
               <p className="text-sm font-black text-indigo-900 dark:text-indigo-100">{report.finalRecommendation}</p>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800">
           <div className="flex w-full gap-3">
             <Button variant="outline" className="flex-1 rounded-xl h-12 font-bold" onClick={() => onOpenChange(false)}>
               Fechar
             </Button>
             <Button className="flex-1 rounded-xl h-12 bg-indigo-600 hover:bg-indigo-700 font-bold gap-2 shadow-lg shadow-indigo-200">
               <Share2 className="h-4 w-4" />
               Compartilhar PDF
             </Button>
           </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

import { Activity } from "lucide-react";
