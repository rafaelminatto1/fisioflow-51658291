/**
 * usePainMaps - Migrated to Firebase
 *
 */

import { useCallback } from 'react';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query as firestoreQuery, where, orderBy, delete as deleteDocs, writeBatch, documentId, db } from '@/integrations/firebase/app';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { fisioLogger as logger } from '@/lib/errors/logger';
import type { PainPoint } from '@/components/pain-map';
import { normalizeFirestoreData } from '@/utils/firestoreData';

interface PainMap {
  id: string;
  session_id?: string;
  patient_id: string;
  organization_id?: string;
  created_at: string;
  updated_at?: string;
  global_pain_level?: number;
  pain_points?: Array<{
    x: number;
    y: number;
    intensity: number;
    type: string;
  }>;
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

// Helper: Convert Firestore doc to PainMap
const convertDocToPainMap = (doc: { id: string; data: () => Record<string, unknown> }): PainMap => {
  const data = normalizeFirestoreData(doc.data());
  return {
    id: doc.id,
    ...data,
  } as PainMap;
};

// Helper: Convert Firestore doc to PainMapPoint
const convertDocToPainMapPoint = (doc: { id: string; data: () => Record<string, unknown> }): PainMapPoint => {
  const data = normalizeFirestoreData(doc.data());
  return {
    id: doc.id,
    ...data,
  } as PainMapPoint;
};

// Hook para listar mapas de dor de uma sessão
export function usePainMapsBySession(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['pain-maps', 'session', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];

      const q = firestoreQuery(
        collection(db, 'pain_maps'),
        where('session_id', '==', sessionId),
        orderBy('created_at', 'asc')
      );

      const snapshot = await getDocs(q);
      const maps = snapshot.docs.map(convertDocToPainMap);

      // Fetch points for each map
      const mapsWithPoints = await Promise.all(
        maps.map(async (map) => {
          const pointsQ = firestoreQuery(
            collection(db, 'pain_map_points'),
            where('pain_map_id', '==', map.id)
          );
          const pointsSnapshot = await getDocs(pointsQ);
          const points = pointsSnapshot.docs.map(convertDocToPainMapPoint);
          return { ...map, points };
        })
      );

      return mapsWithPoints;
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

      const q = firestoreQuery(
        collection(db, 'pain_maps'),
        where('patient_id', '==', patientId),
        orderBy('created_at', 'asc')
      );

      const snapshot = await getDocs(q);
      const maps = snapshot.docs.map(convertDocToPainMap);

      // Fetch points for each map
      const mapsWithPoints = await Promise.all(
        maps.map(async (map) => {
          const pointsQ = firestoreQuery(
            collection(db, 'pain_map_points'),
            where('pain_map_id', '==', map.id)
          );
          const pointsSnapshot = await getDocs(pointsQ);
          const points = pointsSnapshot.docs.map(convertDocToPainMapPoint);
          return { ...map, points };
        })
      );

      // Fetch session data for each map
      const mapsWithSession = await Promise.all(
        mapsWithPoints.map(async (map) => {
          if (!map.session_id) return map;

          const sessionRef = doc(db, 'sessions', map.session_id);
          const sessionSnap = await getDoc(sessionRef);
          if (!sessionSnap.exists()) return map;

          return {
            ...map,
            session: {
              id: sessionSnap.id,
              started_at: sessionSnap.data().started_at,
            },
          };
        })
      );

      return mapsWithSession as (PainMap & { session?: { id: string; started_at: string } })[];
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

      const docRef = doc(db, 'pain_maps', painMapId);
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) return null;

      const map = convertDocToPainMap(snapshot);

      // Fetch points
      const pointsQ = firestoreQuery(
        collection(db, 'pain_map_points'),
        where('pain_map_id', '==', map.id)
      );
      const pointsSnapshot = await getDocs(pointsQ);
      const points = pointsSnapshot.docs.map(convertDocToPainMapPoint);

      // Fetch session data
      let session = null;
      if (map.session_id) {
        const sessionRef = doc(db, 'sessions', map.session_id);
        const sessionSnap = await getDoc(sessionRef);
        if (sessionSnap.exists()) {
          session = {
            id: sessionSnap.id,
            started_at: sessionSnap.data().started_at,
          };
        }
      }

