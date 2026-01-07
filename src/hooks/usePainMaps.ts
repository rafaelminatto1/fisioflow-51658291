import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/lib/errors/logger';
import type { PainPoint } from '@/components/pain-map';

interface PainMap {
  id: string;
  session_id?: string;
  patient_id: string;
  created_at: string;
  updated_at?: string;
  global_pain_level?: number;
  pain_points?: any;
  notes?: string;
  points?: PainMapPoint[];
}

interface PainMapPoint {
  id: string;
  pain_map_id: string;
  region_code: string;
  region: string;
  intensity: number;
  pain_type: string;
  notes?: string;
}

interface CreatePainMapInput {
  sessionId: string;
  view: 'front' | 'back';
  points: Omit<PainPoint, 'id'>[];
}

// Hook para listar mapas de dor de uma sessão
export function usePainMapsBySession(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['pain-maps', 'session', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];

      const { data, error } = await supabase
        .from('pain_maps')
        .select(`
          *,
          points:pain_map_points(*)
        `)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as PainMap[];
    },
    enabled: !!sessionId,
  });
}

// Hook para listar mapas de dor de um paciente
export function usePainMapsByPatient(patientId: string | undefined) {
  return useQuery({
    queryKey: ['pain-maps', 'patient', patientId],
    queryFn: async () => {
      if (!patientId) return [];

      const { data, error } = await supabase
        .from('pain_maps')
        .select(`
          *,
          points:pain_map_points(*)
        `)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as (PainMap & { session?: { id: string; started_at: string } })[];
    },
    enabled: !!patientId,
  });
}

// Hook para obter um mapa de dor específico
export function usePainMap(painMapId: string | undefined) {
  return useQuery({
    queryKey: ['pain-map', painMapId],
    queryFn: async () => {
      if (!painMapId) return null;

      const { data, error } = await supabase
        .from('pain_maps')
        .select(`
          *,
          points:pain_map_points(*),
          session:sessions(
            id,
            started_at,
            patient:patients(id, name)
          )
        `)
        .eq('id', painMapId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!painMapId,
  });
}

// Hook para criar mapa de dor
export function useCreatePainMap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePainMapInput) => {
      const { sessionId, view, points } = input;

      // Buscar patient_id da sessão
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('patient_id, organization_id')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;

      // Calcular nível global de dor
      const globalPainLevel = points.length > 0
        ? Math.round(points.reduce((sum, p) => sum + p.intensity, 0) / points.length)
        : 0;

      // Criar mapa de dor
      const { data: painMap, error: mapError } = await supabase
        .from('pain_maps')
        .insert({
          session_id: sessionId,
          patient_id: session.patient_id,
          organization_id: session.organization_id,
          global_pain_level: globalPainLevel,
          pain_points: points,
        } as any)
        .select()
        .single();

      if (mapError) throw mapError;

      // Criar pontos de dor
      const pointsData = points.map(point => ({
        pain_map_id: painMap.id,
        region_code: point.regionCode,
        region: point.region,
        intensity: point.intensity,
        pain_type: point.painType,
        notes: point.notes,
      }));

      const { data: createdPoints, error: pointsError } = await supabase
        .from('pain_map_points')
        .insert(pointsData)
        .select();

      if (pointsError) {
        // Rollback - deletar mapa criado
        await supabase.from('pain_maps').delete().eq('id', painMap.id);
        throw pointsError;
      }

      return { ...painMap, points: createdPoints };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pain-maps', 'session', variables.sessionId] });
      queryClient.invalidateQueries({ queryKey: ['pain-maps', 'patient'] });
      toast.success('Mapa de dor salvo com sucesso!');
    },
    onError: (error) => {
      logger.error('Erro ao criar mapa de dor', error, 'usePainMaps');
      toast.error('Erro ao salvar mapa de dor');
    },
  });
}

// Hook para deletar mapa de dor
export function useDeletePainMap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (painMapId: string) => {
      const { error } = await supabase
        .from('pain_maps')
        .delete()
        .eq('id', painMapId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pain-maps'] });
      toast.success('Mapa de dor removido');
    },
    onError: (error) => {
      logger.error('Erro ao deletar mapa de dor', error, 'usePainMaps');
      toast.error('Erro ao remover mapa de dor');
    },
  });
}

