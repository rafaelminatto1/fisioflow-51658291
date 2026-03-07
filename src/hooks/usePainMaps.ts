/**
 * usePainMaps - Rewritten to use Workers API (clinicalApi.painMaps)
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { clinicalApi, PainMap, PainMapPoint } from '@/lib/api/workers-client';
import type { PainPoint } from '@/components/pain-map';

export type { PainMap, PainMapPoint };

interface CreatePainMapInput {
  sessionId: string;
  view: 'front' | 'back';
  points: Omit<PainPoint, 'id'>[];
}

interface RawPainPoint {
  region: string;
  regionCode?: string;
  intensity: number;
  painType?: string;
  pain_type?: string;
  x?: number;
  y?: number;
}

interface PainMapResponse {
  id: string;
  created_at: string;
  pain_points: unknown;
  global_pain_level?: number;
}

export function usePainMapsBySession(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['pain-maps', 'session', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      const res = await clinicalApi.painMaps.list({ evolutionId: sessionId });
      return (res?.data ?? res ?? []) as PainMap[];
    },
    enabled: !!sessionId,
  });
}

export function usePainMapsByPatient(patientId: string | undefined) {
  return useQuery({
    queryKey: ['pain-maps', 'patient', patientId],
    queryFn: async () => {
      if (!patientId) return [];
      const res = await clinicalApi.painMaps.list({ patientId });
      return (res?.data ?? res ?? []) as PainMap[];
    },
    enabled: !!patientId,
  });
}

export function usePainMap(painMapId: string | undefined) {
  return useQuery({
    queryKey: ['pain-map', painMapId],
    queryFn: async () => {
      if (!painMapId) return null;
      const res = await clinicalApi.painMaps.get(painMapId);
      return (res?.data ?? res) as PainMap;
    },
    enabled: !!painMapId,
  });
}

export function useCreatePainMap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePainMapInput) => {
      const { sessionId, points } = input;
      const globalPainLevel = points.length > 0
        ? Math.round(points.reduce((sum, p) => sum + p.intensity, 0) / points.length)
        : 0;

      const res = await clinicalApi.painMaps.create({
        evolution_id: sessionId,
        global_pain_level: globalPainLevel,
        pain_points: points as unknown[],
      });
      const map = (res?.data ?? res) as PainMap;

      if (points.length > 0 && map?.id) {
        await Promise.all(points.map(p =>
          clinicalApi.painMaps.addPoint(map.id, {
            x_coordinate: (p as unknown as { x?: number }).x,
            y_coordinate: (p as unknown as { y?: number }).y,
            intensity: p.intensity,
            region: (p as unknown as { region?: string }).region,
          }).catch(() => null)
        ));
      }
      return map;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pain-maps', 'session', variables.sessionId] });
      queryClient.invalidateQueries({ queryKey: ['pain-maps', 'patient'] });
      toast.success('Mapa de dor salvo com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao salvar mapa de dor: ' + error.message);
    },
  });
}

export function useDeletePainMap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (painMapId: string) => {
      await clinicalApi.painMaps.delete(painMapId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pain-maps'] });
      toast.success('Mapa de dor removido');
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover mapa de dor: ' + error.message);
    },
  });
}

export function useUpdatePainMap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ painMapId, points }: { painMapId: string; points: Omit<PainPoint, 'id'>[] }) => {
      const res = await clinicalApi.painMaps.update(painMapId, {
        pain_points: points as unknown[],
        global_pain_level: points.length > 0
          ? Math.round(points.reduce((s, p) => s + p.intensity, 0) / points.length)
          : 0,
      });
      return (res?.data ?? res) as PainMap;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pain-maps'] });
      toast.success('Mapa de dor atualizado!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar mapa de dor: ' + error.message);
    },
  });
}

export function useComparePainMaps(patientId: string | undefined, mapIds: [string, string] | null) {
  return useQuery({
    queryKey: ['pain-maps', 'compare', patientId, mapIds],
    queryFn: async () => {
      if (!patientId || !mapIds || mapIds.length !== 2) return null;
      const [r1, r2] = await Promise.all([
        clinicalApi.painMaps.get(mapIds[0]),
        clinicalApi.painMaps.get(mapIds[1]),
      ]);
      const maps = [r1?.data ?? r1, r2?.data ?? r2].filter(Boolean) as PainMap[];
      if (maps.length !== 2) return null;
      return { maps, evolution: null };
    },
    enabled: !!patientId && !!mapIds && mapIds.length === 2,
  });
}

export function usePainEvolution(patientId: string | undefined) {
  return useQuery({
    queryKey: ['pain-evolution', patientId],
    queryFn: async () => {
      if (!patientId) return [];
      const res = await clinicalApi.painMaps.list({ patientId });
      const maps = (res?.data ?? res ?? []) as PainMapResponse[];

      return maps.map(map => {
        const rawPoints = Array.isArray(map.pain_points) ? (map.pain_points as RawPainPoint[]) : [];
        const totalIntensity = rawPoints.reduce((sum, p) => sum + (p.intensity || 0), 0);
        const avgIntensity = rawPoints.length > 0 ? totalIntensity / rawPoints.length : (map.global_pain_level || 0);
        return {
          id: map.id,
          date: map.created_at,
          averageIntensity: Math.round(avgIntensity * 10) / 10,
          pointCount: rawPoints.length,
          globalPainLevel: map.global_pain_level || avgIntensity,
          regionCount: rawPoints.length,
          painPoints: rawPoints.map(p => ({
            region: p.region || p.regionCode || 'Desconhecido',
            intensity: p.intensity,
            painType: p.painType || p.pain_type || 'unspecified',
            x: p.x || 0, y: p.y || 0,
          })),
        };
      });
    },
    enabled: !!patientId,
  });
}

export function usePainStatistics(patientId: string | undefined) {
  return useQuery({
    queryKey: ['pain-statistics', patientId],
    queryFn: async () => {
      if (!patientId) return null;
      const res = await clinicalApi.painMaps.list({ patientId });
      const maps = (res?.data ?? res ?? []) as PainMapResponse[];
      if (maps.length === 0) return null;

      const allPoints: RawPainPoint[] = maps.flatMap(m =>
        Array.isArray(m.pain_points) ? (m.pain_points as RawPainPoint[]) : []
      );

      const regionCounts: Record<string, { count: number; totalIntensity: number }> = {};
      allPoints.forEach(p => {
        const r = p.region || p.regionCode || 'unknown';
        if (!regionCounts[r]) regionCounts[r] = { count: 0, totalIntensity: 0 };
        regionCounts[r].count++;
        regionCounts[r].totalIntensity += (p.intensity || 0);
      });

      const topRegions = Object.entries(regionCounts)
        .map(([region, { count, totalIntensity }]) => ({ region, count, averageIntensity: Math.round((totalIntensity / count) * 10) / 10 }))
        .sort((a, b) => b.count - a.count).slice(0, 5);

      const typeCounts: Record<string, number> = {};
      allPoints.forEach(p => { const t = p.pain_type || p.painType || 'unknown'; typeCounts[t] = (typeCounts[t] || 0) + 1; });
      const painTypes = Object.entries(typeCounts).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);

      const firstMap = maps[0], lastMap = maps[maps.length - 1];
      const fp = Array.isArray(firstMap.pain_points) ? (firstMap.pain_points as RawPainPoint[]) : [];
      const lp = Array.isArray(lastMap.pain_points) ? (lastMap.pain_points as RawPainPoint[]) : [];
      const fa = fp.length > 0 ? fp.reduce((s, p) => s + (p.intensity || 0), 0) / fp.length : (firstMap.global_pain_level || 0);
      const la = lp.length > 0 ? lp.reduce((s, p) => s + (p.intensity || 0), 0) / lp.length : (lastMap.global_pain_level || 0);
      const trend = fa > la ? 'improving' : fa < la ? 'worsening' : 'stable';
      const totalIntensity = allPoints.reduce((sum, p) => sum + (p.intensity || 0), 0);
      const averagePainLevel = allPoints.length > 0 ? totalIntensity / allPoints.length : (maps.reduce((sum, m) => sum + (m.global_pain_level || 0), 0) / maps.length);
      const painReduction = fa > 0 ? Math.round(((fa - la) / fa) * 100) : 0;

      return { averagePainLevel: Math.round(averagePainLevel * 10) / 10, painReduction: Math.abs(painReduction), improvementTrend: trend as 'improving' | 'stable' | 'worsening', totalMaps: maps.length, totalPoints: allPoints.length, topRegions, painTypes };
    },
    enabled: !!patientId,
  });
}

export function usePainMaps(options: { sessionId?: string; patientId?: string }) {
  const { sessionId, patientId } = options;
  const bySession = usePainMapsBySession(sessionId);
  const byPatient = usePainMapsByPatient(patientId);
  const createMutation = useCreatePainMap();
  const deleteMutation = useDeletePainMap();

  const createPainMap = useCallback(async (view: 'front' | 'back', points: Omit<PainPoint, 'id'>[]) => {
    if (!sessionId) { toast.error('ID da sessão não fornecido'); return; }
    return createMutation.mutateAsync({ sessionId, view, points });
  }, [sessionId, createMutation]);

  return {
    sessionMaps: bySession.data || [],
    patientMaps: byPatient.data || [],
    isLoading: bySession.isLoading || byPatient.isLoading,
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
    createPainMap,
    deletePainMap: deleteMutation.mutate,
    refetch: () => { bySession.refetch(); byPatient.refetch(); },
  };
}
