import { useState, useMemo } from "react";
import {
  Palette,
  Plus,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Eye,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { SettingsSectionCard } from "@/components/schedule/settings/shared/SettingsSectionCard";
import { StatusColorManager } from "@/components/schedule/settings/StatusColorManager";
import { useStatusConfig } from "@/hooks/useStatusConfig";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_FLOW_STEPS = [
  { id: "agendado", label: "Agendado", color: "#0073EA" },
  { id: "presenca_confirmada", label: "Confirmado", color: "#00C875" },
  { id: "em_atendimento", label: "Em Atendimento", color: "#0D9488" },
  { id: "atendido", label: "Atendido", color: "#0CA678" },
] as const;

const STATUS_FLOW_BRANCHES = [
  { from: "agendado", to: "faltou", label: "Faltou", color: "#FDAB3D" },
  { from: "agendado", to: "cancelado", label: "Cancelado", color: "#DF2F4A" },
  { from: "agendado", to: "remarcar", label: "Remarcar", color: "#66CCFF" },
] as const;

/**
 * StatusAtendimentoTab — Tab dedicada para gerenciamento de status
 *
 * Eleva o StatusColorManager de um sidebar widget para uma
 * experiência full-page com hero card, preview strip e
 * seleção de status padrão.
 */
export function StatusAtendimentoTab() {
  const {
    statusConfig,
    customStatuses,
    hasCustomColors,
  } = useStatusConfig();

  const [defaultStatus, setDefaultStatus] = useState("agendado");
  const [showFlow, setShowFlow] = useState(false);

  const stats = useMemo(() => {
    const allStatuses = Object.keys(statusConfig);
    const customCount = customStatuses.length;
    const alteredCount = allStatuses.filter((id) => hasCustomColors(id)).length;
    const categories = new Set<string>();
    for (const id of allStatuses) {
      if (["agendado", "avaliacao", "remarcar"].includes(id)) categories.add("Agendamento");
      if (["presenca_confirmada"].includes(id)) categories.add("Em Atendimento");
      if (["atendido"].includes(id)) categories.add("Concluído");
      if (id.startsWith("faltou") || id.startsWith("nao_atendido")) categories.add("Faltas");
      if (["cancelado"].includes(id)) categories.add("Cancelamento");
    }
    return {
      total: allStatuses.length,
      custom: customCount,
      altered: alteredCount,
      categories: categories.size,
    };
  }, [statusConfig, customStatuses, hasCustomColors]);

  return (
    <div className="space-y-6">
      {/* Hero Card */}
      <section className="rounded-xl p-6 border-l-4 border-l-amber-500 dark:border-l-amber-400 bg-card/90 backdrop-blur-sm border border-border/60 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
                <Palette className="h-4 w-4" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">
                Status de Atendimento
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Configure os status, cores e nomes para controlar o fluxo de atendimentos da sua clínica.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-xs font-medium">
              {stats.categories} categorias
            </Badge>
            <Badge variant="outline" className="text-xs font-medium">
              {stats.total} status ativos
            </Badge>
            {stats.custom > 0 && (
              <Badge className="text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-amber-200 dark:border-amber-800/40">
                {stats.custom} personalizados
              </Badge>
            )}
          </div>
        </div>
      </section>

      {/* Status Color Manager — Full Page */}
      <SettingsSectionCard
        icon={<Palette className="h-4 w-4" />}
        iconBg="bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400"
        title="Gerenciar Status"
        description="Personalize cores, nomes e ações por tipo de status"
      >
        <StatusColorManager />
      </SettingsSectionCard>

      {/* Status Padrão */}
      <SettingsSectionCard
        icon={<Settings2 className="h-4 w-4" />}
        iconBg="bg-slate-100 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400"
        title="Status Padrão"
        description="Status atribuído automaticamente ao criar um novo agendamento"
      >
        <div className="flex items-center gap-4">
          <Label className="text-sm font-medium shrink-0">
            Novo agendamento recebe:
          </Label>
          <Select value={defaultStatus} onValueChange={setDefaultStatus}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Selecione o status padrão" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(statusConfig).map(([id, config]) => (
                <SelectItem key={id} value={id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: config.bgColor || config.color }}
                    />
                    <span>{config.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </SettingsSectionCard>

      {/* Fluxo de Transições */}
      <SettingsSectionCard
        icon={<Eye className="h-4 w-4" />}
        iconBg="bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400"
        title="Fluxo de Transições"
        description="Visualize como os status transitam entre si"
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFlow(!showFlow)}
            className="h-7 text-xs"
          >
            {showFlow ? (
              <ChevronUp className="w-3.5 h-3.5 mr-1" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 mr-1" />
            )}
            {showFlow ? "Recolher" : "Expandir"}
          </Button>
        }
      >
        {showFlow ? (
          <div className="space-y-6">
            {/* Main Flow */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Fluxo Principal
              </p>
              <div className="flex items-center gap-1 flex-wrap">
                {STATUS_FLOW_STEPS.map((step, i) => (
                  <div key={step.id} className="flex items-center gap-1">
                    <div
                      className="px-3 py-1.5 rounded-lg text-white text-xs font-medium shadow-sm"
                      style={{ backgroundColor: step.color }}
                    >
                      {step.label}
                    </div>
                    {i < STATUS_FLOW_STEPS.length - 1 && (
                      <svg
                        className="w-5 h-5 text-muted-foreground/60 shrink-0"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Branch Flows */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Desvios do Fluxo
              </p>
              <div className="space-y-2">
                {STATUS_FLOW_BRANCHES.map((branch) => (
                  <div key={branch.to} className="flex items-center gap-2 text-xs">
                    <div
                      className="px-2.5 py-1 rounded-lg text-white font-medium shadow-sm"
                      style={{ backgroundColor: STATUS_FLOW_STEPS[0].color }}
                    >
                      {STATUS_FLOW_STEPS[0].label}
                    </div>
                    <svg
                      className="w-4 h-4 text-muted-foreground/60 shrink-0"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div
                      className="px-2.5 py-1 rounded-lg text-white font-medium shadow-sm"
                      style={{ backgroundColor: branch.color }}
                    >
                      {branch.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 flex-wrap">
            {STATUS_FLOW_STEPS.map((step, i) => (
              <div key={step.id} className="flex items-center gap-1">
                <div
                  className="w-6 h-6 rounded-full shrink-0"
                  style={{ backgroundColor: step.color }}
                  title={step.label}
                />
                {i < STATUS_FLOW_STEPS.length - 1 && (
                  <div className="w-3 h-px bg-muted-foreground/30" />
                )}
              </div>
            ))}
            <span className="text-xs text-muted-foreground ml-2">
              Clique em expandir para ver o fluxo completo
            </span>
          </div>
        )}
      </SettingsSectionCard>

      {/* Preview Strip */}
      <SettingsSectionCard
        icon={<Eye className="h-4 w-4" />}
        iconBg="bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400"
        title="Preview no Calendário"
        description="Visualize como os status aparecem nos cards da agenda"
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Object.entries(statusConfig).slice(0, 8).map(([id, config]) => (
            <div
              key={id}
              className="rounded-lg p-3 text-white text-xs space-y-1.5 shadow-sm"
              style={{
                backgroundColor: config.bgColor || config.color,
                borderLeft: `3px solid ${config.borderColor || config.color}`,
              }}
            >
              <div className="font-semibold text-[11px] truncate">
                João da Silva
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-white/70" />
                <span className="text-[10px] opacity-90 truncate">
                  {config.label}
                </span>
              </div>
              <div className="text-[10px] opacity-70">09:00 - 10:00</div>
            </div>
          ))}
        </div>
      </SettingsSectionCard>
    </div>
  );
}