// Hook para comparar mapas de dor
export function useComparePainMaps(patientId: string | undefined, mapIds: [string, string] | null) {
  return useQuery({
    queryKey: ['pain-maps', 'compare', patientId, mapIds],
    queryFn: async () => {
      if (!patientId || !mapIds || mapIds.length !== 2) return null;

      const { data, error } = await supabase
        .from('pain_maps')
        .select(`
          *,
          points:pain_map_points(*),
          session:sessions(started_at)
        `)
        .in('id', mapIds)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!data || data.length !== 2) return null;

      // Calcular evolução
      const [olderMap, newerMap] = data;
      const evolution = calculateEvolution(olderMap.points, newerMap.points);

      return {
        maps: data,
        evolution,
      };
    },
    enabled: !!patientId && !!mapIds && mapIds.length === 2,
  });
}

// Função para calcular evolução entre dois mapas
function calculateEvolution(
  olderPoints: PainMapPoint[],
  newerPoints: PainMapPoint[]
): {
  improvementPercentage: number;
  regionsImproved: string[];
  regionsWorsened: string[];
} {
  const olderByRegion: Record<string, number> = {};
  const newerByRegion: Record<string, number> = {};

  olderPoints.forEach(p => {
    olderByRegion[p.region_code] = p.intensity;
  });

  newerPoints.forEach(p => {
    newerByRegion[p.region_code] = p.intensity;
  });

  const allRegions = [...new Set([...Object.keys(olderByRegion), ...Object.keys(newerByRegion)])];

  const regionsImproved: string[] = [];
  const regionsWorsened: string[] = [];
  let totalOlder = 0;
  let totalNewer = 0;

  allRegions.forEach(region => {
    const older = olderByRegion[region] || 0;
    const newer = newerByRegion[region] || 0;
    totalOlder += older;
    totalNewer += newer;

    const regionName = olderPoints.find(p => p.region_code === region)?.region ||
      newerPoints.find(p => p.region_code === region)?.region ||
      region;

    if (newer < older) {
      regionsImproved.push(regionName);
    } else if (newer > older) {
      regionsWorsened.push(regionName);
    }
  });

  const improvementPercentage = totalOlder > 0
    ? Math.round(((totalOlder - totalNewer) / totalOlder) * 100)
    : 0;

  return {
    improvementPercentage,
    regionsImproved,
    regionsWorsened,
  };
}

// Hook para atualizar mapa de dor
export function useUpdatePainMap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ painMapId, points }: { painMapId: string; points: Omit<PainPoint, 'id'>[] }) => {
      // Deletar pontos antigos
      await supabase
        .from('pain_map_points')
        .delete()
        .eq('pain_map_id', painMapId);

      // Criar novos pontos
      const pointsData = points.map(point => ({
        pain_map_id: painMapId,
        region_code: point.regionCode,
        region: point.region,
        intensity: point.intensity,
        pain_type: point.painType,
        notes: point.notes,
      }));

      const { data, error } = await supabase
        .from('pain_map_points')
        .insert(pointsData)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pain-maps'] });
      toast.success('Mapa de dor atualizado!');
    },
    onError: (error) => {
      logger.error('Erro ao atualizar mapa de dor', error, 'usePainMaps');
      toast.error('Erro ao atualizar mapa de dor');
    },
  });
}

// Hook para evolução da dor
export function usePainEvolution(patientId: string | undefined) {
  return useQuery({
    queryKey: ['pain-evolution', patientId],
    queryFn: async () => {
      if (!patientId) return [];

      const { data, error } = await supabase
        .from('pain_maps')
        .select(`
          id,
          created_at,
          pain_points,
          global_pain_level
        `)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Calcular média de intensidade por mapa
      return (data || []).map((map: any) => {
        // pain_points pode ser JSONB array ou null
        const points = (map.pain_points as any[] || []);
        const totalIntensity = points.reduce((sum: number, p: any) => sum + (p.intensity || 0), 0);
        const avgIntensity = points.length > 0
          ? totalIntensity / points.length
          : (map.global_pain_level || 0);

        return {
          id: map.id,
          date: map.created_at,
          averageIntensity: Math.round(avgIntensity * 10) / 10,
          pointCount: points.length,
          globalPainLevel: map.global_pain_level || avgIntensity,
          regionCount: points.length,
          painPoints: points.map((p: any) => ({
            region: p.region || p.regionCode,
            intensity: p.intensity,
            painType: p.painType || p.pain_type,
            x: p.x || 0,
            y: p.y || 0,
          })),
        };
      });
    },
    enabled: !!patientId,
  });
}

