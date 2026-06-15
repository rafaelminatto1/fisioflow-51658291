import React, { memo, useState } from "react";
import {
  Maximize2,
  Bold,
  Italic,
  Underline,
  Heading2,
  List,
  ListChecks,
  ArrowRight,
  EyeOff,
  Activity,
  Stethoscope,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { EvolutionV2Data } from "@/components/evolution/v2-improved/types";
import { RichTextBlock } from "@/components/evolution/v2-improved/RichTextBlock";
import { EvolutionBlockV3 } from "@/components/evolution/v3-unified/EvolutionBlockV3";
import { SessionTimelineStrip } from "@/components/evolution/v2-improved/SessionTimelineStrip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

interface EvolutionNoScrollPanelProps {
  data: EvolutionV2Data;
  onChange: (data: EvolutionV2Data) => void;
  patientId?: string;
  evolutionId?: string;
  onOpenHistoryDrawer?: () => void;
  isHistoryDrawerOpen?: boolean;
}

export const EvolutionNoScrollPanel = memo(
  ({
    data,
    onChange,
    patientId,
    evolutionId,
    onOpenHistoryDrawer,
  }: EvolutionNoScrollPanelProps) => {
    const [historyOpen, setHistoryOpen] = useState(false);

    const handleObservationsChange = (text: string) => {
      onChange({ ...data, observations: text, evolutionText: text });
    };

    const handleUnifiedItemsChange = (items: any[]) => {
      onChange({ ...data, unifiedItems: items });
    };

    const handleReplicate = (oldData: Partial<EvolutionV2Data>) => {
      onChange({
        ...data,
        evolutionText: oldData.evolutionText || oldData.observations || data.evolutionText,
        unifiedItems: oldData.unifiedItems || data.unifiedItems,
      });
      setHistoryOpen(false);
    };

    return (
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[1fr_340px_300px] gap-3 p-3">
        {/* Coluna 1: Observações */}
        <div className="min-h-0 flex flex-col bg-card border border-border border-t-[3px] border-t-[#F59E0B] rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-2.5 px-3.5 py-2">
            <div className="w-[26px] h-[26px] rounded-lg bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0">
              <span className="w-3.5 h-3.5 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" x2="8" y1="13" y2="13" />
                  <line x1="16" x2="8" y1="17" y2="17" />
                  <line x1="10" x2="8" y1="9" y2="9" />
                </svg>
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="text-[13px] font-extrabold truncate text-slate-800">
                Observações Clínicas
              </div>
              <div className="text-[10px] text-muted-foreground font-semibold truncate">
                Registro principal da sessão
              </div>
            </div>
            <div className="flex-1" />
            <button className="inline-flex items-center gap-1.5 h-[26px] px-2.5 rounded-full border border-border bg-card text-[11px] font-bold text-muted-foreground cursor-pointer transition-colors hover:bg-slate-50 shrink-0">
              <Maximize2 className="w-3 h-3" /> Foco
            </button>
          </div>

          {/* Editor Wrapper */}
          <div className="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar flex flex-col">
            <div className="flex-1 border-none focus-within:ring-0">
              <RichTextBlock
                content={data.evolutionText || data.observations || ""}
                onChange={handleObservationsChange}
                placeholder="Digite a evolução (SOAP) aqui..."
                hideLabel
                className="border-none shadow-none p-0 focus-within:ring-0"
                minimal
              />
            </div>
          </div>
        </div>

        {/* Coluna 2: Procedimentos e Exercícios */}
        <div className="min-h-0 flex flex-col bg-card border border-border border-t-[3px] border-t-primary rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-2.5 px-3.5 py-2">
            <div className="w-[26px] h-[26px] rounded-lg bg-[#E5F0FF] text-[#005CE6] flex items-center justify-center shrink-0">
              <Stethoscope className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="text-[13px] font-extrabold truncate text-slate-800">
                Procedimentos
              </div>
              <div className="text-[10px] text-muted-foreground font-semibold truncate">
                O que foi feito em sessão?
              </div>
            </div>
            <div className="flex-1" />
            <button className="w-[26px] h-[26px] rounded-lg border border-border bg-card flex items-center justify-center cursor-pointer text-muted-foreground hover:bg-slate-50 shrink-0">
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
            <EvolutionBlockV3
              items={data.unifiedItems || []}
              onChange={handleUnifiedItemsChange}
              patientId={patientId || ""}
            />
          </div>
        </div>

        {/* Coluna 3: Lateral */}
        <div className="min-h-0 flex flex-col gap-3 overflow-y-auto pr-1 pb-1 custom-scrollbar">
          {/* EVA */}
          <div className="bg-card border border-border border-t-[3px] border-t-rose-500 rounded-xl overflow-hidden shadow-sm flex flex-col p-3 gap-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                <Activity className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="text-xs font-extrabold text-slate-800">
                  Escala Analógica de Dor (EVA)
                </div>
              </div>
            </div>

            <div className="relative h-6 mt-1">
              <div className="absolute inset-0 top-2 h-2 rounded-full overflow-hidden bg-gradient-to-r from-emerald-400 via-yellow-400 via-orange-500 to-rose-500 shadow-inner" />
              <input
                type="range"
                min={0}
                max={10}
                value={data.painLevel || 0}
                onChange={(e) => onChange({ ...data, painLevel: parseInt(e.target.value) })}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-white shadow-md ring-2 ring-rose-200 pointer-events-none transition-all"
                style={{ left: `${((data.painLevel || 0) / 10) * 100}%` }}
              >
                <div className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-slate-700">
                  {data.painLevel || 0}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] font-bold text-emerald-600">0</span>
              <span className="text-[10px] font-bold text-yellow-600">3</span>
              <span className="text-[10px] font-bold text-orange-600">6</span>
              <span className="text-[10px] font-bold text-rose-600">10</span>
            </div>

            <input
              type="text"
              value={data.painLocation || ""}
              onChange={(e) => onChange({ ...data, painLocation: e.target.value })}
              placeholder="Localização da dor (opcional)"
              className="w-full h-7 px-2 mt-1 text-[11px] rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-rose-200 focus:border-rose-300 placeholder:text-slate-400 transition-colors"
            />
          </div>

          {/* Medições */}
          <div className="bg-card border border-border border-t-[3px] border-t-[#8B5CF6] rounded-xl overflow-hidden shadow-sm flex flex-col p-3 gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-[#F5F3FF] text-[#8B5CF6] flex items-center justify-center shrink-0">
                  <span className="w-3.5 h-3.5 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M2 12h20" />
                      <path d="M4 12v-4" />
                      <path d="M8 12v-2" />
                      <path d="M12 12v-4" />
                      <path d="M16 12v-2" />
                      <path d="M20 12v-4" />
                    </svg>
                  </span>
                </div>
                <div className="text-xs font-extrabold text-slate-800">Medições (0)</div>
              </div>
              <button className="text-[10px] font-bold text-primary hover:underline">
                VER TODAS
              </button>
            </div>
            <div className="text-[11px] text-muted-foreground text-center py-4 bg-slate-50/50 rounded-lg border border-dashed border-slate-200 mt-1">
              Nenhuma medição nesta sessão.
            </div>
          </div>

          {/* Histórico */}
          <div
            onClick={() => setHistoryOpen(true)}
            className="bg-card border border-border border-t-[3px] border-t-slate-400 rounded-xl overflow-hidden shadow-sm flex flex-col p-3 gap-2 cursor-pointer hover:border-slate-300 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 group-hover:bg-slate-200 transition-colors">
                  <span className="w-3.5 h-3.5 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                      <path d="M3 3v5h5" />
                      <path d="M12 7v5l4 2" />
                    </svg>
                  </span>
                </div>
                <div className="text-xs font-extrabold text-slate-800">Sessão Anterior</div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
              Verifique o que foi realizado no último atendimento ou abra o histórico completo...
            </div>
          </div>

          {/* Anexos */}
          <div className="bg-card border border-border border-t-[3px] border-t-[#14B8A6] rounded-xl overflow-hidden shadow-sm flex flex-col p-3 gap-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-[#CCFBF1] text-[#0F766E] flex items-center justify-center shrink-0">
                <span className="w-3.5 h-3.5 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                </span>
              </div>
              <div className="text-xs font-extrabold text-slate-800">Anexos</div>
            </div>
            <button className="h-[26px] mt-1 w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-slate-50 text-[11px] font-bold text-muted-foreground hover:bg-slate-100 transition-colors">
              Adicionar arquivo...
            </button>
          </div>
        </div>

        <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
          <SheetContent side="right" className="w-[92vw] overflow-y-auto p-4 sm:max-w-xl">
            <SheetHeader className="pr-8">
              <SheetTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-blue-600" />
                Histórico de sessões
              </SheetTitle>
              <SheetDescription>Últimas evoluções deste paciente</SheetDescription>
            </SheetHeader>
            <div className="mt-4">
              <SessionTimelineStrip
                patientId={patientId}
                excludeId={evolutionId}
                onSeeAll={() => {}}
                onReplicate={handleReplicate}
                maxItems={8}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  },
);

EvolutionNoScrollPanel.displayName = "EvolutionNoScrollPanel";
