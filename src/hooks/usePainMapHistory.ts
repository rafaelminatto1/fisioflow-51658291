import { useQuery } from "@tanstack/react-query";
import type {
  PainMapRecord,
  BodyRegion,
  PainMapPoint,
  PainIntensity,
  PainType,
} from "@/types/painMap";
import { PainMapService } from "@/lib/services/painMapService";
import { clinicalApi } from "@/api/v2";

export interface PainMapInsight {
  type: "improvement" | "stable" | "worsening";
  text: string;
  icon: string;
}

export interface PainMapHistoryData {
  painMaps: PainMapRecord[];
  evolutionData: {
    date: string;
    avgIntensity: number;
    regionCount: number;
  }[];
  regionRanking: {
    region: BodyRegion;
    label: string;
    avgIntensity: number;
    frequency: number;
  }[];
  insights: PainMapInsight[];
  statistics: {
    totalSessions: number;
    avgPainLevel: number;
    painReduction: number;
    mostAffectedRegion: string;
    estimatedWeeksToRecovery: number | null;
  };
}

export interface ComparisonResult {
  region: BodyRegion;
  label: string;
  session1Intensity: number;
  session2Intensity: number;
  difference: number;
  status: "improved" | "stable" | "worsened";
}

const mapPoint = (point: Record<string, unknown>): PainMapPoint => ({
  region: (point.region as BodyRegion) ?? "lombar",
  intensity: Number(point.intensity ?? 0) as PainIntensity,
  painType: (point.pain_type as PainType) ?? "aguda",
  description: (point.description as string) ?? undefined,
  x: Number(point.x_coordinate ?? point.x ?? 0),
  y: Number(point.y_coordinate ?? point.y ?? 0),
});

const mapPainMap = (map: Record<string, unknown>): PainMapRecord => ({
  id: String(map.id),
  patient_id: String(map.patient_id),
  session_id: map.evolution_id ? String(map.evolution_id) : undefined,
  appointment_id: map.appointment_id ? String(map.appointment_id) : undefined,
  recorded_at:
    (map.recorded_at as string) ?? (map.created_at as string) ?? new Date().toISOString(),
  pain_points: Array.isArray(map.points)
    ? map.points.map((point) => mapPoint(point as Record<string, unknown>))
    : [],
  global_pain_level: Number(map.pain_level ?? map.global_pain_level ?? 0) as PainIntensity,
  notes: (map.notes as string) ?? undefined,
  created_by: (map.created_by as string) ?? "",
  created_at: (map.created_at as string) ?? new Date().toISOString(),
  updated_at: (map.updated_at as string) ?? new Date().toISOString(),
});