// Hook para estatísticas de dor
export function usePainStatistics(patientId: string | undefined) {
  return useQuery({
    queryKey: ['pain-statistics', patientId],
    queryFn: async () => {
      if (!patientId) return null;

      const { data, error } = await supabase
        .from('pain_maps')
        .select(`
          id,
          created_at,
          pain_points,
          global_pain_level
        `)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!data || data.length === 0) return null;

      // Calcular estatísticas
      const allPoints: any[] = data.flatMap(m => (m.pain_points as any[] || []));

      // Regiões mais afetadas
      const regionCounts: Record<string, { count: number; totalIntensity: number }> = {};
      allPoints.forEach((p: any) => {
        const region = p.region || p.regionCode || 'unknown';
        if (!regionCounts[region]) {
          regionCounts[region] = { count: 0, totalIntensity: 0 };
        }
        regionCounts[region].count++;
        regionCounts[region].totalIntensity += (p.intensity || 0);
      });

      const topRegions = Object.entries(regionCounts)
        .map(([region, { count, totalIntensity }]) => ({
          region,
          count,
          averageIntensity: Math.round((totalIntensity / count) * 10) / 10,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Tipos de dor mais comuns
      const typeCounts: Record<string, number> = {};
      allPoints.forEach((p: any) => {
        const painType = p.pain_type || p.painType || 'unknown';
        typeCounts[painType] = (typeCounts[painType] || 0) + 1;
      });

      const painTypes = Object.entries(typeCounts)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);

      // Tendência geral (comparando primeiro e último mapa)
      const firstMap = data[0];
      const lastMap = data[data.length - 1];

      const firstPoints = (firstMap.pain_points as any[] || []);
      const lastPoints = (lastMap.pain_points as any[] || []);

      const firstAvg = firstPoints.length > 0
        ? firstPoints.reduce((s: number, p: any) => s + (p.intensity || 0), 0) / firstPoints.length
        : (firstMap.global_pain_level || 0);
      const lastAvg = lastPoints.length > 0
        ? lastPoints.reduce((s: number, p: any) => s + (p.intensity || 0), 0) / lastPoints.length
        : (lastMap.global_pain_level || 0);

      const trend = firstAvg > lastAvg ? 'improving'
        : firstAvg < lastAvg ? 'worsening'
          : 'stable';

      // Calcular média geral de dor
      const totalIntensity = allPoints.reduce((sum: number, p: any) => sum + (p.intensity || 0), 0);
      const averagePainLevel = allPoints.length > 0
        ? totalIntensity / allPoints.length
        : (data.reduce((sum: number, m: any) => sum + (m.global_pain_level || 0), 0) / data.length);

      // Calcular redução percentual
      const painReduction = firstAvg > 0
        ? Math.round(((firstAvg - lastAvg) / firstAvg) * 100)
        : 0;

      return {
        averagePainLevel: Math.round(averagePainLevel * 10) / 10,
        painReduction: Math.abs(painReduction),
        improvementTrend: trend as 'improving' | 'stable' | 'worsening',
        totalMaps: data.length,
        totalPoints: allPoints.length,
        topRegions,
        painTypes,
      };
    },
    enabled: !!patientId,
  });
}

// Hook customizado combinado para facilitar uso
export function usePainMaps(options: {
  sessionId?: string;
  patientId?: string;
}) {
  const { sessionId, patientId } = options;

  const bySession = usePainMapsBySession(sessionId);
  const byPatient = usePainMapsByPatient(patientId);
  const createMutation = useCreatePainMap();
  const deleteMutation = useDeletePainMap();

  const createPainMap = useCallback(async (
    view: 'front' | 'back',
    points: Omit<PainPoint, 'id'>[]
  ) => {
    if (!sessionId) {
      toast.error('ID da sessão não fornecido');
      return;
    }

    return createMutation.mutateAsync({
      sessionId,
      view,
      points,
    });
  }, [sessionId, createMutation]);

  return {
    // Dados
    sessionMaps: bySession.data || [],
    patientMaps: byPatient.data || [],

    // Estados de loading
    isLoading: bySession.isLoading || byPatient.isLoading,
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,

    // Ações
    createPainMap,
    deletePainMap: deleteMutation.mutate,

    // Refetch
    refetch: () => {
      bySession.refetch();
      byPatient.refetch();
    },
  };
}
