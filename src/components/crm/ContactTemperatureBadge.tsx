/**
 * Badge de temperatura do contato (lead scoring).
 * Lê `score_temperature` persistido em `contacts` (atualizado pelo job
 * leadScoring que roda diariamente 03h BRT — ou manualmente via rescore).
 */
import { Badge } from "@/components/ui/badge";
import { Flame, Snowflake, Sun } from "lucide-react";

type Temperature = "cold" | "warm" | "hot" | null | undefined;

interface Props {
  temperature: Temperature;
  score?: number | null;
  compact?: boolean;
}

const CONFIG: Record<
  NonNullable<Temperature>,
  { label: string; className: string; Icon: typeof Flame }
> = {
  hot: {
    label: "Quente",
    className: "bg-red-100 text-red-700 border-red-200 hover:bg-red-100",
    Icon: Flame,
  },
  warm: {
    label: "Morno",
    className: "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100",
    Icon: Sun,
  },
  cold: {
    label: "Frio",
    className: "bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-100",
    Icon: Snowflake,
  },
};

export function ContactTemperatureBadge({ temperature, score, compact }: Props) {
  if (!temperature) {
    return compact ? null : (
      <Badge variant="outline" className="text-muted-foreground gap-1">
        <span>—</span>
      </Badge>
    );
  }
  const cfg = CONFIG[temperature];
  const { Icon } = cfg;
  return (
    <Badge variant="outline" className={`gap-1 border ${cfg.className}`}>
      <Icon className="h-3 w-3" />
      {!compact && <span>{cfg.label}</span>}
      {typeof score === "number" && (
        <span className="font-semibold tabular-nums">{score}</span>
      )}
    </Badge>
  );
}