      return {
        ...map,
        points,
        session,
      };
    },
    enabled: !!painMapId,
  });
}

// Hook para criar mapa de dor
export function useCreatePainMap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePainMapInput) => {
      const { sessionId, points } = input;

      // Buscar patient_id da sessão
      const sessionRef = doc(db, 'sessions', sessionId);
      const sessionSnap = await getDoc(sessionRef);

      if (!sessionSnap.exists()) {
        throw new Error('Sessão não encontrada');
      }

      const session = sessionSnap.data();

      // Calcular nível global de dor
      const globalPainLevel = points.length > 0
        ? Math.round(points.reduce((sum, p) => sum + p.intensity, 0) / points.length)
        : 0;

      // Criar mapa de dor
      const painMapData = {
        session_id: sessionId,
        patient_id: session.patient_id,
        organization_id: session.organization_id,
        global_pain_level: globalPainLevel,
        pain_points: points,
        created_at: new Date().toISOString(),
      };

      const painMapRef = await addDoc(collection(db, 'pain_maps'), painMapData);

      // Criar pontos de dor
      const pointsData = points.map(point => ({
        pain_map_id: painMapRef.id,
        region_code: point.regionCode,
        region: point.region,
        intensity: point.intensity,
        pain_type: point.painType,
        notes: point.notes,
      }));

      const createdPointsRef = await Promise.all(
        pointsData.map(pointData => addDoc(collection(db, 'pain_map_points'), pointData))
      );

      // Fetch created points
      const createdPoints = await Promise.all(
        createdPointsRef.map(async (ref) => {
          const snap = await getDoc(ref);
          return convertDocToPainMapPoint(snap);
        })
      );

      return { ...painMapData, id: painMapRef.id, points: createdPoints };
    },
    onSuccess: (_data, variables) => {
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
      // Delete points first
      const pointsQ = firestoreQuery(
        collection(db, 'pain_map_points'),
        where('pain_map_id', '==', painMapId)
      );
      const pointsSnapshot = await getDocs(pointsQ);

      const batch = writeBatch(db);
      pointsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      // Delete pain map
      await deleteDoc(doc(db, 'pain_maps', painMapId));
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

      const q = firestoreQuery(
        collection(db, 'pain_maps'),
        where(documentId(), 'in', mapIds),
        where('patient_id', '==', patientId),
        orderBy('created_at', 'asc')
      );

      const snapshot = await getDocs(q);
      const maps = snapshot.docs.map(convertDocToPainMap);

      if (maps.length !== 2) return null;

      // Fetch points for each map
      const mapsWithPoints = await Promise.all(
        maps.map(async (map) => {
          const pointsQ = firestoreQuery(
            collection(db, 'pain_map_points'),
            where('pain_map_id', '==', map.id)
          );
          const pointsSnapshot = await getDocs(pointsQ);
          const points = pointsSnapshot.docs.map(convertDocToPainMapPoint);
          return { ...map, points };
        })
      );

      // Fetch session data
      const mapsWithSession = await Promise.all(
        mapsWithPoints.map(async (map) => {
          if (!map.session_id) return map;

          const sessionRef = doc(db, 'sessions', map.session_id);
          const sessionSnap = await getDoc(sessionRef);
          if (!sessionSnap.exists()) return map;

          return {
            ...map,
            session: {
              started_at: sessionSnap.data().started_at,
            },
          };
        })
      );

      // Calcular evolução
      const [olderMap, newerMap] = mapsWithSession;
      const evolution = calculateEvolution(olderMap.points || [], newerMap.points || []);

      return {
        maps: mapsWithSession,
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
      const pointsQ = firestoreQuery(
        collection(db, 'pain_map_points'),
        where('pain_map_id', '==', painMapId)
      );
      const pointsSnapshot = await getDocs(pointsQ);

      const batch = writeBatch(db);
      pointsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      // Criar novos pontos
      const pointsData = points.map(point => ({
        pain_map_id: painMapId,
        region_code: point.regionCode,
        region: point.region,
        intensity: point.intensity,
        pain_type: point.painType,
        notes: point.notes,
      }));

      const createdPointsRef = await Promise.all(
        pointsData.map(pointData => addDoc(collection(db, 'pain_map_points'), pointData))
      );

      // Fetch created points
      const createdPoints = await Promise.all(
        createdPointsRef.map(async (ref) => {
          const snap = await getDoc(ref);
          return convertDocToPainMapPoint(snap);
        })
      );

      return createdPoints;
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

// Interfaces for responses
interface PainMapResponse {
  id: string;
  created_at: string;
  pain_points: unknown;
  global_pain_level?: number;
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

// Hook para evolução da dor
export function usePainEvolution(patientId: string | undefined) {
  return useQuery({
    queryKey: ['pain-evolution', patientId],
    queryFn: async () => {
      if (!patientId) return [];

      const q = firestoreQuery(
        collection(db, 'pain_maps'),
        where('patient_id', '==', patientId),
        orderBy('created_at', 'asc')
      );

      const snapshot = await getDocs(q);
      const maps = snapshot.docs.map(doc => ({
        id: doc.id,
        ...normalizeFirestoreData(doc.data()),
      })) as PainMapResponse[];

      // Calcular média de intensidade por mapa
      return maps.map((map) => {
        const rawPoints = Array.isArray(map.pain_points)
          ? (map.pain_points as unknown as RawPainPoint[])
          : [];

        const totalIntensity = rawPoints.reduce((sum, p) => sum + (p.intensity || 0), 0);
        const avgIntensity = rawPoints.length > 0
          ? totalIntensity / rawPoints.length
          : (map.global_pain_level || 0);

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

      const q = firestoreQuery(
        collection(db, 'pain_maps'),
        where('patient_id', '==', patientId),
        orderBy('created_at', 'asc')
      );

      const snapshot = await getDocs(q);
      const maps = snapshot.docs.map(doc => ({
        id: doc.id,
        ...normalizeFirestoreData(doc.data()),
      })) as PainMapResponse[];

      if (maps.length === 0) return null;

      // Calcular estatísticas
      const allPoints: RawPainPoint[] = maps.flatMap(m =>
        Array.isArray(m.pain_points) ? (m.pain_points as unknown as RawPainPoint[]) : []
      );

      // Regiões mais afetadas
      const regionCounts: Record<string, { count: number; totalIntensity: number }> = {};
      allPoints.forEach((p) => {
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
      allPoints.forEach((p) => {
        const painType = p.pain_type || p.painType || 'unknown';
        typeCounts[painType] = (typeCounts[painType] || 0) + 1;
      });

      const painTypes = Object.entries(typeCounts)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);

      // Tendência geral (comparando primeiro e último mapa)
      const firstMap = maps[0];
      const lastMap = maps[maps.length - 1];

      const firstPoints = Array.isArray(firstMap.pain_points) ? (firstMap.pain_points as unknown as RawPainPoint[]) : [];
      const lastPoints = Array.isArray(lastMap.pain_points) ? (lastMap.pain_points as unknown as RawPainPoint[]) : [];

      const firstAvg = firstPoints.length > 0
        ? firstPoints.reduce((s, p) => s + (p.intensity || 0), 0) / firstPoints.length
        : (firstMap.global_pain_level || 0);
      const lastAvg = lastPoints.length > 0
        ? lastPoints.reduce((s, p) => s + (p.intensity || 0), 0) / lastPoints.length
        : (lastMap.global_pain_level || 0);

      const trend = firstAvg > lastAvg ? 'improving'
        : firstAvg < lastAvg ? 'worsening'
          : 'stable';

      // Calcular média geral de dor
      const totalIntensity = allPoints.reduce((sum, p) => sum + (p.intensity || 0), 0);
      const averagePainLevel = allPoints.length > 0
        ? totalIntensity / allPoints.length
        : (maps.reduce((sum, m) => sum + (m.global_pain_level || 0), 0) / maps.length);

      // Calcular redução percentual
      const painReduction = firstAvg > 0
        ? Math.round(((firstAvg - lastAvg) / firstAvg) * 100)
        : 0;

      return {
        averagePainLevel: Math.round(averagePainLevel * 10) / 10,
        painReduction: Math.abs(painReduction),
        improvementTrend: trend as 'improving' | 'stable' | 'worsening',
        totalMaps: maps.length,
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