import { useState, useMemo } from "react";
import { Clock, Gauge, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SettingsSectionCard } from "@/components/schedule/settings/shared/SettingsSectionCard";
import { BusinessHoursManager } from "@/components/schedule/settings/BusinessHoursManager";
import { CapacityHeroCard } from "@/components/schedule/settings/CapacityHeroCard";
import { CapacityRulesList } from "@/components/schedule/settings/CapacityRulesList";
import { SlotConfigurationSettings } from "@/components/schedule/settings/SlotConfigurationSettings";
import { useScheduleCapacity } from "@/hooks/useScheduleCapacity";

/**
 * AgendaHorariosTab — Tab Hero #1: Capacidade & Horários
 *
 * Reúne:
 * 1. Hero Card com stats de capacidade
 * 2. Timeline visual de capacidade (CapacityRulesList)
 * 3. Horários de Funcionamento (BusinessHoursManager)
 * 4. Configurações de Slots (SlotConfigurationSettings)
 */
export function AgendaHorariosTab() {
  const [isAddRuleOpen, setIsAddRuleOpen] = useState(false);
  const { capacities } = useScheduleCapacity();

  const totalVagasDia = useMemo(
    () => capacities.reduce((sum, c) => sum + c.max_patients, 0),
    [capacities],
  );

  return (
    <div className="space-y-6">
      {/* Hero Card */}
      <section className="rounded-xl p-6 border-l-4 border-l-teal-500 dark:border-l-teal-400 bg-card/90 backdrop-blur-sm border border-border/60 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400">
                <Gauge className="h-4 w-4" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">
                Capacidade & Horários
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Defina quantos pacientes podem ser atendidos simultaneamente e os horários de funcionamento.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-xs font-medium">
              <TrendingUp className="h-3 w-3 mr-1" />
              {totalVagasDia} vagas/dia
            </Badge>
            <Badge variant="outline" className="text-xs font-medium">
              {capacities.length} regra{capacities.length !== 1 ? "s" : ""} ativa{capacities.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        </div>
      </section>

      {/* Capacidade */}
      <div className="space-y-3">
        <CapacityHeroCard
          onAddRule={() => setIsAddRuleOpen(true)}
          totalVagasDia={totalVagasDia}
        />
        <CapacityRulesList />
      </div>

      {/* Horários de Funcionamento */}
      <SettingsSectionCard
        icon={<Clock className="h-4 w-4" />}
        iconBg="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
        title="Horários de Funcionamento"
        description="Configure os dias e horários de atendimento da clínica"
      >
        <BusinessHoursManager />
      </SettingsSectionCard>

      {/* Configurações de Slots */}
      <SlotConfigurationSettings />
    </div>
  );
}
