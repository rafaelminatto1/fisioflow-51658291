import { useMemo, useState, useCallback } from "react";
import { useScheduleCapacity } from "@/hooks/useScheduleCapacity";
import { CapacityHeroCard } from "@/components/schedule/settings/CapacityHeroCard";
import { CapacityStatsRow } from "@/components/schedule/settings/CapacityStatsRow";
import { CapacityTimeline } from "@/components/schedule/settings/CapacityTimeline";
import { CapacityRulesList } from "@/components/schedule/settings/CapacityRulesList";
import { WeeklyHeatmapGrid } from "@/components/schedule/settings/WeeklyHeatmapGrid";
import { CapacityTipCard } from "@/components/schedule/settings/CapacityTipCard";

export function ScheduleCapacityTab() {
  const { capacityGroups, isLoading } = useScheduleCapacity();
  const [addRuleKey, setAddRuleKey] = useState(0);

  const triggerAddRule = useCallback(() => {
    setAddRuleKey((k) => k + 1);
  }, []);

  const stats = useMemo(() => {
    if (!capacityGroups || capacityGroups.length === 0) {
      return { totalVagasDia: 0, mediaDiaria: 0, maxPerHour: 0, activeDays: 0 };
    }

    const uniqueDays = new Set<number>();
    let maxPerHour = 0;

    const dayCapacities: Record<number, number> = {};
    for (const g of capacityGroups) {
      for (const d of g.days) {
        uniqueDays.add(d);
        dayCapacities[d] = (dayCapacities[d] || 0) + g.max_patients;
      }
      if (g.max_patients > maxPerHour) {
        maxPerHour = g.max_patients;
      }
    }

    const totalVagasDia = Math.max(...Object.values(dayCapacities), 0);
    const avgPerDay =
      Object.values(dayCapacities).length > 0
        ? Math.round(
            Object.values(dayCapacities).reduce((a, b) => a + b, 0) /
              Object.values(dayCapacities).length,
          )
        : 0;

    return {
      totalVagasDia,
      mediaDiaria: avgPerDay,
      maxPerHour,
      activeDays: uniqueDays.size,
    };
  }, [capacityGroups]);

  if (isLoading) {
    return null;
  }

  return (
    <div className="space-y-5">
      <CapacityHeroCard onAddRule={triggerAddRule} totalVagasDia={stats.totalVagasDia} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 flex flex-col gap-5">
          <CapacityStatsRow
            totalPatients={stats.mediaDiaria}
            maxPerHour={stats.maxPerHour}
            activeDays={stats.activeDays}
          />
          <CapacityTimeline groups={capacityGroups ?? []} />
          <CapacityRulesList key={addRuleKey} />
        </div>

        <div className="flex flex-col gap-5">
          <WeeklyHeatmapGrid groups={capacityGroups ?? []} />
          <CapacityTipCard />
        </div>
      </div>
    </div>
  );
}
