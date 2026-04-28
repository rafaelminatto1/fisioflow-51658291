import { useState } from "react";
import { Clock, Gauge } from "lucide-react";
import { SettingsSectionCard } from "@/components/schedule/settings/shared/SettingsSectionCard";
import { BusinessHoursManager } from "@/components/schedule/settings/BusinessHoursManager";
import { CapacityHeroCard } from "@/components/schedule/settings/CapacityHeroCard";
import { CapacityRulesList } from "@/components/schedule/settings/CapacityRulesList";
import { BookingWindowSettings } from "@/components/schedule/settings/BookingWindowSettings";
import { SlotAlignmentSettings } from "@/components/schedule/settings/SlotAlignmentSettings";
import { useScheduleCapacity } from "@/hooks/useScheduleCapacity";

/**
 * AgendaHorariosTab — Aba consolidada de Agenda & Horários
 *
 * Reúne em uma única aba:
 * 1. Horários de Funcionamento (BusinessHoursManager)
 * 2. Capacidade (CapacityHeroCard + CapacityRulesList)
 * 3. Janela de Agendamento (BookingWindowSettings)
 * 4. Alinhamento de Slots (SlotAlignmentSettings)
 *
 * Requirements: 2.1, 2.3
 */
export function AgendaHorariosTab() {
  const [isAddRuleOpen, setIsAddRuleOpen] = useState(false);
  const { capacities } = useScheduleCapacity();

  const totalVagasDia = capacities.reduce((sum, c) => sum + c.max_patients, 0);

  return (
    <div className="space-y-6">
      {/* 1. Horários de Funcionamento */}
      <SettingsSectionCard
        icon={<Clock className="h-4 w-4" />}
        iconBg="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
        title="Horários de Funcionamento"
        description="Configure os dias e horários de atendimento da clínica"
      >
        <BusinessHoursManager />
      </SettingsSectionCard>

      {/* 2. Capacidade */}
      <div className="space-y-3">
        <CapacityHeroCard
          onAddRule={() => setIsAddRuleOpen(true)}
          totalVagasDia={totalVagasDia}
        />
        <CapacityRulesList />
      </div>

      {/* 3. Janela de Agendamento — BookingWindowSettings já usa SettingsSectionCard internamente */}
      <BookingWindowSettings />

      {/* 4. Alinhamento de Slots — SlotAlignmentSettings já usa SettingsSectionCard internamente */}
      <SlotAlignmentSettings />
    </div>
  );
}
