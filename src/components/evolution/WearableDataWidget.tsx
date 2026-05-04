import { useQuery } from "@tanstack/react-query";
import { Activity, Heart, Footprints, Flame, Route, Moon, Watch, Zap } from "lucide-react";
import { wearablesApi, type WearableSummaryItem } from "@/api/v2/tracking";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  patientId: string;
}

const DATA_TYPE_META: Record<string, { label: string; unit: string; icon: React.ElementType; color: string }> = {
  steps:           { label: "Passos", unit: "passos", icon: Footprints, color: "text-amber-500" },
  heart_rate:      { label: "Freq. Cardíaca", unit: "bpm", icon: Heart, color: "text-red-500" },
  active_calories: { label: "Calorias", unit: "kcal", icon: Flame, color: "text-green-500" },
  distance:        { label: "Distância", unit: "m", icon: Route, color: "text-blue-500" },
  sleep_hours:     { label: "Sono", unit: "h", icon: Moon, color: "text-indigo-400" },
  hrv:             { label: "HRV", unit: "ms", icon: Zap, color: "text-purple-500" },
  vo2_max:         { label: "VO₂ Máx", unit: "ml/kg/min", icon: Activity, color: "text-teal-500" },
};

const SOURCE_LABEL: Record<string, string> = {
  apple_health:   "Apple Health",
  health_connect: "Health Connect",
  strava:         "Strava",
  oura:           "Oura Ring",
  garmin:         "Garmin",
};

function formatValue(item: WearableSummaryItem): string {
  const meta = DATA_TYPE_META[item.data_type];
  if (item.data_type === "distance") {
    const km = item.value / 1000;
    return km >= 1 ? `${km.toFixed(1)} km` : `${item.value} m`;
  }
  if (item.data_type === "steps") return item.value.toLocaleString("pt-BR");
  return `${item.value}${meta ? ` ${meta.unit}` : ` ${item.unit}`}`;
}

export function WearableDataWidget({ patientId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["wearable-summary", patientId],
    queryFn: () => wearablesApi.getPatientSummary(patientId),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return null;
  if (!data || (data.readings.length === 0 && data.integrations.length === 0)) return null;

  return (
    <Card className="border border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Watch className="h-4 w-4 text-muted-foreground" />
          Dados do Paciente (Wearables)
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {data.readings.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Dispositivo conectado, aguardando sincronização.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
            {data.readings.map((item) => {
              const meta = DATA_TYPE_META[item.data_type];
              const Icon = meta?.icon ?? Activity;
              const ago = formatDistanceToNow(new Date(item.timestamp), {
                addSuffix: true,
                locale: ptBR,
              });
              return (
                <div key={`${item.source}-${item.data_type}`} className="flex items-start gap-2">
                  <div className={`mt-0.5 ${meta?.color ?? "text-muted-foreground"}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground leading-none mb-0.5">
                      {meta?.label ?? item.data_type}
                    </p>
                    <p className="text-sm font-semibold">{formatValue(item)}</p>
                    <p className="text-[10px] text-muted-foreground">{ago}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {data.integrations.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/40">
            {data.integrations.map((intg) => (
              <Badge key={intg.provider} variant="outline" className="text-[10px] px-2 py-0.5 gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
                {SOURCE_LABEL[intg.provider] ?? intg.provider}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
