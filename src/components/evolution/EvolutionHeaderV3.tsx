import React, { memo } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  FileText,
  Zap,
  Eye,
  EyeOff,
  Save,
  Clock,
  Keyboard,
  CheckCircle2,
  MoreVertical,
  Loader2,
  Mic,
  History,
  Check,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PatientHelpers } from "@/types";
import { parseResponseDate } from "@/utils/dateUtils";
import type { Patient, Appointment } from "@/types";

interface EvolutionHeaderV3Props {
  patient: Patient;
  appointment: Appointment;
  treatmentDuration: string;
  evolutionStats: {
    totalEvolutions: number;
    completedGoals: number;
    totalGoals: number;
    avgGoalProgress: number;
    activePathologiesCount: number;
    totalMeasurements: number;
    completionRate: number;
  };
  onComplete: () => void;
  isSaving: boolean;
  isCompleting: boolean;
  autoSaveEnabled: boolean;
  toggleAutoSave: () => void;
  lastSavedAt: Date | null;
  saveError?: Error | null;
  onRetrySave?: () => void;
  offlineStatus?: {
    isOnline: boolean;
    pendingActions: number;
  };
  onShowTemplateModal: () => void;
  onShowKeyboardHelp: () => void;
  onShowAIScribe: () => void;
  sessionNumber?: number;
  onOpenHistoryDrawer?: () => void;
  onShowAISummary?: () => void;
}

function getPatientInitials(patient: Patient): string {
  const name = PatientHelpers.getName(patient);
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "?";
}

