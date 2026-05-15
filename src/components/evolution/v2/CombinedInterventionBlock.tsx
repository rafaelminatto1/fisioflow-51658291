/**
 * CombinedInterventionBlock - V2
 *
 * Combines Procedures and Exercises into a single unified block
 * with a shared visual theme (Green) and prominent library access.
 */
import React, { useState } from "react";
import { Zap, Library, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ProcedureChecklistBlock } from "./ProcedureChecklistBlock";
import { ExerciseBlockV2 } from "./ExerciseBlockV2";
import type { ProcedureItem, ExerciseV2Item } from "./types";

interface CombinedInterventionBlockProps {
  procedures: ProcedureItem[];
  onProceduresChange: (procedures: ProcedureItem[]) => void;
  exercises: ExerciseV2Item[];
  onExercisesChange: (exercises: ExerciseV2Item[]) => void;
  disabled?: boolean;
  className?: string;
}

export const CombinedInterventionBlock: React.FC<CombinedInterventionBlockProps> = ({
  procedures,
  onProceduresChange,
  exercises,
  onExercisesChange,
  disabled = false,
  className,
}) => {
  const [activeTab, setActiveTab] = useState<"both" | "procedures" | "exercises">("both");

  const completedProcs = procedures.filter((p) => p.completed).length;
  const completedExs = exercises.filter((e) => e.completed).length;
  const totalItems = procedures.length + exercises.length;
  const totalCompleted = completedProcs + completedExs;

  const completionPercent = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0;

  return (
    <div
      className={cn(
        "rounded-xl border border-emerald-500/30 bg-card overflow-hidden transition-all duration-300",
        "shadow-sm hover:shadow-md flex flex-col h-full",
        className,
      )}
    >
      {/* Header with Green Theme */}
      <div className="relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 border-b border-border/40 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
              <Zap className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-base font-bold text-foreground">Condutas e Exercícios</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge
                  variant="outline"
                  className="text-[10px] h-4 border-emerald-500/30 text-emerald-700 bg-emerald-50"
                >
                  {totalCompleted}/{totalItems} Concluídos
                </Badge>
                {completionPercent === 100 && totalItems > 0 && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg self-start sm:self-center">
            <Button
              variant={activeTab === "both" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("both")}
              className="h-7 text-[10px] font-bold uppercase tracking-wider px-2"
            >
              Ambos
            </Button>
            <Button
              variant={activeTab === "procedures" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("procedures")}
              className="h-7 text-[10px] font-bold uppercase tracking-wider px-2"
            >
              Procedimentos
            </Button>
            <Button
              variant={activeTab === "exercises" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("exercises")}
              className="h-7 text-[10px] font-bold uppercase tracking-wider px-2"
            >
              Exercícios
            </Button>
          </div>
        </div>
      </div>

      {/* Shared Progress Bar */}
      <div className="w-full h-1 bg-muted overflow-hidden">
        <div
          className="h-full bg-emerald-500 transition-all duration-700 ease-in-out"
          style={{ width: `${completionPercent}%` }}
        />
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {(activeTab === "both" || activeTab === "procedures") && (
          <div className="p-1">
            <ProcedureChecklistBlock
              procedures={procedures}
              onChange={onProceduresChange}
              disabled={disabled}
              className="border-0 shadow-none bg-transparent"
            />
          </div>
        )}

        {activeTab === "both" && <Separator className="opacity-50" />}

        {(activeTab === "both" || activeTab === "exercises") && (
          <div className="p-1">
            <ExerciseBlockV2
              exercises={exercises}
              onChange={onExercisesChange}
              disabled={disabled}
              className="border-0 shadow-none bg-transparent"
            />
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-muted/20 border-t border-border/40 flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
          <Library className="h-3 w-3" />
          Acesse a biblioteca em cada seção
        </span>
        {completionPercent < 100 && totalItems > 0 && (
          <span className="text-[10px] text-amber-600 font-bold animate-pulse">
            Sessão em andamento...
          </span>
        )}
      </div>
    </div>
  );
};
