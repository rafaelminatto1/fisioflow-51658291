import React from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Mic, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export const QuickActionsHeader = ({ className }: { className?: string }) => {
  const navigate = useNavigate();

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md p-1 rounded-xl border border-white/20 dark:border-slate-800 shadow-sm transition-all",
        className
      )}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/agenda")}
        className="h-8 px-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-800/80 hover:text-blue-600 rounded-lg transition-all"
        title="Ir para a Agenda Rapidamente"
      >
        <Calendar className="h-3.5 w-3.5 mr-1 text-blue-600" />
        <span className="hidden sm:inline">+ Agenda</span>
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/evolucao")}
        className="h-8 px-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-800/80 hover:text-indigo-600 rounded-lg transition-all"
        title="Nova Evolução de Paciente (SOAP / Voz)"
      >
        <Mic className="h-3.5 w-3.5 mr-1 text-indigo-500" />
        <span className="hidden sm:inline">Evolução</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/ai-studio")}
        className="h-8 px-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-800/80 hover:text-emerald-600 rounded-lg transition-all"
        title="AI Studio & Goniometria"
      >
        <Target className="h-3.5 w-3.5 mr-1 text-emerald-500" />
        <span className="hidden sm:inline">AI Studio</span>
      </Button>
    </div>
  );
};
