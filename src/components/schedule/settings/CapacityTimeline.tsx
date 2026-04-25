import type { CapacityGroup } from "@/hooks/useScheduleCapacity";

interface TimelineSegment {
  label: string;
  startHour: number;
  endHour: number;
  capacity: number;
  percentage: number;
}

function getSegmentColor(capacity: number, maxCapacity: number): string {
  const ratio = maxCapacity > 0 ? capacity / maxCapacity : 0;
  if (ratio <= 0.4) return "bg-blue-500/20 dark:bg-blue-400/20 text-blue-700 dark:text-blue-300";
  if (ratio <= 0.7) return "bg-blue-500/40 dark:bg-blue-400/40 text-blue-800 dark:text-blue-200";
  return "bg-blue-500/60 dark:bg-blue-400/60 text-blue-900 dark:text-blue-100";
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

interface CapacityTimelineProps {
  groups: CapacityGroup[];
}

export function CapacityTimeline({ groups }: CapacityTimelineProps) {
  if (groups.length === 0) {
    return (
      <div className="bg-card rounded-xl p-6 shadow-sm border border-border/60">
        <h3 className="text-sm font-medium text-foreground mb-4">Visão Geral do Dia</h3>
        <div className="h-8 bg-muted rounded-lg flex items-center justify-center">
          <span className="text-xs text-muted-foreground">Adicione regras para ver a timeline</span>
        </div>
      </div>
    );
  }

  const dayStart = 7 * 60;
  const dayEnd = 19 * 60;
  const totalRange = dayEnd - dayStart;
  const maxCapacity = Math.max(...groups.map((g) => g.max_patients), 1);

  const segments: TimelineSegment[] = [];
  let lastEnd = dayStart;

  const sortedGroups = [...groups].sort(
    (a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time),
  );

  for (const group of sortedGroups) {
    const gStart = timeToMinutes(group.start_time);
    const gEnd = timeToMinutes(group.end_time);
    const clampedStart = Math.max(gStart, dayStart);
    const clampedEnd = Math.min(gEnd, dayEnd);

    if (clampedStart > lastEnd) {
      segments.push({
        label: "",
        startHour: lastEnd,
        endHour: clampedStart,
        capacity: 0,
        percentage: ((clampedStart - lastEnd) / totalRange) * 100,
      });
    }

    segments.push({
      label: `${group.max_patients}x`,
      startHour: clampedStart,
      endHour: clampedEnd,
      capacity: group.max_patients,
      percentage: ((clampedEnd - clampedStart) / totalRange) * 100,
    });

    lastEnd = clampedEnd;
  }

  if (lastEnd < dayEnd) {
    segments.push({
      label: "",
      startHour: lastEnd,
      endHour: dayEnd,
      capacity: 0,
      percentage: ((dayEnd - lastEnd) / totalRange) * 100,
    });
  }

  const firstGroupDays = sortedGroups[0]?.days ?? [];
  const dayLabel = firstGroupDays.length >= 5 ? "Seg-Sex" : firstGroupDays.join(", ");

  return (
    <div className="bg-card rounded-xl p-6 shadow-sm border border-border/60">
      <h3 className="text-sm font-medium text-foreground mb-4">Visão Geral do Dia ({dayLabel})</h3>
      <div className="relative pt-2 pb-2">
        <div className="h-8 bg-muted rounded-lg flex overflow-hidden">
          {segments.map((seg) => {
            const segKey = `${seg.startHour}-${seg.endHour}-${seg.capacity}`;
            if (seg.capacity === 0) {
              return (
                <div
                  key={segKey}
                  className="h-full flex items-center justify-center"
                  style={{ width: `${seg.percentage}%` }}
                >
                  {seg.percentage > 8 && (
                    <span className="text-[10px] text-muted-foreground">—</span>
                  )}
                </div>
              );
            }
            return (
              <div
                key={segKey}
                className={`h-full flex items-center justify-center border-r border-background transition-all ${getSegmentColor(seg.capacity, maxCapacity)}`}
                style={{ width: `${seg.percentage}%` }}
              >
                <span className="text-xs font-semibold">{seg.label}</span>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-muted-foreground font-mono">
          <span>07:00</span>
          <span>09:00</span>
          <span>12:00</span>
          <span>14:00</span>
          <span>17:00</span>
          <span>19:00</span>
        </div>
      </div>
    </div>
  );
}
