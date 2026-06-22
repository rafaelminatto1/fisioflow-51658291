import { useScheduleSettings } from "@/hooks/useScheduleSettings";
import { useScheduleCapacity } from "@/hooks/useScheduleCapacity";
import { useAppointmentTypes } from "@/hooks/useAppointmentTypes";
import type { TabValue } from "./tabRedirects";

export function OverviewStrip({ onJump }: { onJump: (v: TabValue) => void }) {
  const { businessHours, blockedTimes } = useScheduleSettings();
  const { capacityGroups } = useScheduleCapacity();
  const { types } = useAppointmentTypes();

  const openDays = businessHours.filter((h) => h.is_open).length;
  const activeTypes = types.filter((t) => t.isActive).length;
  const futureBlocks = blockedTimes.filter((b) => new Date(b.end_date) >= new Date()).length;

  const cards: { label: string; value: number; tab: TabValue }[] = [
    { label: "Dias abertos", value: openDays, tab: "funcionamento" },
    { label: "Regras de capacidade", value: capacityGroups.length, tab: "funcionamento" },
    { label: "Tipos ativos", value: activeTypes, tab: "atendimentos" },
    { label: "Bloqueios futuros", value: futureBlocks, tab: "disponibilidade" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((c) => (
        <button
          key={c.label}
          type="button"
          onClick={() => onJump(c.tab)}
          className="rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-blue-300 dark:border-slate-800 dark:bg-slate-950"
        >
          <span className="block text-2xl font-bold text-blue-700 dark:text-blue-300">{c.value}</span>
          <span className="text-xs text-muted-foreground">{c.label}</span>
        </button>
      ))}
    </div>
  );
}