export function usePainMapHistory(patientId: string) {
  return useQuery({
    queryKey: ["pain-map-history", patientId],
    queryFn: async (): Promise<PainMapHistoryData> => {
      if (!patientId) {
        return {
          painMaps: [],
          evolutionData: [],
          regionRanking: [],
          insights: [],
          statistics: {
            totalSessions: 0,
            avgPainLevel: 0,
            painReduction: 0,
            mostAffectedRegion: "N/A",
            estimatedWeeksToRecovery: null,
          },
        };
      }

      const res = await clinicalApi.painMaps.list({ patientId });
      const painMaps = (res?.data ?? []).map(mapPainMap);

      // Calculate evolution data
      const evolutionData = painMaps
        .slice()
        .reverse()
        .map((pm) => {
          const points = pm.pain_points as PainMapPoint[];
          const avgIntensity =
            points.length > 0 ? points.reduce((sum, p) => sum + p.intensity, 0) / points.length : 0;
          return {
            date: new Date(pm.recorded_at).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
            }),
            avgIntensity: Math.round(avgIntensity * 10) / 10,
            regionCount: points.length,
          };
        });

      // Calculate region ranking
      const regionStats = new Map<BodyRegion, { totalIntensity: number; count: number }>();
      painMaps.forEach((pm) => {
        const points = pm.pain_points as PainMapPoint[];
        points.forEach((point) => {
          const current = regionStats.get(point.region) || {
            totalIntensity: 0,
            count: 0,
          };
          regionStats.set(point.region, {
            totalIntensity: current.totalIntensity + point.intensity,
            count: current.count + 1,
          });
        });
      });

      const regionRanking = Array.from(regionStats.entries())
        .map(([region, stats]) => ({
          region,
          label: PainMapService.getRegionLabel(region),
          avgIntensity: Math.round((stats.totalIntensity / stats.count) * 10) / 10,
          frequency: stats.count,
        }))
        .sort((a, b) => b.avgIntensity - a.avgIntensity)
        .slice(0, 5);

      // Generate insights
      const insights: PainMapInsight[] = [];

      if (painMaps.length >= 2) {
        const firstSession = painMaps[painMaps.length - 1];
        const lastSession = painMaps[0];

        const firstAvg =
          (firstSession.pain_points as PainMapPoint[]).length > 0
            ? (firstSession.pain_points as PainMapPoint[]).reduce((s, p) => s + p.intensity, 0) /
              (firstSession.pain_points as PainMapPoint[]).length
            : 0;
        const lastAvg =
          (lastSession.pain_points as PainMapPoint[]).length > 0
            ? (lastSession.pain_points as PainMapPoint[]).reduce((s, p) => s + p.intensity, 0) /
              (lastSession.pain_points as PainMapPoint[]).length
            : 0;

        const reduction = firstAvg > 0 ? ((firstAvg - lastAvg) / firstAvg) * 100 : 0;

        if (reduction > 20) {
          insights.push({
            type: "improvement",
            text: `Melhora de ${Math.round(reduction)}% na intensidade média de dor`,
            icon: "↓",
          });
        } else if (reduction < -20) {
          insights.push({
            type: "worsening",
            text: `Aumento de ${Math.round(Math.abs(reduction))}% na intensidade média`,
            icon: "↑",
          });
        } else {
          insights.push({
            type: "stable",
            text: "Intensidade de dor estável ao longo das sessões",
            icon: "→",
          });
        }

        if (regionRanking.length > 0) {
          insights.push({
            type: "stable",
            text: `Região mais afetada: ${regionRanking[0].label}`,
            icon: "📍",
          });
        }

        // Check for regional improvements
        const firstRegions = new Map<BodyRegion, number>();
        const lastRegions = new Map<BodyRegion, number>();

        (firstSession.pain_points as PainMapPoint[]).forEach((p) =>
          firstRegions.set(p.region, p.intensity),
        );
        (lastSession.pain_points as PainMapPoint[]).forEach((p) =>
          lastRegions.set(p.region, p.intensity),
        );

        let bestImprovement = { region: "" as string, value: 0 };
        firstRegions.forEach((intensity, region) => {
          const lastIntensity = lastRegions.get(region) || 0;
          const improvement = intensity - lastIntensity;
          if (improvement > bestImprovement.value) {
            bestImprovement = {
              region: PainMapService.getRegionLabel(region),
              value: improvement,
            };
          }
        });

        if (bestImprovement.value > 2) {
          insights.push({
            type: "improvement",
            text: `Maior melhora: ${bestImprovement.region} (redução de ${bestImprovement.value} pontos)`,
            icon: "🎯",
          });
        }
      }

      // Calculate statistics
      const totalSessions = painMaps.length;
      const avgPainLevel =
        painMaps.length > 0
          ? painMaps.reduce((sum, pm) => sum + pm.global_pain_level, 0) / painMaps.length
          : 0;

      const firstPain = painMaps.length > 0 ? painMaps[painMaps.length - 1].global_pain_level : 0;
      const lastPain = painMaps.length > 0 ? painMaps[0].global_pain_level : 0;
      const painReduction = firstPain > 0 ? ((firstPain - lastPain) / firstPain) * 100 : 0;

      const mostAffectedRegion = regionRanking.length > 0 ? regionRanking[0].label : "N/A";

      // Estimate weeks to recovery (simple linear extrapolation)
      let estimatedWeeksToRecovery: number | null = null;
      if (painMaps.length >= 3 && lastPain > 0 && painReduction > 0) {
        const weeksBetweenSessions =
          painMaps.length >= 2
            ? (new Date(painMaps[0].recorded_at).getTime() -
                new Date(painMaps[painMaps.length - 1].recorded_at).getTime()) /
              (1000 * 60 * 60 * 24 * 7)
            : 1;
        const reductionPerWeek = painReduction / weeksBetweenSessions;
        if (reductionPerWeek > 0) {
          estimatedWeeksToRecovery = Math.ceil((100 - painReduction) / reductionPerWeek);
        }
      }

      return {
        painMaps,
        evolutionData,
        regionRanking,
        insights: insights.flat() as PainMapHistoryData["insights"],
        statistics: {
          totalSessions,
          avgPainLevel: Math.round(avgPainLevel * 10) / 10,
          painReduction: Math.round(painReduction),
          mostAffectedRegion,
          estimatedWeeksToRecovery,
        },
      };
    },
    enabled: !!patientId,
  });
}

export function comparePainMaps(
  session1: PainMapRecord,
  session2: PainMapRecord,
): { comparisons: ComparisonResult[]; overallChange: number } {
  const allRegions = new Set<BodyRegion>();

  (session1.pain_points as PainMapPoint[]).forEach((p) => allRegions.add(p.region));
  (session2.pain_points as PainMapPoint[]).forEach((p) => allRegions.add(p.region));

  const session1Map = new Map<BodyRegion, number>();
  const session2Map = new Map<BodyRegion, number>();

  (session1.pain_points as PainMapPoint[]).forEach((p) => session1Map.set(p.region, p.intensity));
  (session2.pain_points as PainMapPoint[]).forEach((p) => session2Map.set(p.region, p.intensity));

  const comparisons: ComparisonResult[] = Array.from(allRegions)
    .map((region) => {
      const intensity1 = session1Map.get(region) || 0;
      const intensity2 = session2Map.get(region) || 0;
      const difference = intensity2 - intensity1;

      let status: ComparisonResult["status"] = "stable";
      if (difference < -1) status = "improved";
      else if (difference > 1) status = "worsened";

      return {
        region,
        label: PainMapService.getRegionLabel(region),
        session1Intensity: intensity1,
        session2Intensity: intensity2,
        difference,
        status,
      };
    })
    .sort((a, b) => a.difference - b.difference);

  const avg1 =
    (session1.pain_points as PainMapPoint[]).length > 0
      ? (session1.pain_points as PainMapPoint[]).reduce((s, p) => s + p.intensity, 0) /
        (session1.pain_points as PainMapPoint[]).length
      : 0;
  const avg2 =
    (session2.pain_points as PainMapPoint[]).length > 0
      ? (session2.pain_points as PainMapPoint[]).reduce((s, p) => s + p.intensity, 0) /
        (session2.pain_points as PainMapPoint[]).length
      : 0;

  const overallChange = avg1 > 0 ? ((avg1 - avg2) / avg1) * 100 : 0;

  return { comparisons, overallChange };
}
