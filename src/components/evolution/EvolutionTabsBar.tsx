import React, { memo } from "react";
import { FileText, Stethoscope, Slice, Target, Plus } from "lucide-react";
import { EvolutionTab } from "@/types/evolution";
import { cn } from "@/lib/utils";

interface EvolutionTabsBarProps {
  activeTab: EvolutionTab;
  onTabChange: (tab: EvolutionTab) => void;
  onOpenMedicalReturn?: () => void;
  onOpenSurgeries?: () => void;
  onOpenGoals?: () => void;
  metasCount?: { completed: number; total: number };
}

export const EvolutionTabsBar = memo(
  ({
    activeTab,
    onTabChange,
    onOpenMedicalReturn,
    onOpenSurgeries,
    onOpenGoals,
    metasCount = { completed: 0, total: 0 },
  }: EvolutionTabsBarProps) => {
    const tabs = [
      { id: "evolucao" as EvolutionTab, label: "EVOLUÇÃO", icon: FileText },
      { id: "avaliacao" as EvolutionTab, label: "AVALIAÇÃO" },
      { id: "tratamento" as EvolutionTab, label: "TRATAMENTO" },
      { id: "historico" as EvolutionTab, label: "HISTÓRICO" },
      { id: "assistente" as EvolutionTab, label: "ASSISTENTE" },
      { id: "midia" as EvolutionTab, label: "MÍDIA" },
      { id: "ajustes" as EvolutionTab, label: "AJUSTES" },
    ];

    return (
      <div className="flex items-center gap-0.5 px-[18px] border-b border-border bg-card shrink-0 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-[11px] py-[8px] text-[11px] font-extrabold tracking-[0.04em] whitespace-nowrap cursor-pointer transition-colors border-b-2 -mb-[1px]",
                isActive
                  ? "text-primary border-primary"
                  : "text-muted-foreground border-transparent hover:text-foreground"
              )}
            >
              {Icon && isActive && <Icon className="w-[13px] h-[13px]" />}
              {tab.label}
            </button>
          );
        })}

        <div className="flex-1 min-w-[20px]" />

        <div className="flex items-center gap-2 py-1">
          <button
            onClick={onOpenMedicalReturn}
            className="inline-flex items-center gap-1.5 h-[26px] px-[10px] rounded-full border border-dashed border-slate-300 bg-card text-[11px] font-bold text-foreground cursor-pointer transition-colors hover:bg-slate-50 shrink-0"
          >
            <Stethoscope className="w-[13px] h-[13px] text-muted-foreground" />
            Retorno Médico
            <Plus className="w-[12px] h-[12px] text-primary ml-0.5" />
          </button>

          <button
            onClick={onOpenSurgeries}
            className="inline-flex items-center gap-1.5 h-[26px] px-[10px] rounded-full border border-dashed border-slate-300 bg-card text-[11px] font-bold text-foreground cursor-pointer transition-colors hover:bg-slate-50 shrink-0"
          >
            <Slice className="w-[13px] h-[13px] text-muted-foreground" />
            Cirurgias
            <Plus className="w-[12px] h-[12px] text-primary ml-0.5" />
          </button>

          <button
            onClick={onOpenGoals}
            className="inline-flex items-center gap-1.5 h-[26px] px-[10px] rounded-full border border-dashed border-slate-300 bg-card text-[11px] font-bold text-foreground cursor-pointer transition-colors hover:bg-slate-50 shrink-0"
          >
            <Target className="w-[13px] h-[13px] text-muted-foreground" />
            Metas {metasCount.completed}/{metasCount.total}
            <Plus className="w-[12px] h-[12px] text-primary ml-0.5" />
          </button>
        </div>
      </div>
    );
  }
);

EvolutionTabsBar.displayName = "EvolutionTabsBar";
