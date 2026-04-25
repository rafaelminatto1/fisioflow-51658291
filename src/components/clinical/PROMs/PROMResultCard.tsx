import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingUp } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PROMResult {
  id: string;
  scale_name: string;
  score: number;
  interpretation?: string;
  applied_at: string;
  session_id?: string;
  notes?: string;
}

interface PROMResultCardProps {
  result: PROMResult;
  onViewTimeline?: () => void;
}

const SCALE_MAX: Record<string, number> = {
  VAS: 10,
  PSFS: 10,
  DASH: 100,
  OSWESTRY: 100,
  NDI: 100,
  LEFS: 80,
  BERG: 56,
};

const SCALE_LABELS: Record<string, string> = {
  VAS: "Escala Visual Analógica",
  PSFS: "Escala Funcional do Paciente",
  DASH: "DASH — Membro Superior",
  OSWESTRY: "Índice de Oswestry",
  NDI: "Índice de Incapacidade Cervical",
  LEFS: "Escala Funcional MMII",
  BERG: "Escala de Equilíbrio de Berg",
};

const SCALE_BADGE_COLORS: Record<string, string> = {
  VAS: "bg-blue-100 text-blue-800",
  PSFS: "bg-purple-100 text-purple-800",
  DASH: "bg-blue-100 text-blue-700",
  OSWESTRY: "bg-orange-100 text-orange-800",
  NDI: "bg-indigo-100 text-indigo-800",
  LEFS: "bg-green-100 text-green-800",
  BERG: "bg-teal-100 text-teal-800",
};

function getSeverityColor(
  scaleName: string,
  score: number,
): {
  scoreColor: string;
  bgColor: string;
  borderColor: string;
} {
  const scale = scaleName.toUpperCase();
  const max = SCALE_MAX[scale] ?? 100;
  const pct = (score / max) * 100;

  // For scales where higher = worse (VAS, DASH, Oswestry, NDI)
  const invertedScales = ["VAS", "DASH", "OSWESTRY", "NDI"];
  const isInverted = invertedScales.includes(scale);

  const severity = isInverted ? pct : 100 - pct;

  if (severity < 30) {
    return {
      scoreColor: "text-green-700",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
    };
  }
  if (severity < 60) {
    return {
      scoreColor: "text-yellow-700",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
    };
  }
  return {
    scoreColor: "text-red-700",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  };
}

function formatScore(scaleName: string, score: number): string {
  const scale = scaleName.toUpperCase();
  const max = SCALE_MAX[scale];
  if (!max) return score.toFixed(1);
  const isPercentage = ["DASH", "OSWESTRY", "NDI"].includes(scale);
  if (isPercentage) return `${score.toFixed(1)}%`;
  return `${score.toFixed(scale === "VAS" || scale === "PSFS" ? 1 : 0)} / ${max}`;
}

export function PROMResultCard({ result, onViewTimeline }: PROMResultCardProps) {
  const scale = result.scale_name.toUpperCase();
  const { scoreColor, bgColor, borderColor } = getSeverityColor(result.scale_name, result.score);
  const badgeColor = SCALE_BADGE_COLORS[scale] ?? "bg-gray-100 text-gray-800";
  const scaleLabel = SCALE_LABELS[scale] ?? result.scale_name;

  let formattedDate = result.applied_at;
  try {
    formattedDate = format(parseISO(result.applied_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR });
  } catch {
    // keep original
  }

  return (
    <Card className={`border ${borderColor} ${bgColor} transition-shadow hover:shadow-md`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge className={`${badgeColor} text-xs`}>{scale}</Badge>
              {result.session_id && (
                <Badge variant="outline" className="text-xs">
                  Sessão vinculada
                </Badge>
              )}
            </div>
            <p className="text-sm font-medium text-foreground leading-snug truncate">
              {scaleLabel}
            </p>
            {result.interpretation && (
              <p className="text-sm text-muted-foreground">{result.interpretation}</p>
            )}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>{formattedDate}</span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className={`text-3xl font-bold tabular-nums ${scoreColor}`}>
              {formatScore(result.scale_name, result.score)}
            </span>
            {onViewTimeline && (
              <button
                type="button"
                onClick={onViewTimeline}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <TrendingUp className="h-3.5 w-3.5" />
                Ver evolução
              </button>
            )}
          </div>
        </div>

        {result.notes && (
          <p className="mt-2 text-xs text-muted-foreground border-t pt-2 line-clamp-2">
            {result.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