export const EvolutionHeaderV3 = memo(
  ({
    patient,
    appointment,
    evolutionStats,
    onComplete,
    isSaving,
    isCompleting,
    autoSaveEnabled,
    toggleAutoSave,
    lastSavedAt,
    saveError,
    onRetrySave,
    offlineStatus,
    onShowTemplateModal,
    onShowKeyboardHelp,
    onShowAIScribe,
    sessionNumber = 1,
    onOpenHistoryDrawer,
    onShowAISummary,
  }: EvolutionHeaderV3Props) => {
    const navigate = useNavigate();

    // Data e horário do agendamento desta sessão.
    const sessionWhen = (() => {
      const a = appointment as any;
      const rawDate = a?.date ?? a?.appointment_date ?? a?.startTime ?? a?.start_time;
      const rawTime = a?.start_time ?? a?.startTime ?? a?.appointment_time ?? a?.time;
      let out = "";
      try {
        if (rawDate) {
          const ymd = String(rawDate).slice(0, 10);
          const d = /^\d{4}-\d{2}-\d{2}$/.test(ymd)
            ? new Date(`${ymd}T12:00:00`)
            : new Date(rawDate);
          if (!Number.isNaN(d.getTime())) out = format(d, "dd 'de' MMM 'de' yyyy", { locale: ptBR });
        }
        if (rawTime) out += `${out ? " · " : ""}${String(rawTime).slice(0, 5)}`;
      } catch {
        /* ignora datas inválidas */
      }
      return out;
    })();

    const renderSaveStatus = () => {
      const hasPending = (offlineStatus?.pendingActions ?? 0) > 0;
      const isOffline = offlineStatus && !offlineStatus.isOnline;
      
      let statusContent = null;
      let statusKey = "none";
      
      if (saveError && !isSaving) {
        statusKey = "error";
        statusContent = (
          <span
            className="flex items-center gap-1.5 text-[11px] font-bold text-rose-600"
            title={saveError.message || "Erro ao salvar"}
          >
            <Clock className="h-3 w-3" />
            Falha ao salvar
            {onRetrySave && (
              <button
                type="button"
                onClick={onRetrySave}
                className="ml-1 inline-flex items-center rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 hover:bg-rose-200 transition-colors"
              >
                Tentar de novo
              </button>
            )}
          </span>
        );
      } else if (isSaving) {
        statusKey = "saving";
        statusContent = (
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-600" />
            Salvando…
          </span>
        );
      } else if (isOffline || hasPending) {
        statusKey = "offline";
        statusContent = (
          <span
            className="flex items-center gap-1.5 text-[11px] font-bold text-amber-600"
            title={
              isOffline
                ? "Você está offline — as alterações serão enviadas quando a conexão voltar."
                : `${offlineStatus?.pendingActions} alterações pendentes de sincronização.`
            }
          >
            <Clock className="h-3.5 w-3.5" />
            {isOffline ? "Offline" : "Aguardando rede"}
            {hasPending && (
              <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-100 px-1 text-[10px] font-bold text-amber-700">
                {offlineStatus!.pendingActions}
              </span>
            )}
          </span>
        );
      } else if (lastSavedAt) {
        statusKey = "saved";
        statusContent = (
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 whitespace-nowrap">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Salvo {format(lastSavedAt, "HH:mm")}
          </span>
        );
      }

      return (
        <div className="h-[30px] flex items-center justify-center overflow-hidden px-2 border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 rounded-full min-w-[100px]">
          <AnimatePresence mode="wait">
            {statusContent && (
              <motion.div
                key={statusKey}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="flex items-center justify-center"
              >
                {statusContent}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    };

    return (
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-card shrink-0 min-h-[50px]">
        {/* Voltar */}
        <button
          onClick={() => navigate("/agenda")}
          className="w-[30px] h-[30px] rounded-[10px] border border-border bg-card flex items-center justify-center cursor-pointer text-muted-foreground hover:bg-secondary transition-colors shrink-0"
          aria-label="Voltar para agenda"
        >
          <ArrowLeft className="w-[15px] h-[15px]" />
        </button>

        {/* Avatar Iniciais */}
        <div className="w-[36px] h-[36px] rounded-full bg-teal-50 text-teal-800 border border-teal-200/50 flex items-center justify-center font-extrabold text-[13px] shrink-0">
          {getPatientInitials(patient)}
        </div>

        {/* Info Paciente */}
        <div className="flex flex-col gap-[1px] min-w-0">
          <div className="flex items-center gap-2">
            <strong className="text-[15px] tracking-tight whitespace-nowrap truncate text-slate-900">
              {PatientHelpers.getName(patient)}
            </strong>
            <span className="inline-flex px-[9px] py-[2px] rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/40 text-[9.5px] font-extrabold tracking-wider">
              SESSÃO #{sessionNumber}
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground font-semibold tabular-nums truncate">
            {sessionNumber}ª sessão · {evolutionStats.totalEvolutions} evoluções ·{" "}
            {evolutionStats.totalMeasurements} medições ·{" "}
            <span className="text-[#059669]">100% sucesso</span>
            {sessionWhen && (
              <span className="ml-1 inline-flex items-center gap-1 text-slate-600">
                <span className="text-muted-foreground/50">·</span>
                <Clock className="h-3 w-3" />
                {sessionWhen}
              </span>
            )}
          </div>
        </div>

        {/* Ações da Direita */}
        <div className="ml-auto flex items-center gap-2.5">
          <button
            onClick={onShowAIScribe}
            className="hidden sm:inline-flex items-center gap-1.5 h-[30px] px-3 rounded-full border border-teal-200 bg-teal-50 text-teal-700 text-[10px] font-extrabold tracking-wider cursor-pointer transition-all hover:bg-teal-100/70 hover:border-teal-300"
          >
            <Mic className="w-[13px] h-[13px]" /> VOICE SCRIBE
          </button>

          <button
            onClick={onOpenHistoryDrawer}
            className="hidden sm:inline-flex items-center gap-1.5 h-[30px] px-3 rounded-full border border-teal-200 bg-teal-50 text-teal-700 text-[10px] font-extrabold tracking-wider cursor-pointer transition-all hover:bg-teal-100/70 hover:border-teal-300"
          >
            <History className="w-[13px] h-[13px]" /> HISTÓRICO
          </button>

          {onShowAISummary ? (
            <button
              onClick={onShowAISummary}
              className="hidden sm:inline-flex items-center gap-1.5 h-[30px] px-3 rounded-full border border-emerald-200 bg-white text-emerald-700 text-[10px] font-extrabold tracking-wider cursor-pointer transition-all hover:bg-emerald-50 hover:border-emerald-300"
            >
              <Sparkles className="w-[13px] h-[13px]" /> RESUMO IA
            </button>
          ) : null}

          {renderSaveStatus()}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="w-[30px] h-[30px] rounded-[10px] border border-border bg-card flex items-center justify-center cursor-pointer text-muted-foreground hover:bg-secondary transition-colors shrink-0"
                title="Mais ações"
              >
                <MoreVertical className="w-[15px] h-[15px]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={onShowTemplateModal}>
                <Zap className="h-4 w-4 mr-2" />
                Aplicar template
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/patients/${patient.id}`)}>
                <Eye className="h-4 w-4 mr-2" />
                Ver perfil do paciente
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onShowKeyboardHelp}>
                <Keyboard className="h-4 w-4 mr-2" />
                Atalhos de teclado
              </DropdownMenuItem>
              {onShowAISummary ? (
                <DropdownMenuItem onClick={onShowAISummary}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Gerar resumo com IA
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={autoSaveEnabled}
                onCheckedChange={() => toggleAutoSave()}
              >
                <Save className="h-4 w-4 mr-2" />
                Auto-salvar
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            onClick={onComplete}
            disabled={isSaving || isCompleting}
            className="h-[30px] px-4 rounded-[14px] bg-teal-600 hover:bg-teal-700 text-white font-semibold text-[13px] tracking-wider transition-all"
          >
            {isCompleting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
            ) : (
              <Check className="w-3.5 h-3.5 mr-1.5" />
            )}
            CONCLUIR
          </Button>
        </div>
      </div>
    );
  },
);

EvolutionHeaderV3.displayName = "EvolutionHeaderV3";
