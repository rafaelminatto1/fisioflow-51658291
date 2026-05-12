import { useMemo } from "react";
import { Clock, Gauge, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SettingsSectionCard } from "@/components/schedule/settings/shared/SettingsSectionCard";
import { BusinessHoursManager } from "@/components/schedule/settings/BusinessHoursManager";
import { CapacityRulesList } from "@/components/schedule/settings/CapacityRulesList";
import { SlotConfigurationSettings } from "@/components/schedule/settings/SlotConfigurationSettings";
import { useScheduleCapacity } from "@/hooks/useScheduleCapacity";

export function AgendaHorariosTab() {
  const { capacities } = useScheduleCapacity();

  const totalVagasDia = useMemo(
    () => capacities.reduce((sum, c) => sum + c.max_patients, 0),
    [capacities],
  );

  return (
    <div className="space-y-6">
      {/* Capacidade */}
      <SettingsSectionCard
        icon={<Gauge className="h-4 w-4" />}
        iconBg="bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400"
        title="Capacidade de Atendimento"
        description="Defina quantos pacientes podem ser atendidos simultaneamente por horário"
        action={
          <Badge variant="outline" className="text-xs font-medium shrink-0">
            <Users className="h-3 w-3 mr-1" />
            {totalVagasDia} vagas/dia
          </Badge>
        }
      >
        <CapacityRulesList />
      </SettingsSectionCard>

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
